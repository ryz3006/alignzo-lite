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
// Add enhanced cached APIs for Phase 2 (client-safe version)
import { 
  getKanbanBoardWithCache,
  getKanbanColumnsWithCache,
  getUserProjectsWithCache,
  invalidateKanbanCache
} from '@/lib/kanban-api-enhanced-client';
import CacheStatus from '@/components/CacheStatus';
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
import TaskCard from '@/components/kanban/TaskCard';


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
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  

  
  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

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
      
      // Get user with role information
      const userWithRole = await getUserWithRole(currentUser.email!);
      if (userWithRole) {
        setUser(userWithRole);
      } else {
        setUser(currentUser);
      }
      
      // Get user's accessible projects with cache for Phase 2
      const projectsResponse = await getUserProjectsWithCache(currentUser.email!);
      if (projectsResponse && projectsResponse.length > 0) {
        setProjects(projectsResponse);
        setSelectedProject(projectsResponse[0] as ProjectWithCategories);
      }
      
      // Load user's teams
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
    
           // Cache check: only fetch if data is older than 30 seconds or forced refresh
       const now = Date.now();
       const cacheAge = now - lastFetchTime;
       const cacheValid = cacheAge < 30000; // 30 seconds cache
       
       if (!forceRefresh && cacheValid && boardLoaded) {
         return;
       }
    
           try {
         setLoading(true);
         setIsRefreshing(true);
         
         // Use enhanced cached API for Phase 2
         const response = await getKanbanBoardWithCache(selectedProject.id, selectedTeam);
         
         if (response && response.length > 0) {
           setKanbanBoard(response);
           setCategories([]); // Categories will be loaded separately if needed
           
           // Update selectedProject with the fetched data
           setSelectedProject({
             ...selectedProject,
             categories: [],
             columns: response
           });
           
           setBoardLoaded(true);
           setLastFetchTime(now);
         } else {
           // Handle error silently
         }
       } catch (error) {
         // Handle error silently
       } finally {
         setLoading(false);
         setIsRefreshing(false);
       }
  };

  const handleRefresh = () => {
    loadKanbanBoard(true); // Force refresh
  };

  // Optimistic update function
  const performOptimisticUpdate = (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex: number) => {
    const currentBoard = [...kanbanBoard];
    
    // Find the task in the source column
    const sourceColumn = currentBoard.find(col => col.id === sourceColumnId);
    const destinationColumn = currentBoard.find(col => col.id === destinationColumnId);
    
    if (!sourceColumn || !destinationColumn) return currentBoard;
    
    // Find and remove the task from source column
    const taskIndex = sourceColumn.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return currentBoard;
    
    const [movedTask] = sourceColumn.tasks.splice(taskIndex, 1);
    
    // Add the task to destination column at the new index
    if (sourceColumnId === destinationColumnId) {
      // Same column, just reorder
      destinationColumn.tasks.splice(newIndex, 0, movedTask);
    } else {
      // Different column, add to new column
      destinationColumn.tasks.splice(newIndex, 0, movedTask);
      // Update the task's column_id
      movedTask.column_id = destinationColumnId;
    }
    
    return currentBoard;
  };

  // Revert optimistic update
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

    // Calculate drag duration for UX feedback
    const dragDuration = Date.now() - dragStartTime;

    // SAFETY CHECK: Validate task still exists before moving
    const taskExists = kanbanBoard.some(column => 
      column.tasks.some(task => task.id === taskId)
    );
    
    if (!taskExists) {
      console.error('❌ Task not found during move operation:', taskId);
      setToast({ type: 'error', message: 'Task not found. Please refresh the board.' });
      return;
    }

    // Perform optimistic update immediately
    const optimisticBoardData = performOptimisticUpdate(taskId, sourceColumnId, destinationColumnId, newSortOrder);
    setOptimisticBoard(optimisticBoardData);
    setKanbanBoard(optimisticBoardData);

    try {
      console.log(`🔄 Moving task ${taskId} from ${sourceColumnId} to ${destinationColumnId}`);
      
      const response = await moveTaskWithRedis(taskId, destinationColumnId, newSortOrder, selectedProject.id, selectedTeam, user.email);
      
      if (response.success) {
        // Clear optimistic state since the server confirmed the move
        setOptimisticBoard([]);
        // Invalidate cache for Phase 2
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        // Show success toast
        setToast({ type: 'success', message: 'Task moved successfully!' });
        console.log(`✅ Task ${taskId} moved successfully`);
      } else {
        // Revert optimistic update on failure
        revertOptimisticUpdate();
        // Show error toast
        setToast({ type: 'error', message: `Failed to move task: ${response.error}` });
        console.error(`❌ Failed to move task ${taskId}:`, response.error);
        // Refresh board to get the correct state
        loadKanbanBoard(true);
      }
    } catch (error) {
      // Revert optimistic update on error
      revertOptimisticUpdate();
      // Show error toast
      setToast({ type: 'error', message: 'An error occurred while moving the task' });
      console.error(`❌ Error moving task ${taskId}:`, error);
      // Refresh board to get the correct state
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
        // Invalidate cache for Phase 2
        await invalidateKanbanCache(selectedProject.id, selectedTeam);
        loadKanbanBoard(true); // Force refresh to show new task
        setToast({ type: 'success', message: 'Task created successfully!' });
      } else {
        // Show error to user
        const errorMessage = response.error || 'Failed to create task';
        setToast({ type: 'error', message: errorMessage });
        console.error('Task creation failed:', response.error);
      }
    } catch (error) {
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      setToast({ type: 'error', message: errorMessage });
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: UpdateTaskForm) => {
    if (!user || !selectedProject || !selectedTeam) return;

         try {
       const response = await updateKanbanTaskWithRedis(taskId, updates, selectedProject.id, selectedTeam, user.email);
       
       if (response.success) {
         setShowEditTaskModal(false);
         setEditingTask(null);
         // Invalidate cache for Phase 2
         await invalidateKanbanCache(selectedProject.id, selectedTeam);
         loadKanbanBoard(true); // Force refresh to show updated task
       } else {
         // Handle error silently
       }
     } catch (error) {
       // Handle error silently
     }
  };

  

  // Column Management Handlers
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
         // Invalidate cache for Phase 2
         await invalidateKanbanCache(selectedProject.id, selectedTeam);
         loadKanbanBoard(true); // Force refresh to get updated column order
       } else {
         // Handle error silently
       }
     } catch (error) {
       // Handle error silently
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
         // Invalidate cache for Phase 2
         await invalidateKanbanCache(selectedProject.id, selectedTeam);
         loadKanbanBoard(true); // Force refresh to get updated column order
       } else {
         // Handle error silently
       }
     } catch (error) {
       // Handle error silently
     }
  };

     const confirmDeleteTask = async () => {
     if (!taskToDelete || !user || !selectedProject || !selectedTeam) return;
     
     try {
       const response = await deleteKanbanTaskWithRedis(taskToDelete, selectedProject.id, selectedTeam, user.email);
       
       if (response.success) {
         setShowDeleteConfirmModal(false);
         setTaskToDelete('');
         // Invalidate cache for Phase 2
         await invalidateKanbanCache(selectedProject.id, selectedTeam);
         loadKanbanBoard(true); // Force refresh to show task removed
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
         // Invalidate cache for Phase 2
         await invalidateKanbanCache(selectedProject.id, selectedTeam);
         loadKanbanBoard(true); // Force refresh to get updated column order
       } else {
         // Handle error silently
       }
     } catch (error) {
       // Handle error silently
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



  const filteredTasks = (tasks: KanbanTaskWithDetails[] | undefined) => {
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
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
       <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-20">
        <div className="px-6 py-4">
                      <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Kanban Board</h1>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    Visual workflow management for your team
                  </p>
                </div>
                
                {/* Cache Status for Phase 2 */}
                <div className="flex items-center space-x-4">
                  <CacheStatus />
                </div>
              </div>
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
                  onChange={async (e) => {
                    const teamId = e.target.value;
                    setSelectedTeam(teamId);
                    setBoardLoaded(false);
                    
                    // Update user role for the selected team
                    if (teamId) {
                      await updateUserRoleForTeam(teamId);
                    }
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
                <div className="px-6 pb-6 relative">
          {/* Global loading overlay */}
          {movingTaskId && (
            <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm z-40 flex items-center justify-center">
              <div className="flex items-center space-x-3 bg-white dark:bg-neutral-800 rounded-lg px-6 py-4 shadow-lg border border-neutral-200 dark:border-neutral-700">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">Moving task...</span>
              </div>
            </div>
          )}
          
          {viewMode === 'kanban' ? (
            <DragDropContext 
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
            >
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
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openCreateTaskModal(column.id)}
                                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                              <ColumnMenu
                                column={column}
                                taskCount={filteredTasks(column.tasks).length}
                                onEdit={handleEditColumn}
                                onDelete={handleDeleteColumn}
                                isOwner={user?.role === 'owner'}
                              />
                            </div>
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
                            className={`p-4 min-h-[300px] transition-all duration-200 ${
                              snapshot.isDraggingOver 
                                ? 'bg-blue-100/80 dark:bg-blue-900/20 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg' 
                                : ''
                            } ${
                              isDragging && !snapshot.isDraggingOver 
                                ? 'bg-neutral-50/50 dark:bg-neutral-800/20' 
                                : ''
                            }`}
                          >
                            {filteredTasks(column.tasks).map((task, index) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                index={index}
                                onClick={() => openTaskDetailModal(task)}
                                viewMode="kanban"
                                isMoving={movingTaskId === task.id}
                              />
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
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={0}
                          onClick={() => openTaskDetailModal(task)}
                          viewMode="list"
                          isMoving={false}
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

      {/* Edit Column Modal */}
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

      {/* Confirmation Modal */}
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

      
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
            : toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-current hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
