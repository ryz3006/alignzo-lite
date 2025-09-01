'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  FolderOpen,
  Grid3X3,
  List,
  RefreshCw,
  Archive,
  Settings,
  MoreHorizontal,
  Zap,
  Eye,
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Sparkles
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getUserWithRole } from '@/lib/user-role';
import { 
  getKanbanBoard, 
  getKanbanBoardOptimized,
  getUserAccessibleProjects,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  moveTask,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  permanentlyDeleteTask
} from '@/lib/kanban-api';
import { 
  getKanbanBoardWithRedis,
  createKanbanTaskWithRedis,
  updateKanbanTaskWithRedis,
  deleteKanbanTaskWithRedis,
  moveTaskWithRedis,
  createKanbanColumnWithRedis,
  updateKanbanColumnWithRedis,
  deleteKanbanColumnWithRedis,
  getProjectCategoriesWithRedis
} from '@/lib/kanban-client-api';
import { 
  getKanbanBoardWithCache,
  getKanbanColumnsWithCache,
  getUserProjectsWithCache,
  invalidateKanbanCache
} from '@/lib/kanban-api-enhanced-client';

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
import ColumnMenu from '@/components/kanban/ColumnMenu';
import EditColumnModal from '@/components/kanban/EditColumnModal';
import ConfirmationModal from '@/components/kanban/ConfirmationModal';

// Modern redesigned components
import ModernTaskCard from '@/components/kanban/ModernTaskCard';
import ModernKanbanColumn from '@/components/kanban/ModernKanbanColumn';
import { SimpleToast, PageTransition } from '@/components/kanban/SimpleAnimations';

