// =====================================================
// OPTIMIZED KANBAN BOARD HOOKS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getKanbanBoardOptimized,
  createKanbanTaskOptimized as createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  moveTaskOptimized as moveTask,
  createKanbanColumn,
  getProjectCategoriesOptimized
} from '@/lib/kanban-api-optimized';
import { 
  updateKanbanColumn,
  deleteKanbanColumn
} from '@/lib/kanban-api';
import { 
  KanbanColumnWithTasks,
  CreateTaskForm,
  UpdateTaskForm,
  CreateColumnForm,
  ProjectCategory
} from '@/lib/kanban-types';

// =====================================================
// OPTIMISTIC UPDATE HELPERS
// =====================================================

export const optimisticUpdateBoard = (oldData: any, taskId: string, columnId: string, sortOrder: number) => {
  if (!oldData) return oldData;
  
  const updatedColumns = oldData.columns.map((column: any) => {
    if (column.id === columnId) {
      // Add task to this column
      const task = findTaskInBoard(oldData, taskId);
      if (task) {
        const updatedTasks = [...column.tasks];
        updatedTasks.splice(sortOrder, 0, { ...task, column_id: columnId, sort_order: sortOrder });
        return { ...column, tasks: updatedTasks };
      }
    } else {
      // Remove task from other columns
      const updatedTasks = column.tasks.filter((t: any) => t.id !== taskId);
      return { ...column, tasks: updatedTasks };
    }
    return column;
  });
  
  return { ...oldData, columns: updatedColumns };
};

export const addTaskToBoard = (oldData: any, task: any) => {
  if (!oldData) return oldData;
  
  const updatedColumns = oldData.columns.map((column: any) => {
    if (column.id === task.column_id) {
      return { ...column, tasks: [...column.tasks, task] };
    }
    return column;
  });
  
  return { ...oldData, columns: updatedColumns };
};

export const updateTaskInBoard = (oldData: any, taskId: string, updates: any) => {
  if (!oldData) return oldData;
  
  const updatedColumns = oldData.columns.map((column: any) => {
    const updatedTasks = column.tasks.map((task: any) => {
      if (task.id === taskId) {
        return { ...task, ...updates, updated_at: new Date().toISOString() };
      }
      return task;
    });
    return { ...column, tasks: updatedTasks };
  });
  
  return { ...oldData, columns: updatedColumns };
};

export const removeTaskFromBoard = (oldData: any, taskId: string) => {
  if (!oldData) return oldData;
  
  const updatedColumns = oldData.columns.map((column: any) => {
    const updatedTasks = column.tasks.filter((task: any) => task.id !== taskId);
    return { ...column, tasks: updatedTasks };
  });
  
  return { ...oldData, columns: updatedColumns };
};

export const replaceOptimisticTask = (oldData: any, optimisticId: string, realTask: any) => {
  if (!oldData) return oldData;
  
  const updatedColumns = oldData.columns.map((column: any) => {
    const updatedTasks = column.tasks.map((task: any) => {
      if (task.id === optimisticId) {
        return realTask;
      }
      return task;
    });
    return { ...column, tasks: updatedTasks };
  });
  
  return { ...oldData, columns: updatedColumns };
};

export const findTaskInBoard = (boardData: any, taskId: string) => {
  for (const column of boardData.columns) {
    const task = column.tasks.find((t: any) => t.id === taskId);
    if (task) return task;
  }
  return null;
};

// =====================================================
// MAIN KANBAN BOARD HOOK
// =====================================================

