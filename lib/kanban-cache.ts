import { cacheStrategy } from './cache-strategy';
import { KanbanColumnWithTasks, ProjectWithCategories } from './kanban-types';

export class KanbanCache {
  private static instance: KanbanCache;

  static getInstance(): KanbanCache {
    if (!KanbanCache.instance) {
      KanbanCache.instance = new KanbanCache();
    }
    return KanbanCache.instance;
  }

  // Cache key generators
  private getBoardKey(projectId: string, teamId: string): string {
    return `kanban:board:${projectId}:${teamId}`;
  }

  private getColumnsKey(projectId: string): string {
    return `kanban:columns:${projectId}`;
  }

  private getProjectKey(projectId: string): string {
    return `kanban:project:${projectId}`;
  }

  private getProjectCategoriesKey(projectId: string): string {
    return `kanban:project-categories:${projectId}`;
  }

  private getUserProjectsKey(userEmail: string): string {
    return `kanban:user-projects-v2:${userEmail}`;
  }

  // Board data caching
  async getBoard(projectId: string, teamId: string): Promise<KanbanColumnWithTasks[] | null> {
    const key = this.getBoardKey(projectId, teamId);
    return await cacheStrategy.get<KanbanColumnWithTasks[]>(key);
  }

  async setBoard(projectId: string, teamId: string, data: KanbanColumnWithTasks[]): Promise<boolean> {
    const key = this.getBoardKey(projectId, teamId);
    return await cacheStrategy.set(key, data, 'kanban');
  }

  async invalidateBoard(projectId: string, teamId: string): Promise<void> {
    const key = this.getBoardKey(projectId, teamId);
    await cacheStrategy.delete(key);
  }

  // Column data caching
  async getColumns(projectId: string): Promise<any[] | null> {
    const key = this.getColumnsKey(projectId);
    return await cacheStrategy.get<any[]>(key);
  }

  async setColumns(projectId: string, data: any[]): Promise<boolean> {
    const key = this.getColumnsKey(projectId);
    return await cacheStrategy.set(key, data, 'kanban');
  }

  // Project metadata caching
  async getProject(projectId: string): Promise<ProjectWithCategories | null> {
    const key = this.getProjectKey(projectId);
    return await cacheStrategy.get<ProjectWithCategories>(key);
  }

  async setProject(projectId: string, data: ProjectWithCategories): Promise<boolean> {
    const key = this.getProjectKey(projectId);
    return await cacheStrategy.set(key, data, 'project');
  }

  // Project categories caching
  async getProjectCategories(projectId: string): Promise<any[] | null> {
    const key = this.getProjectCategoriesKey(projectId);
    return await cacheStrategy.get<any[]>(key);
  }

  async setProjectCategories(projectId: string, data: any[]): Promise<boolean> {
    const key = this.getProjectCategoriesKey(projectId);
    return await cacheStrategy.set(key, data, 'project');
  }

  // User projects caching
  async getUserProjects(userEmail: string): Promise<any[] | null> {
    const key = this.getUserProjectsKey(userEmail);
    return await cacheStrategy.get<any[]>(key);
  }

  async setUserProjects(userEmail: string, data: any[]): Promise<boolean> {
    const key = this.getUserProjectsKey(userEmail);
    return await cacheStrategy.set(key, data, 'user');
  }

  // Bulk invalidation
  async invalidateProject(projectId: string): Promise<void> {
    const keys = [
      this.getProjectKey(projectId),
      this.getColumnsKey(projectId),
      this.getProjectCategoriesKey(projectId)
    ];
    
    for (const key of keys) {
      await cacheStrategy.delete(key);
    }
  }

  async invalidateUser(userEmail: string): Promise<void> {
    const key = this.getUserProjectsKey(userEmail);
    await cacheStrategy.delete(key);
  }
}

export const kanbanCache = KanbanCache.getInstance();
