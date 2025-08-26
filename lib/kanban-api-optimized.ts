// =====================================================
// OPTIMIZED KANBAN BOARD API FUNCTIONS
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
  ApiResponse
} from './kanban-types';

// =====================================================
// OPTIMIZED KANBAN BOARD API
// =====================================================

export async function getKanbanBoardOptimized(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<{
  columns: KanbanColumnWithTasks[];
  categories: ProjectCategory[];
}>> {
  try {
    // Use the optimized database function
    const { data, error } = await supabaseClient.rpc('get_kanban_board_optimized', {
      project_uuid: projectId,
      team_uuid: teamId || null
    });

    if (error) {
      console.error('Error calling get_kanban_board_optimized:', error);
      throw new Error(error);
    }

    // Parse the JSON result
    const parsedData = data ? JSON.parse(data) : { columns: [], categories: [] };

    return {
      data: {
        columns: parsedData.columns || [],
        categories: parsedData.categories || []
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

export async function getProjectCategoriesOptimized(projectId: string): Promise<ApiResponse<ProjectCategory[]>> {
  try {
    const { data, error } = await supabaseClient.rpc('get_project_categories_with_options', {
      project_uuid: projectId
    });

    if (error) {
      console.error('Error calling get_project_categories_with_options:', error);
      throw new Error(error);
    }

    // Parse the JSON result
    const categories = data ? JSON.parse(data) : [];

    return {
      data: categories,
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

export async function getUserAccessibleProjectsOptimized(userEmail: string): Promise<ApiResponse<ProjectWithCategories[]>> {
  try {
    const { data, error } = await supabaseClient.rpc('get_user_accessible_projects_optimized', {
      user_email_param: userEmail
    });

    if (error) {
      console.error('Error calling get_user_accessible_projects_optimized:', error);
      throw new Error(error);
    }

    // Parse the JSON result
    const projects = data ? JSON.parse(data) : [];

    // Convert to ProjectWithCategories format
    const projectsWithCategories: ProjectWithCategories[] = projects.map((project: any) => ({
      ...project,
      categories: [],
      columns: []
    }));

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
// OPTIMIZED TASK OPERATIONS
// =====================================================

export async function createKanbanTaskOptimized(taskData: CreateTaskForm): Promise<ApiResponse<KanbanTask>> {
  try {
    const { data, error } = await supabaseClient.rpc('create_kanban_task_optimized', {
      task_data: JSON.stringify(taskData),
      user_email_param: taskData.created_by
    });

    if (error) {
      console.error('Error calling create_kanban_task_optimized:', error);
      throw new Error(error);
    }

    // Parse the JSON result
    const result = data ? JSON.parse(data) : {};

    if (result.success) {
      return {
        data: {} as KanbanTask, // The function doesn't return the full task object
        success: true
      };
    } else {
      throw new Error(result.message || 'Failed to create task');
    }
  } catch (error) {
    console.error('Error creating kanban task:', error);
    return {
      data: {} as KanbanTask,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function moveTaskOptimized(
  taskId: string, 
  columnId: string, 
  sortOrder: number,
  userEmail: string
): Promise<ApiResponse<KanbanTask>> {
  try {
    const { data, error } = await supabaseClient.rpc('move_kanban_task_optimized', {
      task_uuid: taskId,
      new_column_uuid: columnId,
      new_sort_order: sortOrder,
      user_email_param: userEmail
    });

    if (error) {
      console.error('Error calling move_kanban_task_optimized:', error);
      throw new Error(error);
    }

    // Parse the JSON result
    const result = data ? JSON.parse(data) : {};

    if (result.success) {
      return {
        data: {} as KanbanTask, // The function doesn't return the full task object
        success: true
      };
    } else {
      throw new Error(result.message || 'Failed to move task');
    }
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
// CATEGORY MANAGEMENT API
// =====================================================

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
// COLUMN MANAGEMENT API
// =====================================================

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

// =====================================================
// TASK MANAGEMENT API (Fallback to original methods)
// =====================================================

export async function updateKanbanTask(
  taskId: string, 
  updates: UpdateTaskForm
): Promise<ApiResponse<KanbanTask>> {
  try {
    // Filter out team_id as it doesn't exist in kanban_tasks table
    const { team_id, ...updatesWithoutTeamId } = updates as any;
    
    const response = await supabaseClient.update('kanban_tasks', taskId, updatesWithoutTeamId);

    if (response.error) throw new Error(response.error);

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

export async function deleteKanbanTask(taskId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.update('kanban_tasks', taskId, { status: 'archived' });

    if (response.error) throw new Error(response.error);

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

// =====================================================
// CACHE MANAGEMENT
// =====================================================

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setCachedData<T>(key: string, data: T, ttl: number = 30000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of Array.from(cache.keys())) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

export async function getPerformanceMetrics(): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabaseClient.query({
      table: 'kanban_performance_metrics',
      action: 'select',
      select: '*'
    });

    if (error) throw new Error(error);

    return {
      data: data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function refreshProjectStats(): Promise<ApiResponse<boolean>> {
  try {
    const { data, error } = await supabaseClient.rpc('refresh_project_kanban_stats');

    if (error) throw new Error(error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error refreshing project stats:', error);
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