export const useKanbanBoard = (projectId: string, teamId?: string) => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery<{
    columns: KanbanColumnWithTasks[];
    categories: ProjectCategory[];
  }>({
    queryKey: ['kanban-board', projectId, teamId],
    queryFn: async () => {
      const response = await getKanbanBoardOptimized(projectId, teamId);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch board data');
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!projectId
  });

  // Task Movement with Immediate UI Update
  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, columnId, sortOrder }: { taskId: string; columnId: string; sortOrder: number }) =>
      moveTask(taskId, columnId, sortOrder, ''), // userEmail will need to be passed from the component
    onMutate: async ({ taskId, columnId, sortOrder }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['kanban-board', projectId, teamId] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['kanban-board', projectId, teamId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['kanban-board', projectId, teamId], (old: any) => {
        return optimisticUpdateBoard(old, taskId, columnId, sortOrder);
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(['kanban-board', projectId, teamId], context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId, teamId] });
    }
  });

  // Task Creation with Immediate UI Update
  const createTaskMutation = useMutation({
    mutationFn: (taskData: CreateTaskForm) => createKanbanTask(taskData),
    onMutate: async (taskData) => {
      await queryClient.cancelQueries({ queryKey: ['kanban-board', projectId, teamId] });
      const previousData = queryClient.getQueryData(['kanban-board', projectId, teamId]);
      
      // Create optimistic task
      const optimisticTask = {
        id: `temp-${Date.now()}`,
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };
      
      queryClient.setQueryData(['kanban-board', projectId, teamId], (old: any) => {
        return addTaskToBoard(old, optimisticTask);
      });
      
      return { previousData, optimisticTask };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['kanban-board', projectId, teamId], context.previousData);
      }
    },
    onSuccess: (newTask, variables, context) => {
      // Replace optimistic task with real task
      queryClient.setQueryData(['kanban-board', projectId, teamId], (old: any) => {
        return replaceOptimisticTask(old, context?.optimisticTask.id, newTask);
      });
    }
  });

  // Task Update with Immediate UI Update
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<any> }) =>
      updateKanbanTask(taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban-board', projectId, teamId] });
      const previousData = queryClient.getQueryData(['kanban-board', projectId, teamId]);
      
      queryClient.setQueryData(['kanban-board', projectId, teamId], (old: any) => {
        return updateTaskInBoard(old, taskId, updates);
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['kanban-board', projectId, teamId], context.previousData);
      }
    }
  });

  // Task Deletion with Immediate UI Update
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteKanbanTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['kanban-board', projectId, teamId] });
      const previousData = queryClient.getQueryData(['kanban-board', projectId, teamId]);
      
      queryClient.setQueryData(['kanban-board', projectId, teamId], (old: any) => {
        return removeTaskFromBoard(old, taskId);
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['kanban-board', projectId, teamId], context.previousData);
      }
    }
  });

  // Column Creation
  const createColumnMutation = useMutation({
    mutationFn: (columnData: CreateColumnForm & { project_id: string; team_id?: string }) =>
      createKanbanColumn(columnData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId, teamId] });
    }
  });

  // Column Update
  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, updates }: { columnId: string; updates: any }) =>
      updateKanbanColumn(columnId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId, teamId] });
    }
  });

  // Column Deletion
  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteKanbanColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId, teamId] });
    }
  });

  return {
    data,
    isLoading,
    error,
    refetch,
    moveTask: moveTaskMutation.mutate,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    createColumn: createColumnMutation.mutate,
    updateColumn: updateColumnMutation.mutate,
    deleteColumn: deleteColumnMutation.mutate,
    isMoving: moveTaskMutation.isPending,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isCreatingColumn: createColumnMutation.isPending,
    isUpdatingColumn: updateColumnMutation.isPending,
    isDeletingColumn: deleteColumnMutation.isPending
  };
};

// =====================================================
// CACHE MANAGEMENT HOOK
// =====================================================

export const useKanbanCache = () => {
  const queryClient = useQueryClient();
  
  const invalidateRelatedQueries = (projectId: string, operation: string) => {
    // Invalidate specific queries based on operation
    switch (operation) {
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
      case 'TASK_MOVED':
        queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId] });
        queryClient.invalidateQueries({ queryKey: ['kanban-tasks', projectId] });
        break;
      case 'COLUMN_CREATED':
      case 'COLUMN_UPDATED':
        queryClient.invalidateQueries({ queryKey: ['kanban-board', projectId] });
        queryClient.invalidateQueries({ queryKey: ['kanban-columns', projectId] });
        break;
      case 'CATEGORY_UPDATED':
        queryClient.invalidateQueries({ queryKey: ['project-categories', projectId] });
        break;
    }
  };
  
  const prefetchRelatedData = async (projectId: string) => {
    // Prefetch related data for better UX
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['kanban-board', projectId],
        queryFn: () => getKanbanBoardOptimized(projectId)
      }),
      queryClient.prefetchQuery({
        queryKey: ['project-categories', projectId],
        queryFn: () => getProjectCategoriesOptimized(projectId)
      })
    ]);
  };
  
  return { invalidateRelatedQueries, prefetchRelatedData };
};
