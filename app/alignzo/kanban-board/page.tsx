'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  Filter, 
  Search, 
  Settings, 
  User, 
  Calendar, 
  Tag, 
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Edit3,
  Trash2,
  Link,
  Eye,
  MoreVertical
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { 
  getKanbanBoard, 
  getProjectWithCategories, 
  getUserAccessibleProjects,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  moveTask,
  createTaskComment,
  getTaskTimeline,
  searchJiraTickets
} from '@/lib/kanban-api';
import {
  KanbanColumnWithTasks,
  KanbanTaskWithDetails,
  CreateTaskForm,
  UpdateTaskForm,
  Project,
  ProjectWithCategories,
  TaskTimeline,
  TaskComment,
  JiraTicket
} from '@/lib/kanban-types';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import TaskDetailModal from '@/components/kanban/TaskDetailModal';
import CategoryManagementModal from '@/components/kanban/CategoryManagementModal';
import JiraTicketModal from '@/components/kanban/JiraTicketModal';

export default function KanbanBoardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kanbanBoard, setKanbanBoard] = useState<KanbanColumnWithTasks[]>([]);
  const [projectData, setProjectData] = useState<ProjectWithCategories | null>(null);
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  
  // Selected task for editing/viewing
  const [selectedTask, setSelectedTask] = useState<KanbanTaskWithDetails | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTaskWithDetails | null>(null);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category_id: '',
    subcategory_id: '',
    assigned_to: '',
    priority: '',
    scope: 'all' as 'all' | 'personal' | 'project'
  });

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
        setSelectedProject(projectsResponse.data[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing page:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      loadKanbanBoard();
      loadProjectData();
    }
  }, [selectedProject]);

  const loadKanbanBoard = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await getKanbanBoard(selectedProject.id);
      if (response.success) {
        setKanbanBoard(response.data);
      }
    } catch (error) {
      console.error('Error loading kanban board:', error);
    }
  };

  const loadProjectData = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await getProjectWithCategories(selectedProject.id);
      if (response.success) {
        setProjectData(response.data);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    }
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
        // Update local state
        setKanbanBoard(prevBoard => {
          const newBoard = [...prevBoard];
          
          // Find the task and remove it from its current column
          let taskToMove: KanbanTaskWithDetails | null = null;
          newBoard.forEach(column => {
            const taskIndex = column.tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
              taskToMove = column.tasks.splice(taskIndex, 1)[0];
            }
          });

          // Add the task to its new column
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
    if (!user || !selectedProject) return;

    try {
      const response = await createKanbanTask(taskData);
      if (response.success) {
        setShowCreateTaskModal(false);
        loadKanbanBoard(); // Refresh the board
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
        loadKanbanBoard(); // Refresh the board
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
        loadKanbanBoard(); // Refresh the board
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddComment = async (taskId: string, comment: string) => {
    if (!user) return;

    try {
      const response = await createTaskComment(taskId, user.email!, comment);
      if (response.success) {
        // Refresh task details if modal is open
        if (selectedTask) {
          const timelineResponse = await getTaskTimeline(taskId);
          if (timelineResponse.success) {
            setSelectedTask(prev => prev ? {
              ...prev,
              timeline: timelineResponse.data
            } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const openCreateTaskModal = () => {
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

  const openCategoryModal = () => {
    setShowCategoryModal(true);
  };

  const openJiraModal = () => {
    setShowJiraModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (loading) {
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Kanban Board</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
              Manage and track your tasks with a visual workflow
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={openCategoryModal}
              className="flex items-center px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Categories
            </button>
            
            <button
              onClick={openJiraModal}
              className="flex items-center px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Link className="h-4 w-4 mr-2" />
              JIRA Tickets
            </button>
            
            <button
              onClick={openCreateTaskModal}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </button>
          </div>
        </div>

        {/* Project Selector and Filters */}
        <div className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
              }}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.product} ({project.country})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white w-64"
              />
            </div>

            <button className="flex items-center px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {kanbanBoard.map((column) => (
            <div key={column.id} className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
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
                      {column.tasks.length}
                    </span>
                  </div>
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
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-3 mb-3 cursor-pointer hover:shadow-md transition-shadow ${
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
                              {/* Categories */}
                              <div className="flex items-center space-x-2">
                                {task.category && (
                                  <span 
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                    style={{ 
                                      backgroundColor: `${task.category.color}20`,
                                      color: task.category.color,
                                      border: `1px solid ${task.category.color}40`
                                    }}
                                  >
                                    {task.category.name}
                                  </span>
                                )}
                                {task.subcategory && (
                                  <span 
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                    style={{ 
                                      backgroundColor: `${task.subcategory.color}20`,
                                      color: task.subcategory.color,
                                      border: `1px solid ${task.subcategory.color}40`
                                    }}
                                  >
                                    {task.subcategory.name}
                                  </span>
                                )}
                              </div>

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
                                    ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
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
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      {showCreateTaskModal && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSubmit={handleCreateTask}
          projectData={projectData}
          userEmail={user?.email}
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
          projectData={projectData}
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
          onAddComment={handleAddComment}
          userEmail={user?.email}
        />
      )}

      {showCategoryModal && projectData && (
        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          projectData={projectData}
          onUpdate={loadProjectData}
        />
      )}

      {showJiraModal && (
        <JiraTicketModal
          isOpen={showJiraModal}
          onClose={() => setShowJiraModal(false)}
          onSelectTicket={(ticket) => {
            console.log('Selected JIRA ticket:', ticket);
            setShowJiraModal(false);
          }}
        />
      )}
    </div>
  );
}
