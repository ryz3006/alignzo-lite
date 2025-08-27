// Client-safe API wrapper for Kanban operations
// This file provides functions that can be safely imported in client components
// without causing build errors related to Node.js modules

import { 
  KanbanColumnWithTasks, 
  CreateTaskForm, 
  UpdateTaskForm, 
  CreateColumnForm,
  ProjectCategory,
  ApiResponse 
} from './kanban-types';

// Base API URL
const API_BASE = '/api/kanban';

/**
 * Get Kanban board data with Redis caching
 */
export async function getKanbanBoardWithRedis(
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<KanbanColumnWithTasks[]>> {
  try {
    const params = new URLSearchParams({ projectId });
    if (teamId) params.append('teamId', teamId);
    
    const response = await fetch(`${API_BASE}/board?${params}`);
    const result = await response.json();
    
    return result;
  } catch (error) {
    console.error('Error fetching Kanban board:', error);
    return {
      success: false,
      error: 'Failed to fetch Kanban board',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Create a new Kanban task
 */
export async function createKanbanTaskWithRedis(
  taskData: CreateTaskForm, 
  projectId: string, 
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        data: { ...taskData, project_id: projectId, team_id: teamId, user_email: userEmail }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      error: 'Failed to create task',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Update an existing Kanban task
 */
export async function updateKanbanTaskWithRedis(
  taskId: string, 
  updates: UpdateTaskForm, 
  projectId: string, 
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        data: { id: taskId, ...updates, project_id: projectId, team_id: teamId, user_email: userEmail }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      error: 'Failed to update task',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Delete a Kanban task
 */
export async function deleteKanbanTaskWithRedis(
  taskId: string, 
  projectId: string, 
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<boolean>> {
  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        data: { id: taskId, project_id: projectId, team_id: teamId, user_email: userEmail }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      error: 'Failed to delete task',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Move a task to a different column
 */
export async function moveTaskWithRedis(
  taskId: string,
  newColumnId: string,
  newSortOrder: number,
  projectId: string,
  teamId?: string,
  userEmail?: string
): Promise<ApiResponse<boolean>> {
  try {
    const response = await fetch(`${API_BASE}/board`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'move_task',
        data: {
          taskId,
          columnId: newColumnId,
          sortOrder: newSortOrder,
          projectId,
          teamId,
          user_email: userEmail
        }
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error moving task:', error);
    return {
      success: false,
      error: 'Failed to move task',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Create a new Kanban column
 */
export async function createKanbanColumnWithRedis(
  columnData: CreateColumnForm, 
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        data: { ...columnData, project_id: projectId, team_id: teamId }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating column:', error);
    return {
      success: false,
      error: 'Failed to create column',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Update an existing Kanban column
 */
export async function updateKanbanColumnWithRedis(
  columnId: string, 
  updates: Partial<CreateColumnForm>, 
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        data: { id: columnId, ...updates, project_id: projectId, team_id: teamId }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating column:', error);
    return {
      success: false,
      error: 'Failed to update column',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Delete a Kanban column
 */
export async function deleteKanbanColumnWithRedis(
  columnId: string, 
  projectId: string, 
  teamId?: string
): Promise<ApiResponse<boolean>> {
  try {
    const response = await fetch(`${API_BASE}/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        data: { id: columnId, project_id: projectId, team_id: teamId }
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting column:', error);
    return {
      success: false,
      error: 'Failed to delete column',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Get project categories with Redis caching
 */
export async function getProjectCategoriesWithRedis(
  projectId: string
): Promise<ApiResponse<ProjectCategory[]>> {
  try {
    const response = await fetch(`${API_BASE}/categories?projectId=${projectId}`);
    const result = await response.json();
    
    return result;
  } catch (error) {
    console.error('Error fetching project categories:', error);
    return {
      success: false,
      error: 'Failed to fetch project categories',
      data: null,
      source: 'unknown'
    };
  }
}

/**
 * Get Redis status
 */
export async function getRedisStatus(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch('/api/redis/status');
    const result = await response.json();
    
    return result.health || { status: 'unknown', message: 'Unable to check Redis status' };
  } catch (error) {
    console.error('Error checking Redis status:', error);
    return { status: 'error', message: 'Failed to check Redis status' };
  }
}
