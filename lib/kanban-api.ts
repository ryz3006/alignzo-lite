// =====================================================
// KANBAN BOARD API FUNCTIONS
// =====================================================

import { supabaseClient } from './supabase-client';
import { 
  ProjectCategory, 
  ProjectSubcategory, 
  KanbanColumn, 
  KanbanTask, 
  KanbanTaskWithDetails,
  KanbanColumnWithTasks,
  ProjectWithCategories,
  CreateTaskForm,
  UpdateTaskForm,
  CreateCategoryForm,
  CreateSubcategoryForm,
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

export async function getProjectSubcategories(categoryId: string): Promise<ApiResponse<ProjectSubcategory[]>> {
  try {
    const response = await supabaseClient.get('project_subcategories', {
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
    console.error('Error fetching project subcategories:', error);
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function createProjectSubcategory(
  categoryId: string, 
  subcategoryData: CreateSubcategoryForm
): Promise<ApiResponse<ProjectSubcategory>> {
  try {
    const response = await supabaseClient.insert('project_subcategories', {
      category_id: categoryId,
      ...subcategoryData
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error creating project subcategory:', error);
    return {
      data: {} as ProjectSubcategory,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updateProjectSubcategory(
  subcategoryId: string, 
  updates: Partial<CreateSubcategoryForm>
): Promise<ApiResponse<ProjectSubcategory>> {
  try {
    const response = await supabaseClient.update('project_subcategories', subcategoryId, updates);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
      success: true
    };
  } catch (error) {
    console.error('Error updating project subcategory:', error);
    return {
      data: {} as ProjectSubcategory,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deleteProjectSubcategory(subcategoryId: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await supabaseClient.update('project_subcategories', subcategoryId, { is_active: false });

    if (response.error) throw new Error(response.error);

    return {
      data: true,
      success: true
    };
  } catch (error) {
    console.error('Error deleting project subcategory:', error);
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

export async function createKanbanColumn(
  projectId: string, 
  columnData: CreateColumnForm
): Promise<ApiResponse<KanbanColumn>> {
  try {
    const response = await supabaseClient.insert('kanban_columns', {
      project_id: projectId,
      ...columnData
    });

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
  updates: Partial<CreateColumnForm>
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
    const response = await supabaseClient.update('kanban_columns', columnId, { is_active: false });

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
    const response = await supabaseClient.insert('kanban_tasks', taskData);

    if (response.error) throw new Error(response.error);

    return {
      data: response.data,
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
  updates: UpdateTaskForm
): Promise<ApiResponse<KanbanTask>> {
  try {
    const response = await supabaseClient.update('kanban_tasks', taskId, updates);

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

export async function moveTask(
  taskId: string, 
  columnId: string, 
  sortOrder: number
): Promise<ApiResponse<KanbanTask>> {
  try {
    const response = await supabaseClient.update('kanban_tasks', taskId, {
      column_id: columnId,
      sort_order: sortOrder
    });

    if (response.error) throw new Error(response.error);

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
    const response = await supabaseClient.insert('task_timeline', {
      task_id: taskId,
      user_email: userEmail,
      action,
      details
    });

    if (response.error) throw new Error(response.error);

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
    const response = await supabaseClient.get('task_timeline', {
      select: '*',
      filters: { task_id: taskId },
      order: {
        column: 'created_at',
        ascending: false
      }
    });

    if (response.error) throw new Error(response.error);

    return {
      data: response.data || [],
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
    const response = await supabaseClient.insert('task_comments', {
      task_id: taskId,
      user_email: userEmail,
      comment
    });

    if (response.error) throw new Error(response.error);

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

export async function getKanbanBoard(projectId: string): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
  try {
    // Get columns for the project
    const columnsResponse = await supabaseClient.get('kanban_columns', {
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

    if (columnsResponse.error) throw new Error(columnsResponse.error);

    // Get tasks for the project
    const tasksResponse = await supabaseClient.get('kanban_tasks', {
      select: '*',
      filters: {
        project_id: projectId,
        status: 'active'
      },
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
// UTILITY FUNCTIONS
// =====================================================

export async function getUserAccessibleProjects(userEmail: string): Promise<ApiResponse<ProjectWithCategories[]>> {
  try {
    // This would need to be implemented based on your existing project access logic
    // For now, returning empty array
    return {
      data: [],
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
