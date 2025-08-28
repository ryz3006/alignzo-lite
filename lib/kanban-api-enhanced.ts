import { kanbanCache } from './kanban-cache';
import { getKanbanBoard as getOriginalBoard } from './kanban-api';
import { getKanbanColumns as getOriginalColumns } from './kanban-api';
import { getUserAccessibleProjects as getOriginalProjects } from './kanban-api';
import { getProjectCategoriesWithRedis } from './kanban-api-redis';
import { KanbanColumnWithTasks } from './kanban-types';
import { supabaseClient } from './supabase-client';

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

export async function getUserProjectsWithCache(userEmail: string): Promise<any[]> {
  try {
    const cached = await kanbanCache.getUserProjects(userEmail);
    if (cached && cached.length > 0) {
      // Check if cached data has categories with options
      const hasCategoriesWithOptions = cached.some((project: any) => 
        project.categories && project.categories.length > 0 && 
        project.categories.some((cat: any) => cat.options && cat.options.length > 0)
      );
      
      if (hasCategoriesWithOptions) {
        console.log(`[Cache] User projects hit for ${userEmail} with categories`);
        return cached;
      } else {
        console.log(`[Cache] User projects hit for ${userEmail} but missing categories, refreshing...`);
        // Clear cache and fetch fresh data
        await kanbanCache.invalidateUser(userEmail);
      }
    }

    console.log(`[Cache] User projects miss for ${userEmail}, fetching from database`);
    const response = await getOriginalProjects(userEmail);
    
    if (response.success && response.data) {
      // Ensure categories and options are loaded for each project
      const projectsWithCategories = await Promise.all(
        response.data.map(async (project: any) => {
          try {
            // Load categories for this project
            const categoriesResponse = await supabaseClient.get('project_categories', {
              select: '*',
              filters: { project_id: project.id },
              order: { column: 'sort_order', ascending: true }
            });

            if (!categoriesResponse.error && categoriesResponse.data) {
              // Load options for all categories
              const categoryIds = categoriesResponse.data.map((cat: any) => cat.id);
              let categoryOptions: any[] = [];
              
              if (categoryIds.length > 0) {
                const optionsResponse = await supabaseClient.get('category_options', {
                  select: '*',
                  filters: { category_id: categoryIds },
                  order: { column: 'sort_order', ascending: true }
                });

                if (!optionsResponse.error && optionsResponse.data) {
                  categoryOptions = optionsResponse.data;
                }
              }

              // Attach options to categories
              project.categories = categoriesResponse.data.map((category: any) => ({
                ...category,
                options: categoryOptions.filter((option: any) => option.category_id === category.id)
              }));
            } else {
              project.categories = [];
            }
          } catch (error) {
            console.warn('Error loading categories for project:', project.id, error);
            project.categories = [];
          }
          
          return project;
        })
      );

      // Cache the enhanced result (non-blocking)
      kanbanCache.setUserProjects(userEmail, projectsWithCategories)
        .catch(error => console.warn('Failed to cache user projects:', error));
      
      return projectsWithCategories;
    }
    
    return [];
  } catch (error) {
    console.error('Error in cached user projects fetch:', error);
    try {
      const response = await getOriginalProjects(userEmail);
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

export async function invalidateUserProjectsCache(userEmail: string): Promise<void> {
  await kanbanCache.invalidateUser(userEmail);
}
