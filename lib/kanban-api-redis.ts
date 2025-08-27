// =====================================================
// REDIS-ENHANCED KANBAN BOARD API
// =====================================================

import { supabaseClient } from './supabase-client';
import { 
  setCacheData, 
  getCacheData, 
  deleteCacheData, 
  invalidateCachePattern,
  generateCacheKey,
  KEY_PREFIXES,
  CACHE_TTL,
  checkRedisHealth
} from './redis-service';
import { 
  ProjectCategory, 
  CategoryOption,
  KanbanColumn, 
  KanbanTask, 
  KanbanTaskWithDetails,
  KanbanColumnWithTasks,
  ProjectWithCategories,
  CreateTaskForm,
  UpdateTaskForm,
  CreateCategoryForm,
  CreateColumnForm,
  TaskFilters,
  TaskSearchParams,
  TaskTimeline,
  TaskComment,
  TaskAssignment,
  ApiResponse,
  PaginatedResponse,
  JiraTicket,
  JiraSearchResult
} from './kanban-types';

// =====================================================
// REDIS-ENHANCED KANBAN BOARD API
// =====================================================

export async function getKanbanBoardWithRedis(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
  const cacheKey = generateCacheKey(KEY_PREFIXES.KANBAN_BOARD, projectId, teamId || 'no-team');
  
  try {
    console.log('🔄 Kanban: Attempting to fetch board data...');
    
    // First, try to get from Redis cache
    const cachedData = await getCacheData<KanbanColumnWithTasks[]>(cacheKey);
    if (cachedData) {
      console.log('🟢 Kanban: Data fetched from Redis cache');
      return {
        data: cachedData,
        success: true,
        source: 'redis'
      };
    }

    console.log('🟡 Kanban: Cache miss, fetching from database...');
    
    // Fallback to database
    const dbResult = await getKanbanBoardFromDatabase(projectId, teamId);
    
    if (dbResult.success && dbResult.data) {
      // Cache the result for future requests
      await setCacheData(cacheKey, dbResult.data, CACHE_TTL.KANBAN_BOARD);
      console.log('🟢 Kanban: Data cached in Redis for future requests');
      
      return {
        ...dbResult,
        source: 'database'
      };
    }

    return dbResult;
  } catch (error) {
    console.error('🔴 Kanban: Error in getKanbanBoardWithRedis:', error);
    
    // Final fallback to database
    console.log('🟡 Kanban: Falling back to database due to error...');
    return await getKanbanBoardFromDatabase(projectId, teamId);
  }
}

