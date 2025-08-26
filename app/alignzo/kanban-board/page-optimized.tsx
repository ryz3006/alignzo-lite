'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { 
  Plus, 
  Search, 
  Settings, 
  Users,
  FolderOpen,
  Grid3X3,
  List,
  RefreshCw,
  Archive
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getUserWithRole } from '@/lib/user-role';
import { getUserAccessibleProjectsOptimized } from '@/lib/kanban-api-optimized';
import { useKanbanBoard, useKanbanCache } from '@/hooks/useKanbanBoard';
import { performanceMonitor } from '@/lib/performance-monitor';
import {
  Project,
  ProjectWithCategories,
  CreateTaskForm,
  UpdateTaskForm,
  ProjectCategory
} from '@/lib/kanban-types';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import CreateTaskModal from '@/components/kanban/CreateTaskModal';
import EditTaskModal from '@/components/kanban/EditTaskModal';
import TaskDetailModal from '@/components/kanban/TaskDetailModal';
import CreateColumnModal from '@/components/kanban/CreateColumnModal';
import ColumnMenu from '@/components/kanban/ColumnMenu';
import EditColumnModal from '@/components/kanban/EditColumnModal';
import ConfirmationModal from '@/components/kanban/ConfirmationModal';
import ArchivedTasksModal from '@/components/kanban/ArchivedTasksModal';

