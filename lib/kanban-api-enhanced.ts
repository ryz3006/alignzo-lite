import { kanbanCache } from './kanban-cache';
import { getKanbanBoard as getOriginalBoard } from './kanban-api';
import { getKanbanColumns as getOriginalColumns } from './kanban-api';
import { getUserAccessibleProjects as getOriginalProjects } from './kanban-api';
import { getProjectCategoriesWithRedis } from './kanban-api-redis';
import { KanbanColumnWithTasks } from './kanban-types';

export async function getKanbanBoardWithCache(
  projectId: string, 
  teamId: string
): Promise<KanbanColumnWithTasks[]> {
  try {
    // Try cache first
    const cached = await kanbanCache.getBoard(projectId, teamId);
    if (cached) {
      console.log(`[Cache] Kanban board hit for ${projectId}:${teamId}`);
      return cached;
    }

    // Fallback to original API
    console.log(`[Cache] Kanban board miss for ${projectId}:${teamId}`);
    const response = await getOriginalBoard(projectId, teamId);
    
    if (response.success && response.data) {
      // Cache the result (non-blocking)
      kanbanCache.setBoard(projectId, teamId, response.data)
        .catch(error => console.warn('Failed to cache board:', error));
      
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached board fetch:', error);
    // Fallback to original API
    try {
      const response = await getOriginalBoard(projectId, teamId);
      return response.success && response.data ? response.data : [];
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return [];
    }
  }
}

export async function getKanbanColumnsWithCache(projectId: string): Promise<any[]> {
  try {
    const cached = await kanbanCache.getColumns(projectId);
    if (cached) return cached;

    const response = await getOriginalColumns(projectId);
    
    if (response.success && response.data) {
      kanbanCache.setColumns(projectId, response.data)
        .catch(error => console.warn('Failed to cache columns:', error));
      
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached columns fetch:', error);
    try {
      const response = await getOriginalColumns(projectId);
      return response.success && response.data ? response.data : [];
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return [];
    }
  }
}

export async function getUserProjectsWithCache(userId: string): Promise<any[]> {
  try {
    const cached = await kanbanCache.getUserProjects(userId);
    if (cached) return cached;

    const response = await getOriginalProjects(userId);
    
    if (response.success && response.data) {
      kanbanCache.setUserProjects(userId, response.data)
        .catch(error => console.warn('Failed to cache user projects:', error));
      
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached user projects fetch:', error);
    try {
      const response = await getOriginalProjects(userId);
      return response.success && response.data ? response.data : [];
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return [];
    }
  }
}

export async function getProjectCategoriesWithCache(projectId: string): Promise<any[]> {
  try {
    const cached = await kanbanCache.getProjectCategories(projectId);
    if (cached) {
      console.log(`[Cache] Project categories hit for ${projectId}`);
      return cached;
    }

    console.log(`[Cache] Project categories miss for ${projectId}`);
    const response = await getProjectCategoriesWithRedis(projectId);
    
    if (response.success && response.data) {
      // Cache the result (non-blocking)
      kanbanCache.setProjectCategories(projectId, response.data)
        .catch(error => console.warn('Failed to cache project categories:', error));
      
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached project categories fetch:', error);
    try {
      const response = await getProjectCategoriesWithRedis(projectId);
      return response.success && response.data ? response.data : [];
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
      return [];
    }
  }
}

// Cache invalidation functions
export async function invalidateKanbanCache(projectId: string, teamId?: string): Promise<void> {
  if (teamId) {
    await kanbanCache.invalidateBoard(projectId, teamId);
  } else {
    await kanbanCache.invalidateProject(projectId);
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  await kanbanCache.invalidateUser(userId);
}
