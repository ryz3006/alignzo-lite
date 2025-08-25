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
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([]);
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
        setSubcategories(response.data.subcategories);
        
        // Update selectedProject with the fetched data
        setSelectedProject({
          ...selectedProject,
          categories: response.data.categories,
          subcategories: response.data.subcategories,
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
      const response = await moveTask(taskId, newColumnId, newSortOrder);
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
        team_id: selectedTeam
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
      const response = await updateKanbanTask(taskId, updates);
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
    
    // Ensure categories and subcategories are loaded before opening modal
    if (selectedProject && (!categories.length || !subcategories.length)) {
      try {
        console.log('Loading categories for modal...', { projectId: selectedProject.id, teamId: selectedTeam });
        
        // Try to load categories directly using the debug endpoint first
        const debugResponse = await fetch(`/api/debug/categories?projectId=${selectedProject.id}`);
        const debugData = await debugResponse.json();
        
        if (debugData.success && debugData.data.projectCategories && debugData.data.projectCategories.length > 0) {
          console.log('Categories loaded from debug endpoint:', debugData.data.projectCategories);
          console.log('Subcategories loaded from debug endpoint:', debugData.data.projectSubcategories);
          setCategories(debugData.data.projectCategories);
          setSubcategories(debugData.data.projectSubcategories);
          
          // Update selectedProject with the fetched data
          setSelectedProject({
            ...selectedProject,
            categories: debugData.data.projectCategories,
            subcategories: debugData.data.projectSubcategories,
            columns: selectedProject.columns || []
          });
        } else {
          // Fallback to original method
          const response = await getKanbanBoardOptimized(selectedProject.id, selectedTeam);
          if (response.success) {
            console.log('Categories loaded from kanban API:', response.data.categories);
            console.log('Subcategories loaded from kanban API:', response.data.subcategories);
            setCategories(response.data.categories);
            setSubcategories(response.data.subcategories);
            
            // Update selectedProject with the fetched data
            setSelectedProject({
              ...selectedProject,
              categories: response.data.categories,
              subcategories: response.data.subcategories,
              columns: response.data.columns
            });
          }
        }
      } catch (error) {
        console.error('Error loading categories for modal:', error);
      }
    }
    
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="px-6 py-4">
                      <div className="mb-6">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Kanban Board</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Visual workflow management for your team
              </p>
            </div>

          {/* Project and Team Selector */}
          <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FolderOpen className="h-4 w-4 text-neutral-500" />
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Project:</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                    setSelectedProject(project ? { ...project, categories: [], subcategories: [], columns: [] } as ProjectWithCategories : null);
                    setCategories([]);
                    setSubcategories([]);
                    setBoardLoaded(false);
                  }}
                  className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.product} ({project.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-neutral-500" />
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Team:</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setBoardLoaded(false);
                  }}
                  className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
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
                disabled={!selectedProject || !selectedTeam || isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/debug/categories');
                    const data = await response.json();
                    console.log('Debug categories data:', data);
                    alert(`Categories: ${data.data.totalCategories}, Subcategories: ${data.data.totalSubcategories}`);
                  } catch (error) {
                    console.error('Error fetching debug data:', error);
                  }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Debug Categories
              </button>
            </div>
          </div>

          {/* Search and View Mode */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white w-64 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {boardLoaded && (
        <div className="p-6">
          {viewMode === 'kanban' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex space-x-6 overflow-x-auto pb-4">
                {kanbanBoard.map((column) => (
                  <div key={column.id} className="flex-shrink-0 w-80">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                      {/* Column Header */}
                      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: column.color }}
                            ></div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {column.name}
                            </h3>
                            <span className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm px-2 py-1 rounded-full">
                              {filteredTasks(column.tasks).length}
                            </span>
                          </div>
                          <button
                            onClick={() => openCreateTaskModal(column.id)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        {column.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
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
                            className={`p-2 min-h-[200px] ${
                              snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            {filteredTasks(column.tasks).map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 mb-3 cursor-pointer hover:shadow-md transition-all ${
                                      snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                    }`}
                                    onClick={() => openTaskDetailModal(task)}
                                  >
                                    {/* Task Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-medium text-neutral-900 dark:text-white text-sm line-clamp-2">
                                        {task.title}
                                      </h4>
                                      <div className="flex items-center space-x-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                          {getPriorityIcon(task.priority)}
                                          <span className="ml-1 capitalize">{task.priority}</span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Task Description */}
                                    {task.description && (
                                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    {/* Task Meta */}
                                    <div className="space-y-2">
                                      {/* Task Details */}
                                      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                        <div className="flex items-center space-x-3">
                                          {task.assigned_to && (
                                            <div className="flex items-center space-x-1">
                                              <User className="h-3 w-3" />
                                              <span>{task.assigned_to_user?.full_name || task.assigned_to}</span>
                                            </div>
                                          )}
                                          {task.due_date && (
                                            <div className="flex items-center space-x-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                            </div>
                                          )}
                                          {task.estimated_hours && (
                                            <div className="flex items-center space-x-1">
                                              <Clock className="h-3 w-3" />
                                              <span>{task.estimated_hours}h</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* JIRA Link */}
                                      {task.jira_ticket_key && (
                                        <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                                          <Link className="h-3 w-3" />
                                          <span>{task.jira_ticket_key}</span>
                                        </div>
                                      )}

                                      {/* Scope Badge */}
                                      <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                          >
                                            <Edit3 className="h-3 w-3" />
                                          </button>
                                          {(task.created_by === user?.email || user?.access_dashboard) && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task.id);
                                              }}
                                              className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                                            >
                                              <Trash2 className="h-3 w-3" />
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
                    className="w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
                  >
                    <Plus className="h-6 w-6 mr-2" />
                    Add New Column
                  </button>
                </div>
              </div>
            </DragDropContext>
          ) : (
            // List View
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-white">All Tasks</h3>
              </div>
              <div className="p-4">
                {kanbanBoard.flatMap(column => filteredTasks(column.tasks)).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-500 dark:text-neutral-400">No tasks found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kanbanBoard.flatMap(column => 
                      filteredTasks(column.tasks).map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: column.color }}
                              ></div>
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">{column.name}</span>
                            </div>
                            <h4 className="font-medium text-neutral-900 dark:text-white">{task.title}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.assigned_to && (
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {task.assigned_to_user?.full_name || task.assigned_to}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openTaskDetailModal(task)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              Select Project and Team
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
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
            subcategories: subcategories,
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
          projectData={null}
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