export default function KanbanBoardPageOptimized() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectWithCategories | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  
  // Modal states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false);
  const [showEditColumnModal, setShowEditColumnModal] = useState(false);
  const [showArchivedTasksModal, setShowArchivedTasksModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  
  // Column management
  const [editingColumn, setEditingColumn] = useState<any>(null);
  const [columnToDelete, setColumnToDelete] = useState<string>('');
  const [taskToDelete, setTaskToDelete] = useState<string>('');
  
  // Selected task for editing/viewing
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedColumnForTask, setSelectedColumnForTask] = useState<string>('');
  
  // Search and view
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Task movement loading state
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  // Performance monitoring
  const performanceTimer = useMemo(() => 
    performanceMonitor.startTimer('kanban-board-page-load'), 
    []
  );

  // Optimized hooks
  const {
    data: boardData,
    isLoading: boardLoading,
    error: boardError,
    refetch: refetchBoard,
    moveTask,
    createTask,
    updateTask,
    deleteTask,
    createColumn,
    updateColumn,
    deleteColumn,
    isMoving,
    isCreating,
    isUpdating,
    isDeleting,
    isCreatingColumn,
    isUpdatingColumn,
    isDeletingColumn
  } = useKanbanBoard(selectedProject?.id || '', selectedTeam);

  const { invalidateRelatedQueries, prefetchRelatedData } = useKanbanCache();

  // Memoized board data
  const kanbanBoard = useMemo(() => (boardData as any)?.columns || [], [boardData]);
  const categories = useMemo(() => (boardData as any)?.categories || [], [boardData]);

  // Initialize page
  useEffect(() => {
    initializePage();
  }, []);

  // Performance monitoring cleanup
  useEffect(() => {
    return () => {
      performanceTimer();
    };
  }, [performanceTimer]);

  // Clear moving task ID when movement is complete
  useEffect(() => {
    if (!isMoving && movingTaskId) {
      setMovingTaskId(null);
    }
  }, [isMoving, movingTaskId]);

  const initializePage = async () => {
    try {
      const stopTimer = performanceMonitor.startTimer('page-initialization');
      
      // Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser?.email) {
        // Get user projects
        const projectsResponse = await getUserAccessibleProjectsOptimized(currentUser.email);
        if (projectsResponse.success && projectsResponse.data) {
          setProjects(projectsResponse.data);
        }

        // Get user teams
        await updateUserRoleForTeam('');
      }

      setLoading(false);
      stopTimer();
    } catch (error) {
      console.error('Error initializing page:', error);
      setLoading(false);
    }
  };

  const updateUserRoleForTeam = async (teamId: string) => {
    try {
      const userWithRole = await getUserWithRole(user?.email || '', teamId);
      // Note: UserWithRole doesn't contain teams, this would need to be fetched separately
      // For now, we'll skip setting teams from this function
    } catch (error) {
      console.error('Error updating user role for team:', error);
    }
  };

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const taskId = draggableId;
    const columnId = destination.droppableId;
    const sortOrder = destination.index;

    // Set moving task ID for loading overlay
    setMovingTaskId(taskId);

    // Optimistic update handled by the hook
    moveTask({ taskId, columnId, sortOrder });
  }, [moveTask]);

  // Handle task creation
  const handleCreateTask = useCallback((taskData: CreateTaskForm) => {
    createTask(taskData);
    setShowCreateTaskModal(false);
  }, [createTask]);

  // Handle task update
  const handleUpdateTask = useCallback((taskId: string, updates: Partial<any>) => {
    updateTask({ taskId, updates });
    setShowEditTaskModal(false);
    setEditingTask(null);
  }, [updateTask]);

  // Handle task deletion
  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    setShowDeleteConfirmModal(false);
    setTaskToDelete('');
  }, [deleteTask]);

  // Handle column creation
  const handleCreateColumn = useCallback((columnData: any) => {
    if (selectedProject) {
      createColumn({
        ...columnData,
        project_id: selectedProject.id,
        team_id: selectedTeam || undefined
      });
    }
    setShowCreateColumnModal(false);
  }, [createColumn, selectedProject, selectedTeam]);

  // Handle column update
  const handleUpdateColumn = useCallback((columnId: string, updates: any) => {
    updateColumn({ columnId, updates });
    setShowEditColumnModal(false);
    setEditingColumn(null);
  }, [updateColumn]);

  // Handle column deletion
  const handleDeleteColumn = useCallback((columnId: string) => {
    deleteColumn(columnId);
    setShowDeleteConfirmModal(false);
    setColumnToDelete('');
  }, [deleteColumn]);

  // Handle task click
  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setShowTaskDetailModal(true);
  }, []);

  // Handle add task to column
  const handleAddTaskToColumn = useCallback((columnId: string) => {
    setSelectedColumnForTask(columnId);
    setShowCreateTaskModal(true);
  }, []);

  // Handle column menu
  const handleColumnMenu = useCallback((column: any, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingColumn(column);
    setShowEditColumnModal(true);
  }, []);

  // Memoized filtered board
  const filteredBoard = useMemo(() => {
    if (!searchQuery) return kanbanBoard;

    const query = searchQuery.toLowerCase();
    return kanbanBoard.map((column: any) => ({
      ...column,
      tasks: column.tasks.filter((task: any) => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.jira_ticket_key?.toLowerCase().includes(query)
      )
    })).filter((column: any) => column.tasks.length > 0);
  }, [kanbanBoard, searchQuery]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading Kanban Board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Kanban Board
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage your tasks and workflows
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetchBoard()}
                disabled={boardLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${boardLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={() => setShowArchivedTasksModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <Archive className="h-4 w-4" />
                <span>Archived</span>
              </button>
            </div>
          </div>

          {/* Project and Team Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <FolderOpen className="h-5 w-5 text-neutral-500" />
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Project:</label>
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project ? { ...project, categories: [], columns: [] } as ProjectWithCategories : null);
                  setSelectedTeam('');
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
                  
                  if (teamId) {
                    await updateUserRoleForTeam(teamId);
                  }
                }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateColumnModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Column</span>
              </button>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="max-w-7xl mx-auto p-6 relative">
        {boardError ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Error loading board: {boardError?.message || 'Unknown error'}</p>
            <button
              onClick={() => refetchBoard()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : boardLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading board...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {viewMode === 'kanban' ? (
              <div className="flex space-x-6 overflow-x-auto pb-6">
                                 {filteredBoard.map((column: any) => (
                   <KanbanColumn
                     key={column.id}
                     column={column}
                     onTaskClick={handleTaskClick}
                     onAddTask={handleAddTaskToColumn}
                     onColumnMenu={handleColumnMenu}
                     searchQuery={searchQuery}
                     viewMode={viewMode}
                     movingTaskId={movingTaskId}
                   />
                 ))}
                
                {/* Add Column Button */}
                <div className="flex-shrink-0 w-80">
                  <button
                    onClick={() => setShowCreateColumnModal(true)}
                    className="w-full h-full min-h-[400px] border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    <div className="text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">Add Column</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
                             <div className="space-y-4">
                 {filteredBoard.map((column: any) => (
                   <div key={column.id} className="bg-white dark:bg-neutral-800 rounded-lg p-4">
                     <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                       {column.name} ({column.tasks.length})
                     </h3>
                     <div className="space-y-2">
                       {column.tasks.map((task: any) => (
                         <KanbanColumn
                           key={task.id}
                           column={{ ...column, tasks: [task] }}
                           onTaskClick={handleTaskClick}
                           onAddTask={handleAddTaskToColumn}
                           onColumnMenu={handleColumnMenu}
                           searchQuery={searchQuery}
                           viewMode={viewMode}
                         />
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </DragDropContext>
        )}

        {/* Task Movement Loading Overlay */}
        {movingTaskId && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    Moving task...
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Please wait while we update the board
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onSubmit={handleCreateTask}
        projectData={selectedProject}
        userEmail={user?.email || ''}
        selectedTeam={selectedTeam || ''}
        columnId={selectedColumnForTask}
      />

      {selectedProject && (
        <EditTaskModal
          isOpen={showEditTaskModal}
          onClose={() => {
            setShowEditTaskModal(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateTask}
          task={editingTask}
          projectData={selectedProject}
          userEmail={user?.email || ''}
          teamId={selectedTeam}
        />
      )}

      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={() => setShowTaskDetailModal(false)}
        task={selectedTask}
        onAddComment={(taskId: string, comment: string) => {
          // Handle comment addition - this would need to be implemented
          console.log('Adding comment:', { taskId, comment });
        }}
        userEmail={user?.email || null}
      />

      <CreateColumnModal
        isOpen={showCreateColumnModal}
        onClose={() => setShowCreateColumnModal(false)}
        onSubmit={handleCreateColumn}
      />

      <EditColumnModal
        isOpen={showEditColumnModal}
        onClose={() => {
          setShowEditColumnModal(false);
          setEditingColumn(null);
        }}
        onSubmit={handleUpdateColumn}
        column={editingColumn}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={() => {
          if (taskToDelete) {
            handleDeleteTask(taskToDelete);
          } else if (columnToDelete) {
            handleDeleteColumn(columnToDelete);
          }
        }}
        title="Confirm Delete"
        message={taskToDelete ? "Are you sure you want to delete this task?" : "Are you sure you want to delete this column?"}
      />

      <ArchivedTasksModal
        isOpen={showArchivedTasksModal}
        onClose={() => setShowArchivedTasksModal(false)}
        projectId={selectedProject?.id || ''}
        isOwner={true} // This should be determined based on user role
      />
    </div>
  );
}
