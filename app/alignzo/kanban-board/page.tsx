'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  Search, 
  Settings, 
  User, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Edit3,
  Trash2,
  Link,
  Eye,
  Users,
  FolderOpen,
  Grid3X3,
  List,
  RefreshCw
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { 
  getKanbanBoard, 
  getKanbanBoardOptimized,
  getUserAccessibleProjects,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  moveTask,
  createKanbanColumn
} from '@/lib/kanban-api';
import {
  KanbanColumnWithTasks,
  KanbanTaskWithDetails,
  CreateTaskForm,
  UpdateTaskForm,
  Project,
  ProjectWithCategories,
  CreateColumnForm,
  ProjectCategory,
  ProjectSubcategory
} from '@/lib/kanban-types';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import TaskDetailModal from '@/components/kanban/TaskDetailModal';
import CreateColumnModal from '@/components/kanban/CreateColumnModal';

export default function KanbanBoardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectWithCategories | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [kanbanBoard, setKanbanBoard] = useState<KanbanColumnWithTasks[]>([]);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);

  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false);
  
  // Selected task for editing/viewing
  const [selectedTask, setSelectedTask] = useState<KanbanTaskWithDetails | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTaskWithDetails | null>(null);
  const [selectedColumnForTask, setSelectedColumnForTask] = useState<string>('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      
      setUser(currentUser);
      
      // Get user's accessible projects
      const projectsResponse = await getUserAccessibleProjects(currentUser.email!);
      if (projectsResponse.success && projectsResponse.data.length > 0) {
        setProjects(projectsResponse.data);
        setSelectedProject(projectsResponse.data[0] as ProjectWithCategories);
      }
      
      // Load user's teams
      await loadUserTeams(currentUser.email!);
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing page:', error);
      setLoading(false);
    }
  };

  const loadUserTeams = async (userEmail: string) => {
    try {
      const response = await fetch(`/api/teams/user-teams?email=${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
    }
  };

  useEffect(() => {
    if (selectedProject && selectedTeam) {
      loadKanbanBoard();
    }
  }, [selectedProject, selectedTeam]);

  const loadKanbanBoard = async (forceRefresh = false) => {
    if (!selectedProject || !selectedTeam) return;
    
    // Cache check: only fetch if data is older than 30 seconds or forced refresh
    const now = Date.now();
    const cacheAge = now - lastFetchTime;
    const cacheValid = cacheAge < 30000; // 30 seconds cache
    
    if (!forceRefresh && cacheValid && boardLoaded) {
      console.log('Using cached data, last fetch was', Math.round(cacheAge / 1000), 'seconds ago');
      return;
    }
    
    try {
      setLoading(true);
      setIsRefreshing(true);
      
      console.log('Fetching fresh kanban board data...');
      const response = await getKanbanBoardOptimized(selectedProject.id, selectedTeam);
      if (response.success) {
        setKanbanBoard(response.data.columns);
        setCategories(response.data.categories);
        
        // Update selectedProject with the fetched data
        setSelectedProject({
          ...selectedProject,
          categories: response.data.categories,
          columns: response.data.columns
        });
        
        setBoardLoaded(true);
        setLastFetchTime(now);
        console.log('Kanban board data updated successfully');
      }
    } catch (error) {
      console.error('Error loading kanban board:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadKanbanBoard(true); // Force refresh
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;

    const { draggableId, destination } = result;
    const taskId = draggableId;
    const newColumnId = destination.droppableId;
    const newSortOrder = destination.index;

    try {
      const response = await moveTask(taskId, newColumnId, newSortOrder, user.email);
      if (response.success) {
        setKanbanBoard(prevBoard => {
          const newBoard = [...prevBoard];
          let taskToMove: KanbanTaskWithDetails | null = null;
          
          newBoard.forEach(column => {
            const taskIndex = column.tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
              taskToMove = column.tasks.splice(taskIndex, 1)[0];
            }
          });

          if (taskToMove) {
            const targetColumn = newBoard.find(col => col.id === newColumnId);
            if (targetColumn) {
              targetColumn.tasks.splice(newSortOrder, 0, taskToMove);
            }
          }

          return newBoard;
        });
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskForm) => {
    if (!user || !selectedProject || !selectedTeam) return;

    try {
      const response = await createKanbanTask({
        ...taskData,
        project_id: selectedProject.id,
        created_by: user.email
      });
      if (response.success) {
        setShowCreateTaskModal(false);
        loadKanbanBoard();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: UpdateTaskForm) => {
    if (!user) return;

    try {
      const response = await updateKanbanTask(taskId, updates, user.email);
      if (response.success) {
        setShowEditTaskModal(false);
        setEditingTask(null);
        loadKanbanBoard();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const response = await deleteKanbanTask(taskId);
      if (response.success) {
        loadKanbanBoard();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCreateColumn = async (columnData: CreateColumnForm) => {
    if (!selectedProject || !selectedTeam) return;

    try {
      const response = await createKanbanColumn({
        ...columnData,
        project_id: selectedProject.id,
        team_id: selectedTeam
      });
      if (response.success) {
        setShowCreateColumnModal(false);
        loadKanbanBoard();
      }
    } catch (error) {
      console.error('Error creating column:', error);
    }
  };

  const openCreateTaskModal = async (columnId?: string) => {
    if (columnId) {
      setSelectedColumnForTask(columnId);
    }
    
    // Show modal immediately - it will handle its own loading state
    setShowCreateTaskModal(true);
  };
  const openEditTaskModal = (task: KanbanTaskWithDetails) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };
  const openTaskDetailModal = (task: KanbanTaskWithDetails) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  };
  const openCreateColumnModal = () => setShowCreateColumnModal(true);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-3 w-3" />;
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const filteredTasks = (tasks: KanbanTaskWithDetails[]) => {
    return tasks.filter(task => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  if (loading && !boardLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading Kanban Board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
        <div className="px-6 py-4">
                      <div className="mb-6">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Kanban Board</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Visual workflow management for your team
              </p>
            </div>

          {/* Project and Team Selector */}
          <div className="bg-neutral-50/80 dark:bg-neutral-700/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50 dark:border-neutral-600/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5 text-neutral-500" />
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Project:</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                            setSelectedProject(project ? { ...project, categories: [], columns: [] } as ProjectWithCategories : null);
        setCategories([]);
                    setBoardLoaded(false);
                  }}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.product} ({project.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-neutral-500" />
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Team:</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setBoardLoaded(false);
                  }}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

                             <button
                 onClick={handleRefresh}
                 disabled={isRefreshing}
                 className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg transition-all duration-200"
               >
                 <RefreshCw className="h-5 w-5" />
               </button>
            </div>
          </div>

          {/* Search and View Mode */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white w-72 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'kanban' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                }`}
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {boardLoaded && (
        <div className="px-6 pb-6">
          {viewMode === 'kanban' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex space-x-4 lg:space-x-6 overflow-x-auto pb-4 px-2 lg:px-0">
                {kanbanBoard.map((column) => (
                  <div key={column.id} className="flex-shrink-0 w-72 lg:w-80">
                    <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
                      {/* Column Header */}
                      <div className="p-6 border-b border-neutral-200/50 dark:border-neutral-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full shadow-sm"
                              style={{ backgroundColor: column.color }}
                            ></div>
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                              {column.name}
                            </h3>
                            <span className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm px-3 py-1 rounded-full font-medium">
                              {filteredTasks(column.tasks).length}
                            </span>
                          </div>
                          <button
                            onClick={() => openCreateTaskModal(column.id)}
                            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                        {column.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
                            {column.description}
                          </p>
                        )}
                      </div>

                      {/* Column Tasks */}
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-4 min-h-[300px] ${
                              snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            {filteredTasks(column.tasks).map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl p-4 mb-3 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${
                                      snapshot.isDragging ? 'shadow-2xl rotate-1 scale-105' : ''
                                    }`}
                                    onClick={() => openTaskDetailModal(task)}
                                  >
                                    {/* Task Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <h4 className="font-semibold text-neutral-900 dark:text-white text-sm leading-tight line-clamp-2 flex-1 mr-3">
                                        {task.title}
                                      </h4>
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                          {getPriorityIcon(task.priority)}
                                          <span className="ml-1 capitalize">{task.priority}</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Task Description */}
                                    {task.description && (
                                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Meta */}
                                    <div className="space-y-3">
                                      {/* Task Details */}
                                      <div className="flex flex-col space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
                                        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                                          {task.assigned_to && (
                                            <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded-lg">
                                              <User className="h-3 w-3" />
                                              <span className="truncate max-w-16 lg:max-w-20 text-xs">{task.assigned_to_user?.full_name || task.assigned_to}</span>
                                            </div>
                                          )}
                                          {task.due_date && (
                                            <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded-lg">
                                              <Calendar className="h-3 w-3" />
                                              <span className="text-xs">{new Date(task.due_date).toLocaleDateString()}</span>
                                            </div>
                                          )}
                                          {task.estimated_hours && (
                                            <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded-lg">
                                              <Clock className="h-3 w-3" />
                                              <span className="text-xs">{task.estimated_hours}h</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* JIRA Link */}
                                      {task.jira_ticket_key && (
                                        <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                          <Link className="h-3 w-3" />
                                          <span className="truncate">{task.jira_ticket_key}</span>
                                        </div>
                                      )}

                                      {/* Scope Badge and Actions */}
                                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-600">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                          task.scope === 'personal' 
                                            ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' 
                                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                        }`}>
                                          {task.scope === 'personal' ? 'Personal' : 'Project'}
                                        </span>

                                        {/* Action Buttons */}
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditTaskModal(task);
                                            }}
                                            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded transition-colors"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </button>
                                          {(task.created_by === user?.email || user?.access_dashboard) && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task.id);
                                              }}
                                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                ))}
                
                {/* Add New Column Button */}
                <div className="flex-shrink-0 w-80">
                  <button
                    onClick={openCreateColumnModal}
                    className="w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all duration-200 backdrop-blur-sm"
                  >
                    <Plus className="h-8 w-8 mr-3" />
                    <span className="font-medium">Add New Column</span>
                  </button>
                </div>
              </div>
            </DragDropContext>
          ) : (
            // List View
            <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50">
              <div className="p-6 border-b border-neutral-200/50 dark:border-neutral-700/50">
                <h3 className="font-bold text-xl text-neutral-900 dark:text-white">All Tasks</h3>
              </div>
              <div className="p-6">
                {kanbanBoard.flatMap(column => filteredTasks(column.tasks)).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-500 dark:text-neutral-400">No tasks found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kanbanBoard.flatMap(column => 
                      filteredTasks(column.tasks).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-4 border border-neutral-200/50 dark:border-neutral-600/50 rounded-xl hover:bg-neutral-50/50 dark:hover:bg-neutral-700/50 transition-all duration-200">
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: column.color }}
                              ></div>
                              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-3 py-1 rounded-full">{column.name}</span>
                            </div>
                            <h4 className="font-semibold text-neutral-900 dark:text-white flex-1">{task.title}</h4>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.assigned_to && (
                              <span className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-3 py-1 rounded-full">
                                {task.assigned_to_user?.full_name || task.assigned_to}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openTaskDetailModal(task)}
                              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg transition-all duration-200"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg transition-all duration-200"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!boardLoaded && !loading && (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Grid3X3 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
              Select Project and Team
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              Choose a project and team to load the Kanban board
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateTaskModal && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setSelectedColumnForTask('');
          }}
          onSubmit={handleCreateTask}
          projectData={selectedProject ? {
            ...selectedProject,
            categories: categories,
            columns: kanbanBoard
          } : null}
          userEmail={user?.email}
          selectedTeam={selectedTeam}
          columnId={selectedColumnForTask}
        />
      )}

      {showEditTaskModal && editingTask && (
        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={() => {
            setShowEditTaskModal(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateTask}
          task={editingTask}
          projectData={selectedProject ? {
            ...selectedProject,
            categories: categories,
            columns: kanbanBoard
          } : null}
          userEmail={user?.email}
        />
      )}

      {showTaskDetailModal && selectedTask && (
        <TaskDetailModal
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onAddComment={() => {}}
          userEmail={user?.email}
        />
      )}

      {showCreateColumnModal && (
        <CreateColumnModal
          isOpen={showCreateColumnModal}
          onClose={() => setShowCreateColumnModal(false)}
          onSubmit={handleCreateColumn}
          projectId={selectedProject?.id}
        />
      )}
    </div>
  );
}
