// =====================================================
// REDIS-ENHANCED KANBAN BOARD API
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Create direct Supabase client like the project-options API
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
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

    let columnsQuery = supabase
      .from('kanban_columns')
      .select('*')
      .eq('project_id', columnFilters.project_id)
      .eq('is_active', true);
    
    if (columnFilters.team_id) {
      columnsQuery = columnsQuery.eq('team_id', columnFilters.team_id);
    }
    
    let { data: columns, error: columnsError } = await columnsQuery.order('sort_order', { ascending: true });

    if (columnsError) throw new Error(columnsError.message);

    // Create default columns if none exist
    if (teamId && (!columns || columns.length === 0)) {
      await createDefaultColumns(projectId, teamId);
      // Re-fetch columns after creation
      const { data: newColumns, error: newColumnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (!newColumnsError && newColumns) {
        columns = newColumns;
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

    const { data: tasks, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (tasksError) throw new Error(tasksError.message);

    // Group tasks by column
    const columnsWithTasks: KanbanColumnWithTasks[] = (columns || []).map((column: KanbanColumn) => ({
      ...column,
      tasks: (tasks || []).filter((task: KanbanTask) => task.column_id === column.id) || []
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
       await supabase
         .from('kanban_columns')
         .insert({
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
// HELPER FUNCTIONS FOR TIMELINE
// =====================================================

 async function getCategoryName(categoryId: string): Promise<string> {
   try {
     const { data, error } = await supabase
       .from('project_categories')
       .select('name')
       .eq('id', categoryId)
       .single();
     
     if (error) throw error;
     return data?.name || categoryId;
   } catch (error) {
     return categoryId;
   }
 }

 async function getCategoryOptionName(optionId: string): Promise<string> {
   try {
     const { data, error } = await supabase
       .from('category_options')
       .select('option_name')
       .eq('id', optionId)
       .single();
     
     if (error) throw error;
     return data?.option_name || optionId;
   } catch (error) {
     return optionId;
   }
 }

// =====================================================
// DATABASE FALLBACK FUNCTIONS
// =====================================================

async function createKanbanTaskInDatabase(taskData: CreateTaskForm, userEmail?: string): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id and user_email as they don't exist in kanban_tasks table
    const { team_id, user_email, categories, ...taskDataWithoutExtraFields } = taskData as any;
    
    // Clean the task data - handle empty strings for date fields
    const cleanTaskData = { ...taskDataWithoutExtraFields };
    
    // Convert empty strings to null for date fields
    if (cleanTaskData.due_date === '') {
      cleanTaskData.due_date = null;
    }
    
    // Debug logging to help identify the issue
    console.log('🔍 Creating task with data:', {
      original: taskData,
      filtered: cleanTaskData,
      categories: categories
    });

    // Validate required fields before database insertion
    if (!cleanTaskData.category_id || cleanTaskData.category_id.trim() === '') {
      console.error('❌ Category ID is empty or invalid:', cleanTaskData.category_id);
      throw new Error('Category ID is required and must be a valid UUID');
    }

    if (!cleanTaskData.column_id || cleanTaskData.column_id.trim() === '') {
      console.error('❌ Column ID is empty or invalid:', cleanTaskData.column_id);
      throw new Error('Column ID is required and must be a valid UUID');
    }

    if (!cleanTaskData.project_id || cleanTaskData.project_id.trim() === '') {
      console.error('❌ Project ID is empty or invalid:', cleanTaskData.project_id);
      throw new Error('Project ID is required and must be a valid UUID');
    }

         // Creating task with data
     const { data: insertData, error: insertError } = await supabase
       .from('kanban_tasks')
       .insert(cleanTaskData)
       .select()
       .single();
     
     if (insertError) throw new Error(insertError.message);

     // If the insert was successful but no data returned, try to fetch the created task
     let createdTask: KanbanTask | null = null;
     
     if (insertData) {
       createdTask = insertData;
     } else {
       // Try to fetch the most recently created task by this user
       const { data: fetchData, error: fetchError } = await supabase
         .from('kanban_tasks')
         .select('*')
         .eq('created_by', taskData.created_by)
         .eq('title', taskData.title)
         .eq('project_id', taskData.project_id)
         .order('created_at', { ascending: false })
         .limit(1)
         .single();
       
       if (!fetchError && fetchData) {
         createdTask = fetchData;
       }
     }

    // Handle multiple categories if provided
    if (createdTask && categories && Array.isArray(categories) && categories.length > 0) {
      try {
        // Call the database function directly to save the categories
        const categoriesJson = JSON.stringify(categories);
        
        const { data: rpcData, error: categoriesError } = await supabase.rpc('update_task_categories', {
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
          'created',
          JSON.stringify(timelineDetails),
          userEmail || taskData.created_by || 'system'
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
    const { data: currentTaskData, error: currentTaskError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (currentTaskError) throw new Error(currentTaskError.message);
    
    const currentTask = currentTaskData;
    if (!currentTask) throw new Error('Task not found');

    // Clean the updates object to handle empty strings for date fields
    const cleanedUpdates = { ...updatesWithoutExtraFields };
    if (cleanedUpdates.due_date === '') {
      cleanedUpdates.due_date = null;
    }

    const { data: updatedTaskData, error: updateError } = await supabase
      .from('kanban_tasks')
      .update(cleanedUpdates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (updateError) throw new Error(updateError.message);

    const updatedTask = updatedTaskData;

    // Create timeline entries for each change
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('./kanban-api');
      
      // Title/Description changes
      if (updates.title !== undefined && updates.title !== currentTask.title) {
        await createTaskTimeline(
          taskId,
          'updated',
          JSON.stringify({
            field: 'title',
            old_value: currentTask.title,
            new_value: updates.title
          }),
          userEmail || 'system'
        );
      }

      if (updates.description !== undefined && updates.description !== currentTask.description) {
        await createTaskTimeline(
          taskId,
          'updated',
          JSON.stringify({
            field: 'description',
            old_value: currentTask.description,
            new_value: updates.description
          }),
          userEmail || 'system'
        );
      }

      // Priority changes
      if (updates.priority !== undefined && updates.priority !== currentTask.priority) {
        await createTaskTimeline(
          taskId,
          'priority_changed',
          JSON.stringify({
            from_priority: currentTask.priority,
            to_priority: updates.priority
          }),
          userEmail || 'system'
        );
      }

      // Status changes
      if (updates.status !== undefined && updates.status !== currentTask.status) {
        await createTaskTimeline(
          taskId,
          'status_changed',
          JSON.stringify({
            from_status: currentTask.status,
            to_status: updates.status
          }),
          userEmail || 'system'
        );
      }

      // Assignment changes
      if (updates.assigned_to !== undefined && updates.assigned_to !== currentTask.assigned_to) {
        await createTaskTimeline(
          taskId,
          'assigned',
          JSON.stringify({
            from_user: currentTask.assigned_to,
            to_user: updates.assigned_to
          }),
          userEmail || 'system'
        );
      }

      // JIRA ticket linking
      if (updates.jira_ticket_key !== undefined && updates.jira_ticket_key !== currentTask.jira_ticket_key) {
        await createTaskTimeline(
          taskId,
          'linked_jira',
          JSON.stringify({
            ticket_key: updates.jira_ticket_key
          }),
          userEmail || 'system'
        );
      }

      // Column movement
      if (updates.column_id !== undefined && updates.column_id !== currentTask.column_id) {
        // Get column names for better timeline display
        const { data: fromColumnData } = await supabase
          .from('kanban_columns')
          .select('name')
          .eq('id', currentTask.column_id)
          .single();
        const { data: toColumnData } = await supabase
          .from('kanban_columns')
          .select('name')
          .eq('id', updates.column_id)
          .single();
        
        const fromColumnName = fromColumnData?.name || currentTask.column_id;
        const toColumnName = toColumnData?.name || updates.column_id;
        
        await createTaskTimeline(
          taskId,
          'moved',
          JSON.stringify({
            from_column: fromColumnName,
            to_column: toColumnName,
            from_column_id: currentTask.column_id,
            to_column_id: updates.column_id
          }),
          userEmail || 'system'
        );
      }

      // Category changes (legacy single category)
      if (updates.category_id !== undefined && updates.category_id !== currentTask.category_id) {
        // Get category names for better timeline display
        const fromCategoryName = await getCategoryName(currentTask.category_id);
        const toCategoryName = await getCategoryName(updates.category_id);
        
        await createTaskTimeline(
          taskId,
          'category_changed',
          JSON.stringify({
            from_category: fromCategoryName,
            to_category: toCategoryName,
            from_category_id: currentTask.category_id,
            to_category_id: updates.category_id
          }),
          userEmail || 'system'
        );
      }

      // Category option changes (legacy single category option)
      if (updates.category_option_id !== undefined && updates.category_option_id !== currentTask.category_option_id) {
        // Get category option names for better timeline display
        const fromOptionName = await getCategoryOptionName(currentTask.category_option_id);
        const toOptionName = await getCategoryOptionName(updates.category_option_id);
        
        await createTaskTimeline(
          taskId,
          'category_option_changed',
          JSON.stringify({
            from_option: fromOptionName,
            to_option: toOptionName,
            from_option_id: currentTask.category_option_id,
            to_option_id: updates.category_option_id
          }),
          userEmail || 'system'
        );
      }

      // Due date changes
      if (updates.due_date !== undefined && updates.due_date !== currentTask.due_date) {
        const formatDate = (dateString: string | null) => {
          if (!dateString) return 'No due date';
          try {
            return new Date(dateString).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            return dateString;
          }
        };
        
        await createTaskTimeline(
          taskId,
          'due_date_changed',
          JSON.stringify({
            from_date: formatDate(currentTask.due_date),
            to_date: formatDate(updates.due_date),
            old_value: currentTask.due_date,
            new_value: updates.due_date
          }),
          userEmail || 'system'
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
    const { data: taskToDelete, error: taskError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw new Error(taskError.message);
    
    if (!taskToDelete) throw new Error('Task not found');

    // Create timeline entry for task deletion
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('./kanban-api');
              await createTaskTimeline(
          taskId,
          'deleted',
          JSON.stringify({
            title: taskToDelete.title,
            description: taskToDelete.description,
            priority: taskToDelete.priority,
            column_id: taskToDelete.column_id
          }),
          userEmail || 'system'
        );
                // Timeline entry created
        } catch (error) {
          // Don't fail the task deletion if timeline creation fails
        }

    const { error: deleteError } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', taskId);
    
    if (deleteError) throw new Error(deleteError.message);
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
    const { data: transactionResult, error: transactionError } = await supabase.rpc('move_kanban_task_safe', {
      p_task_id: taskId,
      p_new_column_id: newColumnId,
      p_new_sort_order: newSortOrder,
      p_user_email: userEmail || 'system'
    });
    
    if (transactionError) {
      console.error('❌ Transaction error:', transactionError);
      throw new Error(transactionError.message || 'Transaction failed');
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
      const { data: currentTask, error: currentTaskError } = await supabase
        .from('kanban_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (currentTaskError) throw new Error(currentTaskError.message);
      
      if (!currentTask) throw new Error('Task not found');

      const { error: updateError } = await supabase
        .from('kanban_tasks')
        .update({
          column_id: newColumnId,
          sort_order: newSortOrder
        })
        .eq('id', taskId);
      
      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log(`✅ Fallback update successful for task ${taskId}`);
      
      // Create timeline entry for task movement
      try {
        const { createTaskTimeline } = await import('./kanban-api');
        
        // Get column names for better timeline display
        const { data: fromColumnData } = await supabase
          .from('kanban_columns')
          .select('name')
          .eq('id', currentTask.column_id)
          .single();
        const { data: toColumnData } = await supabase
          .from('kanban_columns')
          .select('name')
          .eq('id', newColumnId)
          .single();
        
        const fromColumnName = fromColumnData?.name || currentTask.column_id;
        const toColumnName = toColumnData?.name || newColumnId;
        
        await createTaskTimeline(
          taskId,
          'moved',
          JSON.stringify({
            from_column: fromColumnName,
            to_column: toColumnName,
            from_column_id: currentTask.column_id,
            to_column_id: newColumnId,
            sort_order: newSortOrder
          }),
          userEmail || 'system'
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
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        project_id: projectId,
        team_id: teamId,
        ...columnData
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return { data: data, success: true };
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
    const { data, error } = await supabase
      .from('kanban_columns')
      .update(updates)
      .eq('id', columnId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return { data: data, success: true };
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
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId);
    
    if (error) throw new Error(error.message);
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
    // Use the direct Supabase client that's already imported at the top
    console.log(`🔍 Fetching categories for project: ${projectId}`);
    
    // First, get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order');

    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
      throw new Error(categoriesError.message);
    }

    const categoriesData = categories || [];
    console.log(`✅ Found ${categoriesData.length} categories`);
    
    // If no categories found, return empty array
    if (categoriesData.length === 0) {
      console.log('⚠️ No categories found for project');
      return {
        data: [],
        success: true
      };
    }

    // Get options for all categories
    const categoryIds = categoriesData.map((cat: any) => cat.id);
    console.log(`🔍 Fetching options for ${categoryIds.length} categories`);
    
    // Use the 'in' filter like the project-options API does
    const { data: options, error: optionsError } = await supabase
      .from('category_options')
      .select('*')
      .in('category_id', categoryIds)
      .eq('is_active', true)
      .order('sort_order');

    if (optionsError) {
      console.error('❌ Error fetching options:', optionsError);
    }

    const optionsData = options || [];
    console.log(`✅ Found ${optionsData.length} options`);

    // Attach options to categories
    const categoriesWithOptions = categoriesData.map((category: any) => ({
      ...category,
      options: optionsData.filter((option: any) => option.category_id === category.id)
    }));

    console.log(`✅ Returning ${categoriesWithOptions.length} categories with options`);
    return {
      data: categoriesWithOptions,
      success: true
    };
  } catch (error) {
    console.error('❌ Error in getProjectCategoriesFromDatabase:', error);
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