// Database fallback function
async function getKanbanBoardFromDatabase(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
  try {
    console.log('🔄 Database: Fetching kanban board data...');
    
    // Get columns for the project and team
    const columnFilters: any = {
      project_id: projectId,
      is_active: true
    };

    if (teamId) {
      columnFilters.team_id = teamId;
    }

    const columnsResponse = await supabaseClient.get('kanban_columns', {
      select: '*',
      filters: columnFilters,
      order: {
        column: 'sort_order',
        ascending: true
      }
    });

    if (columnsResponse.error) throw new Error(columnsResponse.error);

    // Create default columns if none exist
    if (teamId && (!columnsResponse.data || columnsResponse.data.length === 0)) {
      await createDefaultColumns(projectId, teamId);
      // Re-fetch columns after creation
      const newColumnsResponse = await supabaseClient.get('kanban_columns', {
        select: '*',
        filters: columnFilters,
        order: {
          column: 'sort_order',
          ascending: true
        }
      });
      if (!newColumnsResponse.error) {
        columnsResponse.data = newColumnsResponse.data;
      }
    }

    // Get tasks for the project
    const taskFilters: any = {
      project_id: projectId,
      status: 'active'
    };

    if (teamId) {
      taskFilters.scope = 'project';
    }

    const tasksResponse = await supabaseClient.get('kanban_tasks', {
      select: '*',
      filters: taskFilters,
      order: {
        column: 'sort_order',
        ascending: true
      }
    });

    if (tasksResponse.error) throw new Error(tasksResponse.error);

    // Group tasks by column
    const columnsWithTasks: KanbanColumnWithTasks[] = (columnsResponse.data || []).map((column: KanbanColumn) => ({
      ...column,
      tasks: (tasksResponse.data || []).filter((task: KanbanTask) => task.column_id === column.id) || []
    }));

    console.log('🟢 Database: Successfully fetched kanban board data');
    
    return {
      data: columnsWithTasks,
      success: true
    };
  } catch (error) {
    console.error('🔴 Database: Error fetching kanban board:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Create default columns
async function createDefaultColumns(projectId: string, teamId: string): Promise<void> {
  try {
    console.log('🔄 Database: Creating default columns...');
    
    const defaultColumns = [
      { name: 'To Do', description: 'Tasks that need to be started', color: '#6B7280', sort_order: 1 },
      { name: 'In Progress', description: 'Tasks currently being worked on', color: '#3B82F6', sort_order: 2 },
      { name: 'Review', description: 'Tasks ready for review', color: '#F59E0B', sort_order: 3 },
      { name: 'Done', description: 'Completed tasks', color: '#10B981', sort_order: 4 }
    ];

    for (const columnData of defaultColumns) {
      await supabaseClient.insert('kanban_columns', {
        project_id: projectId,
        team_id: teamId,
        ...columnData,
        is_active: true
      });
    }

    console.log('🟢 Database: Default columns created successfully');
  } catch (error) {
    console.error('🔴 Database: Error creating default columns:', error);
  }
}

// =====================================================
// REDIS-ENHANCED TASK OPERATIONS
// =====================================================

export async function createKanbanTaskWithRedis(
  taskData: CreateTaskForm,
  projectId: string,
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<KanbanTask>> {
  try {
    console.log('🔄 Task: Creating new task...');
    
    // Create task in database
    const dbResult = await createKanbanTaskInDatabase(taskData, userEmail);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Task: Task created and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Task: Error creating task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateKanbanTaskWithRedis(
  taskId: string,
  updates: UpdateTaskForm,
  projectId: string,
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<KanbanTask>> {
  try {
    console.log('🔄 Task: Updating task...');
    
    // Update task in database
    const dbResult = await updateKanbanTaskInDatabase(taskId, updates, userEmail);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Task: Task updated and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Task: Error updating task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteKanbanTaskWithRedis(
  taskId: string,
  projectId: string,
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<boolean>> {
  try {
    console.log('🔄 Task: Deleting task...');
    
    // Delete task from database
    const dbResult = await deleteKanbanTaskFromDatabase(taskId, userEmail);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Task: Task deleted and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Task: Error deleting task:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function moveTaskWithRedis(
  taskId: string,
  newColumnId: string,
  newSortOrder: number,
  projectId: string,
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<boolean>> {
  try {
    console.log('🔄 Task: Moving task...');
    
    // Move task in database
    const dbResult = await moveTaskInDatabase(taskId, newColumnId, newSortOrder, userEmail);
    
    if (dbResult.success) {
      // Temporarily disable cache invalidation to test
      try {
        await invalidateKanbanCaches(projectId, teamId);
        console.log('🟢 Task: Task moved and caches invalidated');
      } catch (cacheError) {
        console.error('🔴 Task: Cache invalidation failed, but task move succeeded:', cacheError);
        // Don't fail the operation if cache invalidation fails
      }
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Task: Error moving task:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// REDIS-ENHANCED COLUMN OPERATIONS
// =====================================================

export async function createKanbanColumnWithRedis(
  columnData: CreateColumnForm,
  projectId: string,
  teamId?: string
): Promise<ApiResponse<KanbanColumn>> {
  try {
    console.log('🔄 Column: Creating new column...');
    
    // Create column in database
    const dbResult = await createKanbanColumnInDatabase(columnData, projectId, teamId);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Column: Column created and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Column: Error creating column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateKanbanColumnWithRedis(
  columnId: string,
  updates: Partial<CreateColumnForm>,
  projectId: string,
  teamId?: string
): Promise<ApiResponse<KanbanColumn>> {
  try {
    console.log('🔄 Column: Updating column...');
    
    // Update column in database
    const dbResult = await updateKanbanColumnInDatabase(columnId, updates);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Column: Column updated and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Column: Error updating column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteKanbanColumnWithRedis(
  columnId: string,
  projectId: string,
  teamId?: string
): Promise<ApiResponse<boolean>> {
  try {
    console.log('🔄 Column: Deleting column...');
    
    // Delete column from database
    const dbResult = await deleteKanbanColumnFromDatabase(columnId);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
      console.log('🟢 Column: Column deleted and caches invalidated');
    }
    
    return dbResult;
  } catch (error) {
    console.error('🔴 Column: Error deleting column:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// REDIS-ENHANCED CATEGORY OPERATIONS
// =====================================================

export async function getProjectCategoriesWithRedis(
  projectId: string
): Promise<ApiResponse<ProjectCategory[]>> {
  const cacheKey = generateCacheKey(KEY_PREFIXES.PROJECT_CATEGORIES, projectId);
  
  try {
    console.log('🔄 Categories: Attempting to fetch categories...');
    
    // First, try to get from Redis cache
    const cachedData = await getCacheData<ProjectCategory[]>(cacheKey);
    if (cachedData) {
      console.log('🟢 Categories: Data fetched from Redis cache');
      return {
        data: cachedData,
        success: true,
        source: 'redis'
      };
    }

    console.log('🟡 Categories: Cache miss, fetching from database...');
    
    // Fallback to database
    const dbResult = await getProjectCategoriesFromDatabase(projectId);
    
    if (dbResult.success && dbResult.data) {
      // Cache the result for future requests
      await setCacheData(cacheKey, dbResult.data, CACHE_TTL.PROJECT_CATEGORIES);
      console.log('🟢 Categories: Data cached in Redis for future requests');
      
      return {
        ...dbResult,
        source: 'database'
      };
    }

    return dbResult;
  } catch (error) {
    console.error('🔴 Categories: Error in getProjectCategoriesWithRedis:', error);
    
    // Final fallback to database
    console.log('🟡 Categories: Falling back to database due to error...');
    return await getProjectCategoriesFromDatabase(projectId);
  }
}

// =====================================================
// CACHE INVALIDATION UTILITIES
// =====================================================

async function invalidateKanbanCaches(projectId: string, teamId?: string): Promise<void> {
  try {
    console.log('🔄 Cache: Invalidating kanban caches...');
    
    // Invalidate board cache
    const boardPattern = generateCacheKey(KEY_PREFIXES.KANBAN_BOARD, projectId, '*');
    await invalidateCachePattern(boardPattern);
    
    // Invalidate categories cache
    const categoriesPattern = generateCacheKey(KEY_PREFIXES.PROJECT_CATEGORIES, projectId);
    await deleteCacheData(categoriesPattern);
    
    console.log('🟢 Cache: Kanban caches invalidated successfully');
  } catch (error) {
    console.error('🔴 Cache: Error invalidating caches:', error);
  }
}

// =====================================================
// DATABASE FALLBACK FUNCTIONS
// =====================================================

async function createKanbanTaskInDatabase(taskData: CreateTaskForm, userEmail?: string): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id as it doesn't exist in kanban_tasks table
    const { team_id, ...taskDataWithoutTeamId } = taskData as any;
    
    console.log('🔄 Database: Creating task with data:', taskDataWithoutTeamId);
    
    const response = await supabaseClient.insert('kanban_tasks', taskDataWithoutTeamId);
    if (response.error) throw new Error(response.error);

    // If the insert was successful but no data returned, try to fetch the created task
    let createdTask: KanbanTask | null = null;
    
    if (response.data && response.data[0]) {
      createdTask = response.data[0];
    } else {
      // Try to fetch the most recently created task by this user
      const fetchResponse = await supabaseClient.get('kanban_tasks', {
        filters: {
          created_by: taskData.created_by,
          title: taskData.title,
          project_id: taskData.project_id
        },
        order: { column: 'created_at', ascending: false },
        limit: 1
      });
      
      if (fetchResponse.data && fetchResponse.data.length > 0) {
        createdTask = fetchResponse.data[0];
      }
    }

    // Create timeline entry for task creation
    if (createdTask) {
      const timelineDetails = {
        title: createdTask.title,
        description: createdTask.description,
        priority: createdTask.priority,
        column_id: createdTask.column_id
      };
      
      try {
        // Import the createTaskTimeline function
        const { createTaskTimeline } = await import('./kanban-api');
        await createTaskTimeline(
          createdTask.id,
          userEmail || taskData.created_by || 'system',
          'created',
          timelineDetails
        );
        console.log('🟢 Timeline: Task creation timeline entry created');
      } catch (error) {
        console.warn('⚠️ Timeline: Failed to create timeline entry for task creation:', error);
        // Don't fail the task creation if timeline creation fails
      }
    }

    return {
      data: createdTask || {} as KanbanTask,
      success: true
    };
  } catch (error) {
    console.error('🔴 Database: Error creating task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function updateKanbanTaskInDatabase(taskId: string, updates: UpdateTaskForm, userEmail?: string): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id as it doesn't exist in kanban_tasks table
    const { team_id, ...updatesWithoutTeamId } = updates as any;
    
    console.log('🔄 Database: Updating task with data:', updatesWithoutTeamId);
    
    // Get the current task to compare changes
    const currentTaskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (currentTaskResponse.error) throw new Error(currentTaskResponse.error);
    
    const currentTask = currentTaskResponse.data?.[0];
    if (!currentTask) throw new Error('Task not found');

    // Clean the updates object to handle empty strings for date fields
    const cleanedUpdates = { ...updatesWithoutTeamId };
    if (cleanedUpdates.due_date === '') {
      cleanedUpdates.due_date = null;
    }

    const response = await supabaseClient.update('kanban_tasks', taskId, cleanedUpdates);
    if (response.error) throw new Error(response.error);

    const updatedTask = response.data;

    // Create timeline entries for each change
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('./kanban-api');
      
      // Title/Description changes
      if (updates.title !== undefined && updates.title !== currentTask.title) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'updated',
          {
            field: 'title',
            old_value: currentTask.title,
            new_value: updates.title
          }
        );
      }

      if (updates.description !== undefined && updates.description !== currentTask.description) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'updated',
          {
            field: 'description',
            old_value: currentTask.description,
            new_value: updates.description
          }
        );
      }

      // Priority changes
      if (updates.priority !== undefined && updates.priority !== currentTask.priority) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'priority_changed',
          {
            from_priority: currentTask.priority,
            to_priority: updates.priority
          }
        );
      }

      // Status changes
      if (updates.status !== undefined && updates.status !== currentTask.status) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'status_changed',
          {
            from_status: currentTask.status,
            to_status: updates.status
          }
        );
      }

      // Assignment changes
      if (updates.assigned_to !== undefined && updates.assigned_to !== currentTask.assigned_to) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'assigned',
          {
            from_user: currentTask.assigned_to,
            to_user: updates.assigned_to
          }
        );
      }

      // JIRA ticket linking
      if (updates.jira_ticket_key !== undefined && updates.jira_ticket_key !== currentTask.jira_ticket_key) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'linked_jira',
          {
            ticket_key: updates.jira_ticket_key
          }
        );
      }

      // Column movement
      if (updates.column_id !== undefined && updates.column_id !== currentTask.column_id) {
        // Get column names for better timeline display
        const fromColumnResponse = await supabaseClient.get('kanban_columns', {
          filters: { id: currentTask.column_id }
        });
        const toColumnResponse = await supabaseClient.get('kanban_columns', {
          filters: { id: updates.column_id }
        });
        
        const fromColumnName = fromColumnResponse.data?.[0]?.name || currentTask.column_id;
        const toColumnName = toColumnResponse.data?.[0]?.name || updates.column_id;
        
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'moved',
          {
            from_column: fromColumnName,
            to_column: toColumnName,
            from_column_id: currentTask.column_id,
            to_column_id: updates.column_id
          }
        );
      }

      console.log('🟢 Timeline: Task update timeline entries created');
    } catch (error) {
      console.warn('⚠️ Timeline: Failed to create timeline entries for task update:', error);
      // Don't fail the task update if timeline creation fails
    }

    return { data: updatedTask, success: true };
  } catch (error) {
    console.error('🔴 Database: Error updating task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function deleteKanbanTaskFromDatabase(taskId: string, userEmail?: string): Promise<ApiResponse<boolean>> {
  try {
    // Get the task details before deletion for timeline
    const taskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (taskResponse.error) throw new Error(taskResponse.error);
    
    const taskToDelete = taskResponse.data?.[0];
    if (!taskToDelete) throw new Error('Task not found');

    // Create timeline entry for task deletion
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('./kanban-api');
              await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'deleted',
          {
            title: taskToDelete.title,
            description: taskToDelete.description,
            priority: taskToDelete.priority,
            column_id: taskToDelete.column_id
          }
        );
      console.log('🟢 Timeline: Task deletion timeline entry created');
    } catch (error) {
      console.warn('⚠️ Timeline: Failed to create timeline entry for task deletion:', error);
      // Don't fail the task deletion if timeline creation fails
    }

    const response = await supabaseClient.delete('kanban_tasks', taskId);
    if (response.error) throw new Error(response.error);
    return { data: true, success: true };
  } catch (error) {
    console.error('🔴 Database: Error deleting task:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function moveTaskInDatabase(taskId: string, newColumnId: string, newSortOrder: number, userEmail?: string): Promise<ApiResponse<boolean>> {
  try {
    console.log('🔄 Database: Moving task with params:', { taskId, newColumnId, newSortOrder });
    
    // Get the current task to compare changes
    const currentTaskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (currentTaskResponse.error) throw new Error(currentTaskResponse.error);
    
    const currentTask = currentTaskResponse.data?.[0];
    if (!currentTask) throw new Error('Task not found');

    const response = await supabaseClient.update('kanban_tasks', taskId, {
      column_id: newColumnId,
      sort_order: newSortOrder
    });
    
    console.log('🔄 Database: Update response:', response);
    
    if (response.error) {
      console.error('🔴 Database: Supabase error:', response.error);
      throw new Error(response.error);
    }

    // Create timeline entry for task movement
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('./kanban-api');
      
      // Get column names for better timeline display
      const fromColumnResponse = await supabaseClient.get('kanban_columns', {
        filters: { id: currentTask.column_id }
      });
      const toColumnResponse = await supabaseClient.get('kanban_columns', {
        filters: { id: newColumnId }
      });
      
      const fromColumnName = fromColumnResponse.data?.[0]?.name || currentTask.column_id;
      const toColumnName = toColumnResponse.data?.[0]?.name || newColumnId;
      
              await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'moved',
          {
            from_column: fromColumnName,
            to_column: toColumnName,
            from_column_id: currentTask.column_id,
            to_column_id: newColumnId,
            sort_order: newSortOrder
          }
        );
      console.log('🟢 Timeline: Task movement timeline entry created');
    } catch (error) {
      console.warn('⚠️ Timeline: Failed to create timeline entry for task movement:', error);
      // Don't fail the task movement if timeline creation fails
    }
    
    console.log('🟢 Database: Task moved successfully');
    return { data: true, success: true };
  } catch (error) {
    console.error('🔴 Database: Error moving task:', error);
    console.error('🔴 Database: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function createKanbanColumnInDatabase(columnData: CreateColumnForm, projectId: string, teamId?: string): Promise<ApiResponse<KanbanColumn>> {
  try {
    const response = await supabaseClient.insert('kanban_columns', {
      project_id: projectId,
      team_id: teamId,
      ...columnData
    });
    if (response.error) throw new Error(response.error);
    return { data: response.data, success: true };
  } catch (error) {
    console.error('🔴 Database: Error creating column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function updateKanbanColumnInDatabase(columnId: string, updates: Partial<CreateColumnForm>): Promise<ApiResponse<KanbanColumn>> {
  try {
    const response = await supabaseClient.update('kanban_columns', columnId, updates);
    if (response.error) throw new Error(response.error);
    return { data: response.data, success: true };
  } catch (error) {
    console.error('🔴 Database: Error updating column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function deleteKanbanColumnFromDatabase(columnId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.delete('kanban_columns', columnId);
    if (response.error) throw new Error(response.error);
    return { data: true, success: true };
  } catch (error) {
    console.error('🔴 Database: Error deleting column:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function getProjectCategoriesFromDatabase(projectId: string): Promise<ApiResponse<ProjectCategory[]>> {
  try {
    const response = await supabaseClient.get('project_categories', {
      select: '*',
      filters: {
        project_id: projectId,
        is_active: true
      },
      order: {
        column: 'sort_order',
        ascending: true
      }
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data || [],
      success: true
    };
  } catch (error) {
    console.error('🔴 Database: Error fetching project categories:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// REDIS HEALTH CHECK
// =====================================================

export async function getRedisStatus(): Promise<{ status: string; message: string }> {
  return await checkRedisHealth();
}
