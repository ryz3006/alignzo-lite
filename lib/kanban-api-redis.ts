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
     // First, try to get from Redis cache
     const cachedData = await getCacheData<KanbanColumnWithTasks[]>(cacheKey);
     if (cachedData) {
       return {
         data: cachedData,
         success: true,
         source: 'redis'
       };
     }
    
    // Fallback to database
    const dbResult = await getKanbanBoardFromDatabase(projectId, teamId);
    
         if (dbResult.success && dbResult.data) {
       // Cache the result for future requests
       await setCacheData(cacheKey, dbResult.data, CACHE_TTL.KANBAN_BOARD);
       
       return {
         ...dbResult,
         source: 'database'
       };
     }

    return dbResult;
     } catch (error) {
     // Final fallback to database
     return await getKanbanBoardFromDatabase(projectId, teamId);
   }
}

// Database fallback function
async function getKanbanBoardFromDatabase(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
     try {
    
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

         return {
       data: columnsWithTasks,
       success: true
     };
   } catch (error) {
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

         // Default columns created
   } catch (error) {
     // Handle error silently
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
     // Create task in database
     const dbResult = await createKanbanTaskInDatabase(taskData, userEmail);
     
     if (dbResult.success) {
       // Invalidate related caches
       await invalidateKanbanCaches(projectId, teamId);
     }
    
    return dbResult;
     } catch (error) {
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
     // Update task in database
     const dbResult = await updateKanbanTaskInDatabase(taskId, updates, userEmail);
     
     if (dbResult.success) {
       // Invalidate related caches
       await invalidateKanbanCaches(projectId, teamId);
     }
    
    return dbResult;
     } catch (error) {
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
     // Delete task from database
     const dbResult = await deleteKanbanTaskFromDatabase(taskId, userEmail);
     
     if (dbResult.success) {
       // Invalidate related caches
       await invalidateKanbanCaches(projectId, teamId);
     }
    
    return dbResult;
     } catch (error) {
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
    console.log(`🔄 Moving task ${taskId} to column ${newColumnId} with sort order ${newSortOrder}`);
    
    // Move task in database FIRST - this is the critical operation
    const dbResult = await moveTaskInDatabase(taskId, newColumnId, newSortOrder, userEmail);
    
    if (!dbResult.success) {
      console.error('❌ Database move failed:', dbResult.error);
      return dbResult;
    }
    
    console.log(`✅ Task ${taskId} moved successfully in database`);
    
    // Only invalidate caches AFTER successful database operation
    try {
      await invalidateKanbanCaches(projectId, teamId);
      console.log(`✅ Cache invalidation completed for task move`);
    } catch (cacheError) {
      console.warn('⚠️ Cache invalidation failed, but task move succeeded:', cacheError);
      // Don't fail the operation if cache invalidation fails
      // The database operation is the source of truth
    }
    
    return {
      data: true,
      success: true,
      source: 'database'
    };
  } catch (error) {
    console.error('❌ Error in moveTaskWithRedis:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'unknown'
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
     // Create column in database
     const dbResult = await createKanbanColumnInDatabase(columnData, projectId, teamId);
     
     if (dbResult.success) {
       // Invalidate related caches
       await invalidateKanbanCaches(projectId, teamId);
     }
    
    return dbResult;
     } catch (error) {
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
    // Update column in database
    const dbResult = await updateKanbanColumnInDatabase(columnId, updates);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
    }
    
    return dbResult;
  } catch (error) {
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
    // Delete column from database
    const dbResult = await deleteKanbanColumnFromDatabase(columnId);
    
    if (dbResult.success) {
      // Invalidate related caches
      await invalidateKanbanCaches(projectId, teamId);
    }
    
    return dbResult;
  } catch (error) {
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
     // First, try to get from Redis cache
     const cachedData = await getCacheData<ProjectCategory[]>(cacheKey);
     if (cachedData) {
       return {
         data: cachedData,
         success: true,
         source: 'redis'
       };
     }
    
    // Fallback to database
    const dbResult = await getProjectCategoriesFromDatabase(projectId);
    
         if (dbResult.success && dbResult.data) {
       // Cache the result for future requests
       await setCacheData(cacheKey, dbResult.data, CACHE_TTL.PROJECT_CATEGORIES);
       
       return {
         ...dbResult,
         source: 'database'
       };
     }

    return dbResult;
     } catch (error) {
     // Final fallback to database
     return await getProjectCategoriesFromDatabase(projectId);
   }
}

// =====================================================
// CACHE INVALIDATION UTILITIES - SAFE VERSION
// =====================================================

async function invalidateKanbanCaches(projectId: string, teamId?: string): Promise<void> {
  try {
    console.log(`🔄 Safely invalidating caches for project: ${projectId}, team: ${teamId || 'none'}`);
    
    // Only invalidate specific board cache, not all patterns
    const boardCacheKey = generateCacheKey(KEY_PREFIXES.KANBAN_BOARD, projectId, teamId || 'no-team');
    await deleteCacheData(boardCacheKey);
    console.log(`✅ Invalidated board cache: ${boardCacheKey}`);
    
    // Invalidate categories cache only if needed
    const categoriesCacheKey = generateCacheKey(KEY_PREFIXES.PROJECT_CATEGORIES, projectId);
    await deleteCacheData(categoriesCacheKey);
    console.log(`✅ Invalidated categories cache: ${categoriesCacheKey}`);
    
    console.log(`✅ Cache invalidation completed safely for project: ${projectId}`);
  } catch (error) {
    console.error('❌ Error in invalidateKanbanCaches:', error);
    // Don't fail the operation if cache invalidation fails
    // The database operation should still succeed
  }
}

// =====================================================
// DATABASE FALLBACK FUNCTIONS
// =====================================================

