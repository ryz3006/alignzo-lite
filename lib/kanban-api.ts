// =====================================================
// KANBAN BOARD API FUNCTIONS
// =====================================================

import { supabaseClient } from './supabase-client';
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
// PROJECT CATEGORIES API
// =====================================================

export async function getProjectCategories(projectId: string): Promise<ApiResponse<ProjectCategory[]>> {
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
    console.error('Error fetching project categories:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createProjectCategory(
  projectId: string, 
  categoryData: CreateCategoryForm
): Promise<ApiResponse<ProjectCategory>> {
  try {
    const response = await supabaseClient.insert('project_categories', {
      project_id: projectId,
      ...categoryData
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating project category:', error);
    return {
      data: {} as ProjectCategory,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateProjectCategory(
  categoryId: string, 
  updates: Partial<CreateCategoryForm>
): Promise<ApiResponse<ProjectCategory>> {
  try {
    const response = await supabaseClient.update('project_categories', categoryId, updates);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error updating project category:', error);
    return {
      data: {} as ProjectCategory,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteProjectCategory(categoryId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.update('project_categories', categoryId, { is_active: false });

    if (response.error) throw new Error(response.error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting project category:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// PROJECT SUBCATEGORIES API
// =====================================================

export async function getCategoryOptions(categoryId: string): Promise<ApiResponse<CategoryOption[]>> {
  try {
    const response = await supabaseClient.get('category_options', {
      select: '*',
      filters: {
        category_id: categoryId,
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
    console.error('Error fetching category options:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createCategoryOption(
  categoryId: string, 
  optionData: { option_name: string; option_value: string; sort_order?: number }
): Promise<ApiResponse<CategoryOption>> {
  try {
    const response = await supabaseClient.insert('category_options', {
      category_id: categoryId,
      ...optionData
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating category option:', error);
    return {
      data: {} as CategoryOption,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateCategoryOption(
  optionId: string, 
  updates: Partial<{ option_name: string; option_value: string; sort_order: number }>
): Promise<ApiResponse<CategoryOption>> {
  try {
    const response = await supabaseClient.update('category_options', optionId, updates);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error updating category option:', error);
    return {
      data: {} as CategoryOption,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteCategoryOption(optionId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.update('category_options', optionId, { is_active: false });

    if (response.error) throw new Error(response.error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting category option:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// KANBAN COLUMNS API
// =====================================================

export async function getKanbanColumns(projectId: string): Promise<ApiResponse<KanbanColumn[]>> {
  try {
    const response = await supabaseClient.get('kanban_columns', {
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
    console.error('Error fetching kanban columns:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createKanbanColumn(columnData: CreateColumnForm & { project_id: string; team_id?: string }): Promise<ApiResponse<KanbanColumn>> {
  try {
    const response = await supabaseClient.insert('kanban_columns', columnData);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating kanban column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateKanbanColumn(
  columnId: string,
  updates: { name: string; description?: string; color: string; sort_order?: number }
): Promise<ApiResponse<KanbanColumn>> {
  try {
    const response = await supabaseClient.update('kanban_columns', columnId, updates);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error updating kanban column:', error);
    return {
      data: {} as KanbanColumn,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteKanbanColumn(columnId: string): Promise<ApiResponse<boolean>> {
  try {
    // First check if there are any tasks in this column
    const tasksResponse = await supabaseClient.get('kanban_tasks', {
      select: 'id',
      filters: { column_id: columnId, status: 'active' }
    });

    if (tasksResponse.error) throw new Error(tasksResponse.error);

    if (tasksResponse.data && tasksResponse.data.length > 0) {
      throw new Error(`Cannot delete column because it contains ${tasksResponse.data.length} active task(s). Please move or delete all tasks first.`);
    }

    // Delete the column
    const response = await supabaseClient.delete('kanban_columns', columnId);

    if (response.error) throw new Error(response.error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting kanban column:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// KANBAN TASKS API
// =====================================================

export async function getKanbanTasks(projectId: string, filters?: TaskFilters): Promise<ApiResponse<KanbanTask[]>> {
  try {
    const baseFilters = {
      project_id: projectId,
      status: 'active'
    };

    const response = await supabaseClient.get('kanban_tasks', {
      select: '*',
      filters: { ...baseFilters, ...filters },
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
    console.error('Error fetching kanban tasks:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getKanbanTask(taskId: string): Promise<ApiResponse<KanbanTask>> {
  try {
    const response = await supabaseClient.get('kanban_tasks', {
      select: '*',
      filters: { id: taskId }
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data?.[0] || {} as KanbanTask,
      success: true
    };
  } catch (error) {
    console.error('Error fetching kanban task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createKanbanTask(taskData: CreateTaskForm): Promise<ApiResponse<KanbanTask>> {
  try {
    // Remove team_id from taskData as kanban_tasks table doesn't have this column
    const { team_id, ...taskDataWithoutTeamId } = taskData as any;
    
    // Clean the task data to handle empty strings for date fields
    if (taskDataWithoutTeamId.due_date === '') {
      taskDataWithoutTeamId.due_date = null;
    }
    
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
        await createTaskTimeline(
          createdTask.id,
          taskData.created_by || 'system',
          'created',
          timelineDetails
        );
      } catch (error) {
        // Don't fail the task creation if timeline creation fails
      }
    }

    return {
      data: createdTask || {} as KanbanTask,
      success: true
    };
  } catch (error) {
    console.error('Error creating kanban task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateKanbanTask(
  taskId: string, 
  updates: UpdateTaskForm,
  userEmail?: string
): Promise<ApiResponse<KanbanTask>> {
  try {
    // Get the current task to compare changes
    const currentTaskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (currentTaskResponse.error) throw new Error(currentTaskResponse.error);
    
    const currentTask = currentTaskResponse.data?.[0];
    if (!currentTask) throw new Error('Task not found');

    // Clean the updates object to handle empty strings for date fields
    const cleanedUpdates = { ...updates };
    if (cleanedUpdates.due_date === '') {
      cleanedUpdates.due_date = null;
    }

    const response = await supabaseClient.update('kanban_tasks', taskId, cleanedUpdates);

    if (response.error) throw new Error(response.error);

    const updatedTask = response.data;

    // Create timeline entries for each change
    if (userEmail) {
      // Title/Description changes
      if (updates.title !== undefined && updates.title !== currentTask.title) {
        await createTaskTimeline(
          taskId,
          userEmail,
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
          userEmail,
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
          userEmail,
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
          userEmail,
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
          userEmail,
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
          userEmail,
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
          userEmail,
          'moved',
          {
            from_column: currentTask.column_id,
            to_column: updates.column_id,
            from_column_name: fromColumnName,
            to_column_name: toColumnName
          }
        );
      }

      // Due date changes
      if (updates.due_date !== undefined && updates.due_date !== currentTask.due_date) {
        await createTaskTimeline(
          taskId,
          userEmail,
          'updated',
          {
            field: 'due_date',
            old_value: currentTask.due_date,
            new_value: updates.due_date
          }
        );
      }

      // Estimated hours changes
      if (updates.estimated_hours !== undefined && updates.estimated_hours !== currentTask.estimated_hours) {
        await createTaskTimeline(
          taskId,
          userEmail,
          'updated',
          {
            field: 'estimated_hours',
            old_value: currentTask.estimated_hours,
            new_value: updates.estimated_hours
          }
        );
      }

      // Actual hours changes
      if (updates.actual_hours !== undefined && updates.actual_hours !== currentTask.actual_hours) {
        await createTaskTimeline(
          taskId,
          userEmail,
          'updated',
          {
            field: 'actual_hours',
            old_value: currentTask.actual_hours,
            new_value: updates.actual_hours
          }
        );
      }
    }

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error updating kanban task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteKanbanTask(taskId: string, userEmail?: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.update('kanban_tasks', taskId, { status: 'archived' });

    if (response.error) throw new Error(response.error);

    // Create timeline entry for task deletion
    if (userEmail) {
      await createTaskTimeline(
        taskId,
        userEmail,
        'archived',
        {
          action: 'Task archived'
        }
      );
    }

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting kanban task:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function moveTask(
  taskId: string, 
  columnId: string, 
  sortOrder: number,
  userEmail?: string
): Promise<ApiResponse<KanbanTask>> {
  try {
    // Get current task data to record the move
    const currentTaskResponse = await supabaseClient.get('kanban_tasks', {
      filters: { id: taskId }
    });

    if (currentTaskResponse.error) throw new Error(currentTaskResponse.error);
    
    const currentTask = currentTaskResponse.data?.[0];
    if (!currentTask) throw new Error('Task not found');

    const response = await supabaseClient.update('kanban_tasks', taskId, {
      column_id: columnId,
      sort_order: sortOrder
    });

    if (response.error) throw new Error(response.error);

    // Create timeline entry for task move
    if (userEmail && currentTask.column_id !== columnId) {
      // Get column names for better timeline display
      const fromColumnResponse = await supabaseClient.get('kanban_columns', {
        filters: { id: currentTask.column_id }
      });
      const toColumnResponse = await supabaseClient.get('kanban_columns', {
        filters: { id: columnId }
      });
      
      const fromColumnName = fromColumnResponse.data?.[0]?.name || currentTask.column_id;
      const toColumnName = toColumnResponse.data?.[0]?.name || columnId;
      
      await createTaskTimeline(
        taskId,
        userEmail,
        'moved',
        {
          from_column: currentTask.column_id,
          to_column: columnId,
          from_column_name: fromColumnName,
          to_column_name: toColumnName,
          sort_order: sortOrder
        }
      );
    }

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error moving task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// TASK ASSIGNMENTS API
// =====================================================

export async function createTaskAssignment(
  taskId: string,
  assignedTo: string,
  assignedBy: string,
  notes?: string
): Promise<ApiResponse<TaskAssignment>> {
  try {
    const response = await supabaseClient.insert('task_assignments', {
      task_id: taskId,
      assigned_to: assignedTo,
      assigned_by: assignedBy,
      notes
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating task assignment:', error);
    return {
      data: {} as TaskAssignment,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// TASK TIMELINE API
// =====================================================

export async function createTaskTimeline(
  taskId: string,
  userEmail: string,
  action: string,
  details?: any
): Promise<ApiResponse<TaskTimeline>> {
  try {
    const timelineData = {
      task_id: taskId,
      user_email: userEmail,
      action,
      details
    };
    
    const response = await supabaseClient.insert('task_timeline', timelineData);

    if (response.error) {
      throw new Error(response.error);
    }

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating task timeline entry:', error);
    return {
      data: {} as TaskTimeline,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getTaskTimeline(taskId: string): Promise<ApiResponse<TaskTimeline[]>> {
  try {
    console.log(`[DEBUG] getTaskTimeline called with taskId: ${taskId}`);
    
    const queryOptions = {
      select: '*',
      filters: { task_id: taskId },
      order: {
        column: 'created_at',
        ascending: false
      }
    };
    
    console.log(`[DEBUG] Fetching timeline data with options:`, JSON.stringify(queryOptions));
    
    const response = await supabaseClient.get('task_timeline', queryOptions);

    if (response.error) {
      console.error(`[DEBUG] Error fetching timeline data:`, response.error);
      throw new Error(response.error);
    }

    console.log(`[DEBUG] Raw timeline data fetched, count: ${response.data?.length || 0}`);

    const timelineData = response.data || [];

    // Process timeline entries to resolve category names
    console.log(`[DEBUG] Starting category resolution for ${timelineData.length} timeline entries`);
    
    const processedTimeline = await Promise.all(
      timelineData.map(async (entry: any, index: number) => {
        console.log(`[DEBUG] Processing entry ${index + 1}/${timelineData.length}: action=${entry.action}`);
        
        // If this is a categories_updated action and has category_details, resolve the names
        if (entry.action === 'categories_updated' && entry.details?.category_details) {
          console.log(`[DEBUG] Found categories_updated entry with ${entry.details.category_details.length} category details`);
          
          const resolvedCategoryDetails = await Promise.all(
            entry.details.category_details.map(async (catDetail: any, catIndex: number) => {
              console.log(`[DEBUG] Resolving category detail ${catIndex + 1}: categoryName=${catDetail.categoryName}, optionName=${catDetail.optionName}`);
              
              try {
                // Use direct Supabase client for better reliability
                const { createClient } = require('@supabase/supabase-js');
                const supabaseUrl = process.env.SUPABASE_URL;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                
                console.log(`[DEBUG] Supabase URL available: ${!!supabaseUrl}, Service Key available: ${!!supabaseServiceKey}`);
                
                if (!supabaseUrl || !supabaseServiceKey) {
                  console.warn(`[DEBUG] Supabase environment variables not available for category resolution`);
                  return catDetail;
                }
                
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                
                // Resolve category name
                console.log(`[DEBUG] Fetching category name for ID: ${catDetail.categoryName}`);
                const { data: categoryData, error: categoryError } = await supabase
                  .from('project_categories')
                  .select('name')
                  .eq('id', catDetail.categoryName)
                  .single();
                
                if (categoryError) {
                  console.warn(`[DEBUG] Error fetching category name for ${catDetail.categoryName}:`, categoryError);
                  // Check if it's a "not found" error
                  if (categoryError.code === 'PGRST116') {
                    console.warn(`[DEBUG] Category ${catDetail.categoryName} not found in database - likely deleted or from different project`);
                  }
                } else {
                  console.log(`[DEBUG] Category name resolved: ${categoryData?.name || 'NOT_FOUND'}`);
                }
                
                const resolvedCategoryName = categoryData?.name || `[Deleted Category: ${catDetail.categoryName.substring(0, 8)}...]`;
                
                // Resolve option name if it exists and is different from category name
                let resolvedOptionName = catDetail.optionName;
                if (catDetail.optionName && catDetail.optionName !== catDetail.categoryName) {
                  console.log(`[DEBUG] Fetching option name for ID: ${catDetail.optionName}`);
                  const { data: optionData, error: optionError } = await supabase
                    .from('category_options')
                    .select('option_name')
                    .eq('id', catDetail.optionName)
                    .single();
                  
                  if (optionError) {
                    console.warn(`[DEBUG] Error fetching option name for ${catDetail.optionName}:`, optionError);
                    // Check if it's a "not found" error
                    if (optionError.code === 'PGRST116') {
                      console.warn(`[DEBUG] Option ${catDetail.optionName} not found in database - likely deleted or from different project`);
                    }
                  } else {
                    console.log(`[DEBUG] Option name resolved: ${optionData?.option_name || 'NOT_FOUND'}`);
                  }
                  
                  resolvedOptionName = optionData?.option_name || `[Deleted Option: ${catDetail.optionName.substring(0, 8)}...]`;
                }
                
                const result = {
                  ...catDetail,
                  categoryName: resolvedCategoryName,
                  optionName: resolvedOptionName,
                  displayText: resolvedOptionName ? `${resolvedCategoryName}: ${resolvedOptionName}` : resolvedCategoryName
                };
                
                console.log(`[DEBUG] Final resolved category detail:`, {
                  originalCategoryName: catDetail.categoryName,
                  resolvedCategoryName: result.categoryName,
                  originalOptionName: catDetail.optionName,
                  resolvedOptionName: result.optionName,
                  displayText: result.displayText
                });
                
                return result;
              } catch (error) {
                console.warn(`[DEBUG] Error resolving category names for timeline entry ${entry.id}:`, error);
                return catDetail; // Return original if resolution fails
              }
            })
          );
          
          const result = {
            ...entry,
            details: {
              ...entry.details,
              category_details: resolvedCategoryDetails
            }
          };
          
          console.log(`[DEBUG] Final processed entry with ${resolvedCategoryDetails.length} resolved categories`);
          return result;
        }
        
        console.log(`[DEBUG] Entry ${index + 1} is not a categories_updated action, returning as-is`);
        return entry;
      })
    );

    console.log(`[DEBUG] Timeline processing complete, returning ${processedTimeline.length} entries`);

    return {
      data: processedTimeline,
      success: true
    };
  } catch (error) {
    console.error(`[DEBUG] Error in getTaskTimeline:`, error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// TASK COMMENTS API
// =====================================================

export async function getTaskComments(taskId: string): Promise<ApiResponse<TaskComment[]>> {
  try {
    const response = await supabaseClient.get('task_comments', {
      select: '*',
      filters: { task_id: taskId },
      order: {
        column: 'created_at',
        ascending: true
      }
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createTaskComment(
  taskId: string,
  userEmail: string,
  comment: string
): Promise<ApiResponse<TaskComment>> {
  try {
    const commentData = {
      task_id: taskId,
      user_email: userEmail,
      comment: comment.trim()
    };
    
    const response = await supabaseClient.insert('task_comments', commentData);

    if (response.error) {
      throw new Error(response.error);
    }

    // Create timeline entry for comment
    await createTaskTimeline(
      taskId,
      userEmail,
      'commented',
      {
        comment_id: response.data?.[0]?.id,
        comment_preview: comment.trim().substring(0, 50) + (comment.trim().length > 50 ? '...' : '')
      }
    );

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating task comment:', error);
    return {
      data: {} as TaskComment,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// JIRA INTEGRATION API
// =====================================================

export async function searchJiraTickets(
  query: string, 
  projectKey?: string
): Promise<ApiResponse<JiraTicket[]>> {
  try {
    // This would integrate with your existing JIRA API
    // For now, returning mock data
    const mockResults: JiraTicket[] = [
      {
        key: 'PROJ-123',
        summary: 'Sample JIRA ticket',
        description: 'This is a sample JIRA ticket description',
        status: 'To Do',
        priority: 'Medium',
        assignee: 'user@example.com',
        reporter: 'admin@example.com',
        project: 'Sample Project',
        issue_type: 'Task',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      {
        key: 'PROJ-124',
        summary: 'Another sample ticket',
        description: 'Another sample JIRA ticket description',
        status: 'In Progress',
        priority: 'High',
        assignee: 'user2@example.com',
        reporter: 'admin@example.com',
        project: 'Sample Project',
        issue_type: 'Bug',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    ];

    return {
      data: mockResults,
      success: true
    };
  } catch (error) {
    console.error('Error searching JIRA tickets:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// KANBAN BOARD API
// =====================================================

export async function getKanbanBoard(projectId: string, teamId?: string): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
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

    // If no columns exist for this team-project combination and teamId is provided,
    // create default columns manually instead of using RPC
    if (teamId && (!columnsResponse.data || columnsResponse.data.length === 0)) {
      try {
        console.log('Creating default columns for project:', projectId, 'team:', teamId);
        
        // Create default columns manually
        const defaultColumns = [
          { name: 'To Do', description: 'Tasks that need to be started', color: '#6B7280', sort_order: 1 },
          { name: 'In Progress', description: 'Tasks currently being worked on', color: '#3B82F6', sort_order: 2 },
          { name: 'Review', description: 'Tasks ready for review', color: '#F59E0B', sort_order: 3 },
          { name: 'Done', description: 'Completed tasks', color: '#10B981', sort_order: 4 }
        ];

        // Insert each default column
        for (const columnData of defaultColumns) {
          const insertResponse = await supabaseClient.insert('kanban_columns', {
            project_id: projectId,
            team_id: teamId,
            ...columnData,
            is_active: true
          });

          if (insertResponse.error) {
            console.error('Error inserting default column:', insertResponse.error);
          }
        }

        // Fetch the newly created columns
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
          console.log('Default columns created successfully:', newColumnsResponse.data);
        }
      } catch (createError) {
        console.error('Error creating default columns:', createError);
        // Continue with empty columns if creation fails
      }
    }

    // Get tasks for the project with team filtering
    const taskFilters: any = {
      project_id: projectId,
      status: 'active'
    };

    // If team is specified, only show project/team scope tasks
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
      tasks: (tasksResponse.data || []).filter((task: KanbanTask) => task.column_id === column.id)
    }));

    return {
      data: columnsWithTasks,
      success: true
    };
  } catch (error) {
    console.error('Error fetching kanban board:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// OPTIMIZED KANBAN BOARD API - SINGLE CALL
// =====================================================

export async function getKanbanBoardOptimized(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<{
  columns: KanbanColumnWithTasks[];
  categories: ProjectCategory[];
}>> {
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

    // If no columns exist for this team-project combination and teamId is provided,
    // create default columns manually instead of using RPC
    if (teamId && (!columnsResponse.data || columnsResponse.data.length === 0)) {
      try {
        console.log('Creating default columns for project:', projectId, 'team:', teamId);
        
        // Create default columns manually
        const defaultColumns = [
          { name: 'To Do', description: 'Tasks that need to be started', color: '#6B7280', sort_order: 1 },
          { name: 'In Progress', description: 'Tasks currently being worked on', color: '#3B82F6', sort_order: 2 },
          { name: 'Review', description: 'Tasks ready for review', color: '#F59E0B', sort_order: 3 },
          { name: 'Done', description: 'Completed tasks', color: '#10B981', sort_order: 4 }
        ];

        // Insert each default column
        for (const columnData of defaultColumns) {
          const insertResponse = await supabaseClient.insert('kanban_columns', {
            project_id: projectId,
            team_id: teamId,
            ...columnData,
            is_active: true
          });

          if (insertResponse.error) {
            console.error('Error inserting default column:', insertResponse.error);
          }
        }

        // Fetch the newly created columns
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
          console.log('Default columns created successfully:', newColumnsResponse.data);
        }
      } catch (createError) {
        console.error('Error creating default columns:', createError);
        // Continue with empty columns if creation fails
      }
    }

    // Get tasks for the project with team filtering
    const taskFilters: any = {
      project_id: projectId,
      status: 'active'
    };

    // If team is specified, only show project/team scope tasks
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

    // Get categories for the project
    const categoriesResponse = await supabaseClient.get('project_categories', {
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

    if (categoriesResponse.error) throw new Error(categoriesResponse.error);

    // Get category options for all categories
    const categoryIds = (categoriesResponse.data || []).map((cat: any) => cat.id);
    let categoryOptions: CategoryOption[] = [];
    
    if (categoryIds.length > 0) {
      const optionsResponse = await supabaseClient.get('category_options', {
        select: '*',
        filters: {
          category_id: categoryIds,
          is_active: true
        },
        order: {
          column: 'sort_order',
          ascending: true
        }
      });

      if (optionsResponse.error) {
        console.warn('Error fetching category options:', optionsResponse.error);
        // Don't fail the entire request if options fail
      } else {
        categoryOptions = optionsResponse.data || [];
      }
    }

    // Attach options to categories
    const categoriesWithOptions = (categoriesResponse.data || []).map((category: ProjectCategory) => ({
      ...category,
      options: categoryOptions.filter((option: CategoryOption) => option.category_id === category.id)
    }));

    // Group tasks by column
    const columnsWithTasks: KanbanColumnWithTasks[] = (columnsResponse.data || []).map((column: KanbanColumn) => ({
      ...column,
      tasks: (tasksResponse.data || []).filter((task: KanbanTask) => task.column_id === column.id)
    }));

    return {
      data: {
        columns: columnsWithTasks,
        categories: categoriesWithOptions
      },
      success: true
    };
  } catch (error) {
    console.error('Error fetching optimized kanban board:', error);
    return {
      data: {
        columns: [],
        categories: []
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export async function getUserAccessibleProjects(userEmail: string): Promise<ApiResponse<ProjectWithCategories[]>> {
  try {
    // Get user's team memberships first
    const userResponse = await supabaseClient.get('users', {
      select: 'id',
      filters: { email: userEmail }
    });

    if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
      return {
        data: [],
        success: false,
        error: 'User not found'
      };
    }

    const userId = userResponse.data[0].id;

    // Get user's team memberships
    const teamMembershipsResponse = await supabaseClient.get('team_members', {
      select: 'team_id',
      filters: { user_id: userId }
    });

    if (teamMembershipsResponse.error) {
      throw new Error(teamMembershipsResponse.error);
    }

    const teamIds = teamMembershipsResponse.data?.map((membership: any) => membership.team_id) || [];

    if (teamIds.length === 0) {
      return {
        data: [],
        success: true
      };
    }

    // Get projects assigned to these teams
    const projectAssignmentsResponse = await supabaseClient.query({
      table: 'team_project_assignments',
      action: 'select',
      select: 'project_id',
      filters: { team_id: teamIds }
    });

    if (projectAssignmentsResponse.error) {
      throw new Error(projectAssignmentsResponse.error);
    }

    const projectIds = projectAssignmentsResponse.data?.map((assignment: any) => assignment.project_id) || [];

    if (projectIds.length === 0) {
      return {
        data: [],
        success: true
      };
    }

    // Get the actual projects
    const projectsResponse = await supabaseClient.query({
      table: 'projects',
      action: 'select',
      select: '*',
      filters: { id: projectIds }
    });

    if (projectsResponse.error) {
      throw new Error(projectsResponse.error);
    }

    // Convert to ProjectWithCategories format
    const projectsWithCategories: ProjectWithCategories[] = (projectsResponse.data || []).map((project: any) => ({
      ...project,
      categories: [],
      columns: []
    }));

    // Load categories and their options for each project
    for (const project of projectsWithCategories) {
      try {
        // Load categories for this project
        const categoriesResponse = await supabaseClient.get('project_categories', {
          select: '*',
          filters: { project_id: project.id, is_active: true },
          order: { column: 'sort_order', ascending: true }
        });

        if (!categoriesResponse.error && categoriesResponse.data) {
          // Load options for all categories
          const categoryIds = categoriesResponse.data.map((cat: any) => cat.id);
          let categoryOptions: CategoryOption[] = [];
          
          if (categoryIds.length > 0) {
            const optionsResponse = await supabaseClient.get('category_options', {
              select: '*',
              filters: { category_id: categoryIds, is_active: true },
              order: { column: 'sort_order', ascending: true }
            });

            if (!optionsResponse.error && optionsResponse.data) {
              categoryOptions = optionsResponse.data;
            }
          }

          // Attach options to categories
          project.categories = categoriesResponse.data.map((category: ProjectCategory) => ({
            ...category,
            options: categoryOptions.filter((option: CategoryOption) => option.category_id === category.id)
          }));
        }
      } catch (error) {
        console.warn('Error loading categories for project:', project.id, error);
      }
    }

    return {
      data: projectsWithCategories,
      success: true
    };
  } catch (error) {
    console.error('Error fetching user accessible projects:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getProjectWithCategories(projectId: string): Promise<ApiResponse<ProjectWithCategories>> {
  try {
    // This would need to be implemented to fetch project with its categories, subcategories, and columns
    // For now, returning empty object
    return {
      data: {} as ProjectWithCategories,
      success: true
    };
  } catch (error) {
    console.error('Error fetching project with categories:', error);
    return {
      data: {} as ProjectWithCategories,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function permanentlyDeleteTask(taskId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.delete('kanban_tasks', taskId);

    if (response.error) throw new Error(response.error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error permanently deleting task:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
