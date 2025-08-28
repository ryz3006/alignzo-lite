// Client-safe version of enhanced kanban APIs for Phase 2
// This file provides cached API functions that can be safely imported in client components

const API_BASE = '/api/kanban';

export async function getKanbanBoardWithCache(
  projectId: string, 
  teamId: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams({ projectId, teamId });
    const response = await fetch(`${API_BASE}/board?${params}`);
    
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached board fetch:', error);
    return [];
  }
}

export async function getKanbanColumnsWithCache(projectId: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({ projectId });
    const response = await fetch(`${API_BASE}/columns?${params}`);
    
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached columns fetch:', error);
    return [];
  }
}

export async function getUserProjectsWithCache(userEmail: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({ userEmail });
    const response = await fetch(`${API_BASE}/user-projects-with-cache?${params}`);
    
    if (response.ok) {
      const result = await response.json();
      // Handle both direct array response and wrapped response format
      if (Array.isArray(result)) {
        return result;
      } else if (result.success && result.data) {
        return result.data;
      }
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error in cached user projects fetch:', error);
    return [];
  }
}

export async function getProjectCategoriesWithCache(projectId: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({ projectId });
    const response = await fetch(`${API_BASE}/categories-with-cache?${params}`);
    
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached project categories fetch:', error);
    return [];
  }
}

// Cache invalidation functions (these call server APIs)
export async function invalidateKanbanCache(projectId: string, teamId?: string): Promise<void> {
  try {
    const params = new URLSearchParams({ projectId });
    if (teamId) params.append('teamId', teamId);
    
    // Call the server API to invalidate cache
    await fetch(`${API_BASE}/invalidate-cache?${params}`, { method: 'POST' });
  } catch (error) {
    console.warn('Failed to invalidate cache:', error);
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const params = new URLSearchParams({ userId });
    await fetch(`${API_BASE}/invalidate-user-cache?${params}`, { method: 'POST' });
  } catch (error) {
    console.warn('Failed to invalidate user cache:', error);
  }
}