export default function KanbanBoardPageRedesigned() {
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
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<KanbanColumnWithTasks[]>([]);
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false);
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
  // Column management
  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [columnToDelete, setColumnToDelete] = useState<string>('');
  const [taskToDelete, setTaskToDelete] = useState<string>('');
  
  // Selected task for editing/viewing
  const [selectedTask, setSelectedTask] = useState<KanbanTaskWithDetails | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTaskWithDetails | null>(null);
  const [selectedColumnForTask, setSelectedColumnForTask] = useState<string>('');
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Board statistics
  const boardStats = useMemo(() => {
    if (!kanbanBoard.length) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    
    const allTasks = kanbanBoard.flatMap(column => column.tasks || []);
    const total = allTasks.length;
    const completed = allTasks.filter(task => task.status === 'completed').length;
    const inProgress = allTasks.filter(task => task.status === 'active').length;
    const now = new Date();
    const overdue = allTasks.filter(task => 
      task.due_date && new Date(task.due_date) < now && task.status !== 'completed'
    ).length;
    
    return { total, completed, inProgress, overdue };
  }, [kanbanBoard]);

  useEffect(() => {
    initializePage();
  }, []);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const initializePage = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      
      const userWithRole = await getUserWithRole(currentUser.email!);
      if (userWithRole) {
        setUser(userWithRole);
      } else {
        setUser(currentUser);
      }
      
      const projectsResponse = await getUserProjectsWithCache(currentUser.email!);
      if (projectsResponse && projectsResponse.length > 0) {
        setProjects(projectsResponse);
        setSelectedProject(projectsResponse[0] as ProjectWithCategories);
      }
      
      await loadUserTeams(currentUser.email!);
      setLoading(false);
    } catch (error) {
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
      // Handle error silently
    }
  };

  const updateUserRoleForTeam = async (teamId: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;
      
      const userWithRole = await getUserWithRole(currentUser.email, teamId);
      if (userWithRole) {
        setUser(userWithRole);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  useEffect(() => {
    if (selectedProject && selectedTeam) {
      loadKanbanBoard();
    }
  }, [selectedProject, selectedTeam]);

  const loadKanbanBoard = async (forceRefresh = false) => {
    if (!selectedProject || !selectedTeam) return;
    
    const now = Date.now();
    const cacheAge = now - lastFetchTime;
    const cacheValid = cacheAge < 30000;
    
    if (!forceRefresh && cacheValid && boardLoaded) {
      return;
    }
    
    try {
      setLoading(true);
      setIsRefreshing(true);
      
      const response = await getKanbanBoardWithCache(selectedProject.id, selectedTeam);
      
      if (response && response.length > 0) {
        setKanbanBoard(response);
        setCategories([]);
        
        setSelectedProject({
          ...selectedProject,
          categories: [],
          columns: response
        });
        
        setBoardLoaded(true);
        setLastFetchTime(now);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadKanbanBoard(true);
  };

  // Optimistic update function
  const performOptimisticUpdate = (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex: number) => {
    const currentBoard = [...kanbanBoard];
    
    const sourceColumn = currentBoard.find(col => col.id === sourceColumnId);
    const destinationColumn = currentBoard.find(col => col.id === destinationColumnId);
    
    if (!sourceColumn || !destinationColumn) return currentBoard;
    
    const taskIndex = sourceColumn.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return currentBoard;
    
    const [movedTask] = sourceColumn.tasks.splice(taskIndex, 1);
    
    if (sourceColumnId === destinationColumnId) {
      destinationColumn.tasks.splice(newIndex, 0, movedTask);
    } else {
      destinationColumn.tasks.splice(newIndex, 0, movedTask);
      movedTask.column_id = destinationColumnId;
    }
    
    return currentBoard;
  };

  const revertOptimisticUpdate = () => {
    setOptimisticBoard([]);
    setMovingTaskId(null);
  };

  const handleDragStart = (result: any) => {
    setIsDragging(true);
    setDragStartTime(Date.now());
    setMovingTaskId(result.draggableId);
  };

  const handleDragUpdate = (result: any) => {
    // Handle drag update silently
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    setMovingTaskId(null);
    
    if (!result.destination || !user || !selectedProject || !selectedTeam) {
      return;
    }

    const { draggableId, source, destination } = result;
    const taskId = draggableId;
    const sourceColumnId = source.droppableId;
    const destinationColumnId = destination.droppableId;
    const newSortOrder = destination.index;

    const taskExists = kanbanBoard.some(column => 
      column.tasks.some(task => task.id === taskId)
    );
    
    if (!taskExists) {
      setToast({ type: 'error', message: 'Task not found. Please refresh the board.' });
      return;
    }

    const optimisticBoardData = performOptimisticUpdate(taskId, sourceColumnId, destinationColumnId, newSortOrder);
    setOptimisticBoard(optimisticBoardData);
    setKanbanBoard(optimisticBoardData);

    try {
      const response = await moveTaskWithRedis(taskId, destinationColumnId, newSortOrder, selectedProject.id, selectedTeam, user.email);
      
      if (response.success) {
        setOptimisticBoard([]);
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        setToast({ type: 'success', message: 'Task moved successfully!' });
      } else {
        revertOptimisticUpdate();
        setToast({ type: 'error', message: `Failed to move task: ${response.error}` });
        loadKanbanBoard(true);
      }
    } catch (error) {
      revertOptimisticUpdate();
      setToast({ type: 'error', message: 'An error occurred while moving the task' });
      loadKanbanBoard(true);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskForm) => {
    if (!user || !selectedProject || !selectedTeam) return;

    try {
      const response = await createKanbanTaskWithRedis({
        ...taskData,
        project_id: selectedProject.id,
        created_by: user.email
      }, selectedProject.id, selectedTeam, user.email);
      
      if (response.success) {
        setShowCreateTaskModal(false);
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Task created successfully!' });
      } else {
        const errorMessage = response.error || 'Failed to create task';
        setToast({ type: 'error', message: errorMessage });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      setToast({ type: 'error', message: errorMessage });
    }
  };

  const handleUpdateTask = async (taskId: string, updates: UpdateTaskForm) => {
    if (!user || !selectedProject || !selectedTeam) return;

    try {
      const response = await updateKanbanTaskWithRedis(taskId, updates, selectedProject.id, selectedTeam, user.email);
      
      if (response.success) {
        setShowEditTaskModal(false);
        setEditingTask(null);
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Task updated successfully!' });
      } else {
        setToast({ type: 'error', message: 'Failed to update task' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'An error occurred while updating the task' });
    }
  };

  const handleEditColumn = (column: any) => {
    setEditingColumn(column);
    setShowEditColumnModal(true);
  };

  const handleUpdateColumn = async (columnId: string, updates: { name: string; description?: string; color: string; sort_order?: number }) => {
    if (!selectedProject || !selectedTeam) return;
    
    try {
      const response = await updateKanbanColumnWithRedis(columnId, updates, selectedProject.id, selectedTeam);
      
      if (response.success) {
        setShowEditColumnModal(false);
        setEditingColumn(null);
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Column updated successfully!' });
      } else {
        setToast({ type: 'error', message: 'Failed to update column' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'An error occurred while updating the column' });
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumnToDelete(columnId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete || !selectedProject || !selectedTeam) return;
    
    try {
      const response = await deleteKanbanColumnWithRedis(columnToDelete, selectedProject.id, selectedTeam);
      
      if (response.success) {
        setShowDeleteConfirmModal(false);
        setColumnToDelete('');
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Column deleted successfully!' });
      } else {
        setToast({ type: 'error', message: 'Failed to delete column' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'An error occurred while deleting the column' });
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !user || !selectedProject || !selectedTeam) return;
    
    try {
      const response = await deleteKanbanTaskWithRedis(taskToDelete, selectedProject.id, selectedTeam, user.email);
      
      if (response.success) {
        setShowDeleteConfirmModal(false);
        setTaskToDelete('');
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Task deleted successfully!' });
      } else {
        setToast({ type: 'error', message: `Failed to delete task: ${response.error}` });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'An error occurred while deleting the task' });
    }
  };

  const handleCreateColumn = async (columnData: CreateColumnForm) => {
    if (!selectedProject || !selectedTeam) return;

    try {
      const response = await createKanbanColumnWithRedis(columnData, selectedProject.id, selectedTeam);
      
      if (response.success) {
        setShowCreateColumnModal(false);
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true);
        setToast({ type: 'success', message: 'Column created successfully!' });
      } else {
        setToast({ type: 'error', message: 'Failed to create column' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'An error occurred while creating the column' });
    }
  };

  const openCreateTaskModal = async (columnId?: string) => {
    if (columnId) {
      setSelectedColumnForTask(columnId);
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

  const filteredTasks = (tasks: KanbanTaskWithDetails[] | undefined) => {
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    return tasks.filter(task => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterPriority && task.priority !== filterPriority) {
        return false;
      }
      if (filterAssignee && task.assigned_to !== filterAssignee) {
        return false;
      }
      return true;
    });
  };

  if (loading && !boardLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        <div className="text-center p-8 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin">
              <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-800"></div>
            </div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Loading Kanban Board</h3>
          <p className="text-slate-600 dark:text-slate-400">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Modern Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-500/20 dark:to-purple-500/20"></div>
        <div className="relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-white/20 dark:border-slate-700/50">
          <div className="px-6 py-8">
            {/* Hero Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Grid3X3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                      Kanban Board
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-lg">
                      Visual workflow management reimagined
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="hidden lg:flex items-center space-x-6">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{boardStats.total}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Tasks</div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{boardStats.completed}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Completed</div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{boardStats.inProgress}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">In Progress</div>
                    </div>
                    {boardStats.overdue > 0 && (
                      <>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{boardStats.overdue}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Overdue</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Project and Team Selector */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-2xl p-6 border border-white/30 dark:border-slate-700/50 shadow-xl mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
                    Project
                  </label>
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = projects.find(p => p.id === e.target.value);
                      setSelectedProject(project ? { ...project, categories: [], columns: [] } as ProjectWithCategories : null);
                      setCategories([]);
                      setBoardLoaded(false);
                    }}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.product} ({project.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Users className="h-4 w-4 mr-2 text-purple-500" />
                    Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={async (e) => {
                      const teamId = e.target.value;
                      setSelectedTeam(teamId);
                      setBoardLoaded(false);
                      
                      if (teamId) {
                        await updateUserRoleForTeam(teamId);
                      }
                    }}
                    className="w-full px-4 py-3 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all shadow-sm"
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Zap className="h-4 w-4 mr-2 text-amber-500" />
                    Actions
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={openCreateColumnModal}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tasks, descriptions, or JIRA keys..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-3 w-80 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm"
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    showFilters 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                      : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                  } backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    viewMode === 'kanban' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                  } backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                  } backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60`}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-slate-700/50 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assignee</label>
                    <select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      className="w-full px-3 py-2 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    >
                      <option value="">All Assignees</option>
                      {Array.from(new Set(kanbanBoard.flatMap(col => col.tasks?.map(task => task.assigned_to).filter(assignee => assignee && assignee.trim() !== '') || []))).map(assignee => (
                        <option key={assignee} value={assignee}>{assignee}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setFilterPriority('');
                        setFilterAssignee('');
                      }}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="relative px-6 py-8">
        {boardLoaded && (
          <div className="relative">
            {/* Global loading overlay */}
            {movingTaskId && (
              <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
                <div className="flex items-center space-x-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl px-8 py-6 shadow-2xl border border-white/50 dark:border-slate-700/50">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin">
                      <div className="absolute inset-1 rounded-full bg-white dark:bg-slate-800"></div>
                    </div>
                    <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">Moving task</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Updating board state...</div>
                  </div>
                </div>
              </div>
            )}
            
            {viewMode === 'kanban' ? (
              <DragDropContext 
                onDragStart={handleDragStart}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
              >
                <div className="flex space-x-6 overflow-x-auto pb-6">
                  {kanbanBoard.map((column) => (
                    <ModernKanbanColumn
                      key={column.id}
                      column={column}
                      onTaskClick={openTaskDetailModal}
                      onAddTask={openCreateTaskModal}
                      onColumnMenu={(column, event) => {
                        event.stopPropagation();
                        handleEditColumn(column);
                      }}
                      searchQuery={searchQuery}
                      viewMode={viewMode}
                      movingTaskId={movingTaskId}
                    />
                  ))}
                  
                  {/* Add New Column Button */}
                  <div className="flex-shrink-0 w-80">
                    <button
                      onClick={openCreateColumnModal}
                      className="w-full h-full min-h-[600px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all duration-300 backdrop-blur-sm group"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                        <Plus className="h-8 w-8" />
                      </div>
                      <span className="font-semibold text-lg">Add New Column</span>
                      <span className="text-sm opacity-70 mt-1">Organize your workflow</span>
                    </button>
                  </div>
                </div>
              </DragDropContext>
            ) : (
              // List View
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/50">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center">
                    <List className="h-6 w-6 mr-3 text-blue-500" />
                    All Tasks
                  </h3>
                </div>
                <div className="p-6">
                  {kanbanBoard.flatMap(column => filteredTasks(column.tasks)).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Sparkles className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No tasks found</h3>
                      <p className="text-slate-500 dark:text-slate-400">Create your first task to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kanbanBoard.flatMap(column => 
                        filteredTasks(column.tasks).map(task => (
                          <ModernTaskCard
                            key={task.id}
                            task={task}
                            index={0}
                            onClick={() => openTaskDetailModal(task)}
                            viewMode="list"
                            isMoving={false}
                            onEdit={openEditTaskModal}
                            onDelete={(taskId) => {
                              setTaskToDelete(taskId);
                              setShowDeleteConfirmModal(true);
                            }}
                            canEdit={true}
                            canDelete={user?.email === task.created_by}
                          />
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
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center p-12 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-slate-700/50">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                <Grid3X3 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Select Project and Team
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
                Choose a project and team to load your Kanban board and start managing your workflow
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals - Keep existing modals for now */}
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
          } : {
            id: '',
            name: '',
            product: '',
            country: '',
            created_at: '',
            updated_at: '',
            categories: [],
            columns: []
          }}
          userEmail={user?.email || ''}
          teamId={selectedTeam}
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
          projectData={selectedProject}
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

      {showEditColumnModal && (
        <EditColumnModal
          isOpen={showEditColumnModal}
          onClose={() => {
            setShowEditColumnModal(false);
            setEditingColumn(null);
          }}
          onSubmit={handleUpdateColumn}
          column={editingColumn}
          allColumns={kanbanBoard}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setColumnToDelete('');
          setTaskToDelete('');
        }}
        onConfirm={columnToDelete ? confirmDeleteColumn : confirmDeleteTask}
        title={columnToDelete ? "Delete Column" : "Delete Task"}
        message={
          columnToDelete 
            ? "Are you sure you want to delete this column? This action cannot be undone."
            : "Are you sure you want to delete this task? This action cannot be undone."
        }
        confirmText="Delete"
        type="danger"
      />

      {/* Modern Toast Notification */}
      <SimpleToast
        message={toast?.message || ''}
        type={toast?.type || 'info'}
        isVisible={!!toast}
        onClose={() => setToast(null)}
      />
      </div>
    </PageTransition>
  );
}
