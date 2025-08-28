// =====================================================
// KANBAN BOARD API FUNCTIONS
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Create direct Supabase client
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
    const { data, error } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
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
    const { data, error } = await supabase
      .from('project_categories')
      .insert({
        project_id: projectId,
        ...categoryData
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { data, error } = await supabase
      .from('project_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { error } = await supabase
      .from('project_categories')
      .update({ is_active: false })
      .eq('id', categoryId);

    if (error) throw new Error(error.message);

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
// CATEGORY OPTIONS API
// =====================================================

export async function getCategoryOptions(categoryId: string): Promise<ApiResponse<CategoryOption[]>> {
  try {
    const { data, error } = await supabase
      .from('category_options')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
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
    const { data, error } = await supabase
      .from('category_options')
      .insert({
        category_id: categoryId,
        ...optionData
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { data, error } = await supabase
      .from('category_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { error } = await supabase
      .from('category_options')
      .update({ is_active: false })
      .eq('id', optionId);

    if (error) throw new Error(error.message);

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
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
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
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert(columnData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { data, error } = await supabase
      .from('kanban_columns')
      .update(updates)
      .eq('id', columnId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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
    const { data: tasks, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('id')
      .eq('column_id', columnId)
      .eq('status', 'active');

    if (tasksError) throw new Error(tasksError.message);

    if (tasks && tasks.length > 0) {
      throw new Error(`Cannot delete column because it contains ${tasks.length} active task(s). Please move or delete all tasks first.`);
    }

    // Delete the column
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId);

    if (error) throw new Error(error.message);

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
    let query = supabase
      .from('kanban_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active');

    // Apply additional filters if provided
    if (filters) {
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
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
    const { data, error } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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

export async function createKanbanTask(taskData: CreateTaskForm & { project_id: string }): Promise<ApiResponse<KanbanTask>> {
  try {
    // Clean the task data - handle empty strings for date fields
    const cleanTaskData = { ...taskData };
    
    // Convert empty strings to null for date fields
    if (cleanTaskData.due_date === '') {
      cleanTaskData.due_date = null;
    }
    
    // Remove fields that shouldn't be in the database
    delete (cleanTaskData as any).categories;
    delete (cleanTaskData as any).user_email;
    delete (cleanTaskData as any).team_id;

    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert(cleanTaskData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Fetch the complete task with all details
    const { data: completeTask, error: fetchError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('id', data.id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    return {
      data: completeTask,
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

export async function updateKanbanTask(taskId: string, updates: UpdateTaskForm): Promise<ApiResponse<KanbanTask>> {
  try {
    // Get current task to check if we need to handle column changes
    const { data: currentTask, error: currentError } = await supabase
      .from('kanban_tasks')
      .select('column_id, sort_order')
      .eq('id', taskId)
      .single();

    if (currentError) throw new Error(currentError.message);

    // Clean up the updates object - handle empty strings for date fields
    const cleanedUpdates = { ...updates };
    
    // Convert empty strings to null for date fields
    if (cleanedUpdates.due_date === '') {
      cleanedUpdates.due_date = null;
    }

    const { data, error } = await supabase
      .from('kanban_tasks')
      .update(cleanedUpdates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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

export async function moveTaskInDatabase(
  taskId: string,
  fromColumnId: string,
  toColumnId: string,
  newSortOrder: number
): Promise<ApiResponse<KanbanTask>> {
  try {
    // Verify the columns exist
    const { data: fromColumn, error: fromColumnError } = await supabase
      .from('kanban_columns')
      .select('id')
      .eq('id', fromColumnId)
      .single();

    if (fromColumnError) throw new Error(`Source column not found: ${fromColumnError.message}`);

    const { data: toColumn, error: toColumnError } = await supabase
      .from('kanban_columns')
      .select('id')
      .eq('id', toColumnId)
      .single();

    if (toColumnError) throw new Error(`Destination column not found: ${toColumnError.message}`);

    // Update the task
    const { data, error } = await supabase
      .from('kanban_tasks')
      .update({
        column_id: toColumnId,
        sort_order: newSortOrder
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
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

export async function deleteKanbanTask(taskId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ status: 'archived' })
      .eq('id', taskId);

    if (error) throw new Error(error.message);

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

export async function assignTaskToUser(taskId: string, userId: string): Promise<ApiResponse<boolean>> {
  try {
    // Get current task to check if it exists
    const { data: currentTask, error: currentError } = await supabase
      .from('kanban_tasks')
      .select('id, assignee_id')
      .eq('id', taskId)
      .single();

    if (currentError) throw new Error(currentError.message);

    // Update the task assignment
    const { error } = await supabase
      .from('kanban_tasks')
      .update({
        assignee_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw new Error(error.message);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error assigning task to user:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function addTaskTimelineEntry(
  taskId: string,
  action: string,
  details: string,
  userId: string
): Promise<ApiResponse<TaskTimeline>> {
  try {
    const timelineData = {
      task_id: taskId,
      action,
      details,
      user_email: userId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('task_timeline')
      .insert(timelineData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
      success: true
    };
  } catch (error) {
    console.error('Error adding task timeline entry:', error);
    return {
      data: {} as TaskTimeline,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getTaskTimeline(taskId: string): Promise<ApiResponse<TaskTimeline[]>> {
  try {
    const { data, error } = await supabase
      .from('task_timeline')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching task timeline:', error);
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
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
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

export async function addTaskComment(
  taskId: string,
  comment: string,
  userId: string
): Promise<ApiResponse<TaskComment>> {
  try {
    const commentData = {
      task_id: taskId,
      comment,
      user_email: userId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('task_comments')
      .insert(commentData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
      success: true
    };
  } catch (error) {
    console.error('Error adding task comment:', error);
    return {
      data: {} as TaskComment,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// KANBAN BOARD COMPOSITE API
// =====================================================

export async function getKanbanBoard(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
  try {
    // Get columns
    let { data: columns, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (columnsError) throw new Error(columnsError.message);

    if (!columns || columns.length === 0) {
      // Create default columns if none exist
      const defaultColumns = [
        { name: 'To Do', description: 'Tasks to be done', color: '#3B82F6', sort_order: 0 },
        { name: 'In Progress', description: 'Tasks currently being worked on', color: '#F59E0B', sort_order: 1 },
        { name: 'Done', description: 'Completed tasks', color: '#10B981', sort_order: 2 }
      ];

      const insertPromises = defaultColumns.map(column => 
        supabase
          .from('kanban_columns')
          .insert({
            project_id: projectId,
            team_id: teamId,
            ...column
          })
          .select()
          .single()
      );

      const insertResults = await Promise.all(insertPromises);
      const insertErrors = insertResults.filter(result => result.error);
      
      if (insertErrors.length > 0) {
        throw new Error(`Failed to create default columns: ${insertErrors[0].error?.message}`);
      }

      // Fetch the newly created columns
      const { data: newColumns, error: newColumnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (newColumnsError) throw new Error(newColumnsError.message);
      columns = newColumns || [];
    }

    // Get tasks for all columns
    const { data: tasks, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    if (tasksError) throw new Error(tasksError.message);

    // Group tasks by column
    const columnsWithTasks = columns.map(column => ({
      ...column,
      tasks: tasks?.filter(task => task.column_id === column.id) || []
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

export async function getKanbanBoardWithCategories(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<{
  columns: KanbanColumnWithTasks[];
  categories: ProjectCategory[];
}>> {
  try {
    // Get the basic kanban board
    const boardResult = await getKanbanBoard(projectId, teamId);
    if (!boardResult.success) {
      return {
        data: {
          columns: [],
          categories: []
        },
        success: false,
        error: boardResult.error
      };
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categoriesError) throw new Error(categoriesError.message);

    // Get category options
    const categoryIds = categories?.map(cat => cat.id) || [];
    let options = [];
    
    if (categoryIds.length > 0) {
      const { data: optionsData, error: optionsError } = await supabase
        .from('category_options')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (optionsError) throw new Error(optionsError.message);
      options = optionsData || [];
    }

    // Attach options to categories
    const categoriesWithOptions = categories?.map(category => ({
      ...category,
      options: options.filter(option => option.category_id === category.id)
    })) || [];

    return {
      data: {
        columns: boardResult.data || [],
        categories: categoriesWithOptions
      },
      success: true
    };
  } catch (error) {
    console.error('Error fetching kanban board with categories:', error);
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
// USER AND TEAM API
// =====================================================

export async function getUserById(userId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);

    return {
      data: data,
      success: true
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      data: {},
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getTeamMembers(teamId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching team members:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getProjectAssignments(projectId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching project assignments:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getProjects(): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// SEARCH AND FILTER API
// =====================================================

export async function searchTasks(searchParams: TaskSearchParams): Promise<ApiResponse<KanbanTask[]>> {
  try {
    let query = supabase
      .from('kanban_tasks')
      .select('*')
      .eq('status', 'active');

    // Apply filters from searchParams.filters
    if (searchParams.filters) {
      if (searchParams.filters.project_id) {
        query = query.eq('project_id', searchParams.filters.project_id);
      }
      if (searchParams.filters.category_id) {
        query = query.eq('category_id', searchParams.filters.category_id);
      }
      if (searchParams.filters.assigned_to) {
        query = query.eq('assigned_to', searchParams.filters.assigned_to);
      }
      if (searchParams.filters.priority) {
        query = query.eq('priority', searchParams.filters.priority);
      }
    }

    if (searchParams.query) {
      query = query.or(`title.ilike.%${searchParams.query}%,description.ilike.%${searchParams.query}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error searching tasks:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getProjectCategoriesWithOptions(projectId: string): Promise<ApiResponse<ProjectCategory[]>> {
  try {
    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categoriesError) throw new Error(categoriesError.message);

    const categoriesData = categories || [];
    
    if (categoriesData.length === 0) {
      return {
        data: [],
        success: true
      };
    }

    // Get options for all categories
    const categoryIds = categoriesData.map(cat => cat.id);
    
    const { data: options, error: optionsError } = await supabase
      .from('category_options')
      .select('*')
      .in('category_id', categoryIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (optionsError) throw new Error(optionsError.message);

    const optionsData = options || [];

    // Attach options to categories
    const categoriesWithOptions = categoriesData.map(category => ({
      ...category,
      options: optionsData.filter(option => option.category_id === category.id)
    }));

    return {
      data: categoriesWithOptions,
      success: true
    };
  } catch (error) {
    console.error('Error fetching project categories with options:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// JIRA INTEGRATION API
// =====================================================

import { getJiraCredentials, createJiraIssue, searchJiraIssuesEnhanced } from './jira';

export async function createJiraTicket(taskId: string, jiraData: any): Promise<ApiResponse<JiraTicket>> {
  try {
    const { userEmail, projectKey, summary, description, issueType = 'Task', priority = 'Medium' } = jiraData;

    if (!userEmail || !projectKey || !summary) {
      return {
        data: {} as JiraTicket,
        success: false,
        error: 'User email, project key, and summary are required'
      };
    }

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return {
        data: {} as JiraTicket,
        success: false,
        error: 'JIRA integration not found for this user'
      };
    }

    console.log(`Creating JIRA ticket in project: ${projectKey} for user: ${userEmail}`);

    // Get the actual accountId from /rest/api/3/myself for assignment
    const myselfResponse = await fetch(`${credentials.base_url}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!myselfResponse.ok) {
      const errorText = await myselfResponse.text();
      console.error(`JIRA myself API error: ${myselfResponse.status} - ${errorText}`);
      return {
        data: {} as JiraTicket,
        success: false,
        error: `Failed to get user accountId: ${myselfResponse.status}`
      };
    }

    const userData = await myselfResponse.json();
    const accountId = userData.accountId;

    // Create the JIRA ticket
    const result = await createJiraIssue(credentials, {
      projectKey,
      summary,
      description: description || '',
      issueType,
      priority,
      assignee: accountId
    });

    if (!result.success) {
      console.error('JIRA ticket creation failed:', result.error, result.details);
      
      let userMessage = 'Failed to create JIRA ticket';
      if (result.error?.includes('401')) {
        userMessage = 'JIRA authentication failed. Please check your credentials.';
      } else if (result.error?.includes('403')) {
        userMessage = 'Access denied. Please check your JIRA permissions.';
      } else if (result.error?.includes('404')) {
        userMessage = 'JIRA project not found. Please check the project key.';
      } else if (result.error?.includes('429')) {
        userMessage = 'JIRA rate limit exceeded. Please try again in a moment.';
      } else if (result.error?.includes('Network error')) {
        userMessage = 'Network error. Please check your connection and try again.';
      }

      return {
        data: {} as JiraTicket,
        success: false,
        error: userMessage
      };
    }

    const ticket = result.data;
    console.log(`JIRA ticket created successfully: ${ticket?.key}`);

    // Convert to JiraTicket format
    const jiraTicket: JiraTicket = {
      key: ticket?.key || '',
      summary: summary,
      description: description || '',
      status: 'To Do', // Default status for new tickets
      priority: priority,
      assignee: userData.displayName || userData.emailAddress,
      reporter: userData.displayName || userData.emailAddress,
      project: projectKey,
      issue_type: issueType,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    return {
      data: jiraTicket,
      success: true
    };
  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    return {
      data: {} as JiraTicket,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function searchJiraTickets(query: string, projectKey?: string, userEmail?: string): Promise<ApiResponse<JiraSearchResult>> {
  try {
    if (!userEmail || !projectKey || !query) {
      return {
        data: {} as JiraSearchResult,
        success: false,
        error: 'User email, project key, and search query are required'
      };
    }

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return {
        data: {} as JiraSearchResult,
        success: false,
        error: 'JIRA integration not found for this user'
      };
    }

    console.log(`Searching JIRA tickets in project: ${projectKey} with term: "${query}"`);

    // Use enhanced search function
    const tickets = await searchJiraIssuesEnhanced(credentials, projectKey, query, 20);

    // Convert to JiraTicket format
    const jiraTickets: JiraTicket[] = tickets.map((ticket: any) => ({
      key: ticket.key,
      summary: ticket.fields?.summary || '',
      description: ticket.fields?.description || '',
      status: ticket.fields?.status?.name || 'Unknown',
      priority: ticket.fields?.priority?.name || 'Medium',
      assignee: ticket.fields?.assignee?.displayName || null,
      reporter: ticket.fields?.reporter?.displayName || 'Unknown',
      project: ticket.fields?.project?.name || projectKey,
      issue_type: ticket.fields?.issuetype?.name || 'Task',
      created: ticket.fields?.created || new Date().toISOString(),
      updated: ticket.fields?.updated || new Date().toISOString()
    }));

    const searchResult: JiraSearchResult = {
      issues: jiraTickets,
      total: jiraTickets.length,
      max_results: 20,
      start_at: 0
    };

    console.log(`JIRA search successful: Found ${jiraTickets.length} tickets`);

    return {
      data: searchResult,
      success: true
    };
  } catch (error) {
    console.error('Error searching Jira tickets:', error);
    return {
      data: {} as JiraSearchResult,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export async function deleteKanbanTaskFromDatabase(taskId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw new Error(error.message);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting kanban task from database:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================================================
// COMPATIBILITY FUNCTIONS
// =====================================================

export async function getKanbanBoardOptimized(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<{
  columns: KanbanColumnWithTasks[];
  categories: ProjectCategory[];
}>> {
  try {
    // Get the basic kanban board
    const boardResult = await getKanbanBoard(projectId, teamId);
    if (!boardResult.success) {
      return {
        data: {
          columns: [],
          categories: []
        },
        success: false,
        error: boardResult.error
      };
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (categoriesError) throw new Error(categoriesError.message);

    // Get category options
    const categoryIds = categories?.map(cat => cat.id) || [];
    let options = [];
    
    if (categoryIds.length > 0) {
      const { data: optionsData, error: optionsError } = await supabase
        .from('category_options')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (optionsError) throw new Error(optionsError.message);
      options = optionsData || [];
    }

    // Attach options to categories
    const categoriesWithOptions = categories?.map(category => ({
      ...category,
      options: options.filter(option => option.category_id === category.id)
    })) || [];

    return {
      data: {
        columns: boardResult.data || [],
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

export async function getUserAccessibleProjects(userEmail: string): Promise<ApiResponse<ProjectWithCategories[]>> {
  try {
    // Get user's team memberships first
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return {
        data: [],
        success: false,
        error: 'User not found'
      };
    }

    const userId = user.id;

    // Get user's team memberships
    const { data: teamMemberships, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (teamError) {
      throw new Error(teamError.message);
    }

    const teamIds = teamMemberships?.map(membership => membership.team_id) || [];

    if (teamIds.length === 0) {
      return {
        data: [],
        success: true
      };
    }

    // Get projects assigned to these teams
    const { data: projectAssignments, error: projectError } = await supabase
      .from('team_project_assignments')
      .select('project_id')
      .in('team_id', teamIds);

    if (projectError) {
      throw new Error(projectError.message);
    }

    const projectIds = projectAssignments?.map(assignment => assignment.project_id) || [];

    if (projectIds.length === 0) {
      return {
        data: [],
        success: true
      };
    }

    // Get the actual projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds);

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    // Convert to ProjectWithCategories format
    const projectsWithCategories: ProjectWithCategories[] = (projects || []).map((project: any) => ({
      ...project,
      categories: [],
      columns: []
    }));

    // Load categories and their options for each project
    for (const project of projectsWithCategories) {
      try {
        // Load categories for this project
        const { data: categories, error: categoriesError } = await supabase
          .from('project_categories')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!categoriesError && categories) {
          // Load options for all categories
          const categoryIds = categories.map((cat: any) => cat.id);
          let categoryOptions: CategoryOption[] = [];
          
          if (categoryIds.length > 0) {
            const { data: options, error: optionsError } = await supabase
              .from('category_options')
              .select('*')
              .eq('category_id', categoryIds)
              .eq('is_active', true)
              .order('sort_order', { ascending: true });

            if (!optionsError && options) {
              categoryOptions = options;
            }
          }

          // Attach options to categories
          project.categories = categories.map((category: ProjectCategory) => ({
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

// =====================================================
// LEGACY FUNCTION ALIASES
// =====================================================

export const createTaskComment = addTaskComment;
export const createTaskTimeline = addTaskTimelineEntry;
export const moveTask = moveTaskInDatabase;
export const permanentlyDeleteTask = deleteKanbanTaskFromDatabase;
