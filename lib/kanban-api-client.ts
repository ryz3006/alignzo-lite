// Client-safe version of enhanced kanban API
// This version uses fetch calls to API endpoints instead of direct Redis imports

export async function getKanbanBoardWithCache(
  projectId: string, 
  teamId: string
): Promise<any[]> {
  try {
    const response = await fetch(`/api/kanban/board-with-cache?projectId=${projectId}&teamId=${teamId}`);
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached kanban board:', error);
    return [];
  }
}

export async function getKanbanColumnsWithCache(projectId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/kanban/columns-with-cache?projectId=${projectId}`);
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached kanban columns:', error);
    return [];
  }
}

export async function getUserProjectsWithCache(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/kanban/user-projects-with-cache?userId=${userId}`);
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached user projects:', error);
    return [];
  }
}

export async function getProjectCategoriesWithCache(projectId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/kanban/categories-with-cache?projectId=${projectId}`);
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached project categories:', error);
    return [];
  }
}

// Cache invalidation functions (these will call API endpoints)
export async function invalidateKanbanCache(projectId: string, teamId?: string): Promise<void> {
  try {
    const url = teamId 
      ? `/api/kanban/invalidate-cache?projectId=${projectId}&teamId=${teamId}`
      : `/api/kanban/invalidate-cache?projectId=${projectId}`;
    
    await fetch(url, { method: 'POST' });
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    await fetch(`/api/kanban/invalidate-user-cache?userId=${userId}`, { method: 'POST' });
  } catch (error) {
    console.error('Error invalidating user cache:', error);
  }
}
