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
    // create default columns
    if (teamId && (!columnsResponse.data || columnsResponse.data.length === 0)) {
      try {
        // Call the database function to create default columns
        const createColumnsResponse = await supabaseClient.rpc('create_default_team_kanban_columns', {
          project_id_param: projectId,
          team_id_param: teamId
        });

        if (!createColumnsResponse.error) {
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
          }
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
      subcategories: [],
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