async function createKanbanTaskInDatabase(taskData: CreateTaskForm, userEmail?: string): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id and user_email as they don't exist in kanban_tasks table
    const { team_id, user_email, categories, ...taskDataWithoutExtraFields } = taskData as any;
    
    // Creating task with data
    const response = await supabaseClient.insert('kanban_tasks', taskDataWithoutExtraFields);
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

    // Handle multiple categories if provided
    if (createdTask && categories && Array.isArray(categories) && categories.length > 0) {
      try {
        // Call the database function directly to save the categories
        const categoriesJson = JSON.stringify(categories);
        
        const { data: rpcData, error: categoriesError } = await supabaseClient.rpc('update_task_categories', {
          p_task_id: createdTask.id,
          p_categories: categoriesJson,
          p_user_email: userEmail || taskData.created_by || 'system'
        });

        if (categoriesError) {
          console.error('❌ Failed to save task categories:', categoriesError);
        }
      } catch (error) {
        console.error('❌ Error saving task categories:', error);
        // Don't fail the task creation if category saving fails
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
                 // Timeline entry created
       } catch (error) {
         // Don't fail the task creation if timeline creation fails
       }
    }

    return {
      data: createdTask || {} as KanbanTask,
      success: true
    };
  } catch (error) {
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function updateKanbanTaskInDatabase(taskId: string, updates: UpdateTaskForm, userEmail?: string): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id and user_email as they don't exist in kanban_tasks table
    const { team_id, user_email, ...updatesWithoutExtraFields } = updates as any;
    
    // Updating task with data
    
    // Get the current task to compare changes
    const currentTaskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (currentTaskResponse.error) throw new Error(currentTaskResponse.error);
    
    const currentTask = currentTaskResponse.data?.[0];
    if (!currentTask) throw new Error('Task not found');

    // Clean the updates object to handle empty strings for date fields
    const cleanedUpdates = { ...updatesWithoutExtraFields };
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

      // Category changes (legacy single category)
      if (updates.category_id !== undefined && updates.category_id !== currentTask.category_id) {
        // Get category names for better timeline display
        const fromCategoryResponse = await supabaseClient.get('project_categories', {
          filters: { id: currentTask.category_id }
        });
        const toCategoryResponse = await supabaseClient.get('project_categories', {
          filters: { id: updates.category_id }
        });
        
        const fromCategoryName = fromCategoryResponse.data?.[0]?.name || currentTask.category_id;
        const toCategoryName = toCategoryResponse.data?.[0]?.name || updates.category_id;
        
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'category_changed',
          {
            from_category: fromCategoryName,
            to_category: toCategoryName,
            from_category_id: currentTask.category_id,
            to_category_id: updates.category_id
          }
        );
      }

      // Category option changes (legacy single category option)
      if (updates.category_option_id !== undefined && updates.category_option_id !== currentTask.category_option_id) {
        // Get category option names for better timeline display
        const fromOptionResponse = await supabaseClient.get('category_options', {
          filters: { id: currentTask.category_option_id }
        });
        const toOptionResponse = await supabaseClient.get('category_options', {
          filters: { id: updates.category_option_id }
        });
        
        const fromOptionName = fromOptionResponse.data?.[0]?.option_name || currentTask.category_option_id;
        const toOptionName = toOptionResponse.data?.[0]?.option_name || updates.category_option_id;
        
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'category_option_changed',
          {
            from_option: fromOptionName,
            to_option: toOptionName,
            from_option_id: currentTask.category_option_id,
            to_option_id: updates.category_option_id
          }
        );
      }

      // Due date changes
      if (updates.due_date !== undefined && updates.due_date !== currentTask.due_date) {
        await createTaskTimeline(
          taskId,
          userEmail || 'system',
          'updated',
          {
            field: 'due_date',
            old_value: currentTask.due_date,
            new_value: updates.due_date
          }
        );
      }

             // Timeline entries created
     } catch (error) {
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
               // Timeline entry created
       } catch (error) {
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
    console.log(`🔄 Moving task ${taskId} to column ${newColumnId} with sort order ${newSortOrder}`);
    
    // Use a transaction to ensure data consistency
    const { data: transactionResult, error: transactionError } = await supabaseClient.rpc('move_kanban_task_safe', {
      p_task_id: taskId,
      p_new_column_id: newColumnId,
      p_new_sort_order: newSortOrder,
      p_user_email: userEmail || 'system'
    });
    
    if (transactionError) {
      console.error('❌ Transaction error:', transactionError);
      throw new Error(transactionError);
    }
    
    if (transactionResult && transactionResult.success) {
      console.log(`✅ Task ${taskId} moved successfully via transaction`);
      return { data: true, success: true };
    } else {
      console.error('❌ Transaction failed:', transactionResult);
      throw new Error('Transaction failed to move task');
    }
  } catch (error) {
    console.error('❌ Error in moveTaskInDatabase:', error);
    
    // Fallback to direct update if transaction fails
    try {
      console.log(`🔄 Attempting fallback direct update for task ${taskId}`);
      
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
      
      if (response.error) {
        throw new Error(response.error);
      }

      console.log(`✅ Fallback update successful for task ${taskId}`);
      
      // Create timeline entry for task movement
      try {
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
        console.log(`✅ Timeline entry created for task ${taskId} move`);
      } catch (timelineError) {
        console.warn('⚠️ Timeline creation failed, but task move succeeded:', timelineError);
        // Don't fail the operation if timeline creation fails
      }
      
      return { data: true, success: true };
    } catch (fallbackError) {
      console.error('❌ Fallback update also failed:', fallbackError);
      return {
        data: false,
        success: false,
        error: `Move failed: ${error instanceof Error ? error.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
      };
    }
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
