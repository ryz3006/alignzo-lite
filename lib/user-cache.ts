import { cacheStrategy } from './cache-strategy';

export interface UserTeamData {
  teamId: string;
  teamName: string;
  projectId?: string;
  projectName?: string;
  role?: string;
  isActive: boolean;
}

export interface UserShiftData {
  shiftDate: string;
  shiftType: string;
  shiftName: string;
  startTime?: string;
  endTime?: string;
  projectId?: string;
  teamId?: string;
  color?: string;
}

export interface UserProjectData {
  projectId: string;
  projectName: string;
  product: string;
  country: string;
  isActive: boolean;
  categories?: any[];
}

export interface UserDashboardData {
  user: any;
  teams: UserTeamData[];
  shifts: UserShiftData[];
  projects: UserProjectData[];
  userShift?: {
    todayShift: string;
    tomorrowShift: string;
    todayShiftName: string;
    tomorrowShiftName: string;
    todayShiftColor: string;
    tomorrowShiftColor: string;
    todayShiftTime?: string;
    tomorrowShiftTime?: string;
    projectId?: string;
    teamId?: string;
  };
  stats: {
    todayHours: number;
    weekHours: number;
    monthHours: number;
    yearHours: number;
    totalHours: number;
  };
  projectHours: Array<{
    projectName: string;
    hours: number;
    color: string;
  }>;
  recentWorkLogs: any[];
  teamAvailability: any[];
}

export class UserCache {
  private static instance: UserCache;

  static getInstance(): UserCache {
    if (!UserCache.instance) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  // Cache key generators
  private getUserKey(userEmail: string): string {
    return `user:${userEmail}`;
  }

  private getUserTeamsKey(userEmail: string): string {
    return `user:teams:${userEmail}`;
  }

  private getUserShiftsKey(userEmail: string, date?: string): string {
    const dateSuffix = date ? `:${date}` : ':all';
    return `user:shifts:${userEmail}${dateSuffix}`;
  }

  private getUserProjectsKey(userEmail: string): string {
    return `user:projects:${userEmail}`;
  }

  private getUserDashboardKey(userEmail: string): string {
    return `user:dashboard:${userEmail}`;
  }

  private getTeamMembersKey(teamId: string): string {
    return `team:members:${teamId}`;
  }

  private getTeamShiftsKey(teamId: string, date?: string): string {
    const dateSuffix = date ? `:${date}` : ':all';
    return `team:shifts:${teamId}${dateSuffix}`;
  }

  private getProjectTeamsKey(projectId: string): string {
    return `project:teams:${projectId}`;
  }

  // User teams caching
  async getUserTeams(userEmail: string): Promise<UserTeamData[]> {
    try {
      const cached = await cacheStrategy.get<UserTeamData[]>(this.getUserTeamsKey(userEmail));
      if (cached) {
        console.log(`[Cache] User teams hit for ${userEmail}`);
        return cached;
      }

      console.log(`[Cache] User teams miss for ${userEmail}`);
      return [];
    } catch (error) {
      console.error('Error getting cached user teams:', error);
      return [];
    }
  }

  async setUserTeams(userEmail: string, teams: UserTeamData[]): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getUserTeamsKey(userEmail),
        teams,
        'user'
      );
    } catch (error) {
      console.warn('Failed to cache user teams:', error);
    }
  }

  // User shifts caching
  async getUserShifts(userEmail: string, date?: string): Promise<UserShiftData[]> {
    try {
      const cached = await cacheStrategy.get<UserShiftData[]>(this.getUserShiftsKey(userEmail, date));
      if (cached) {
        console.log(`[Cache] User shifts hit for ${userEmail}${date ? `:${date}` : ''}`);
        return cached;
      }

      console.log(`[Cache] User shifts miss for ${userEmail}${date ? `:${date}` : ''}`);
      return [];
    } catch (error) {
      console.error('Error getting cached user shifts:', error);
      return [];
    }
  }

  async setUserShifts(userEmail: string, shifts: UserShiftData[], date?: string): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getUserShiftsKey(userEmail, date),
        shifts,
        'user'
      );
    } catch (error) {
      console.warn('Failed to cache user shifts:', error);
    }
  }

  // User projects caching
  async getUserProjects(userEmail: string): Promise<UserProjectData[]> {
    try {
      const cached = await cacheStrategy.get<UserProjectData[]>(this.getUserProjectsKey(userEmail));
      if (cached) {
        console.log(`[Cache] User projects hit for ${userEmail}`);
        return cached;
      }

      console.log(`[Cache] User projects miss for ${userEmail}`);
      return [];
    } catch (error) {
      console.error('Error getting cached user projects:', error);
      return [];
    }
  }

  async setUserProjects(userEmail: string, projects: UserProjectData[]): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getUserProjectsKey(userEmail),
        projects,
        'project'
      );
    } catch (error) {
      console.warn('Failed to cache user projects:', error);
    }
  }

  // Dashboard data caching
  async getDashboardData(userEmail: string): Promise<UserDashboardData | null> {
    try {
      const cached = await cacheStrategy.get<UserDashboardData>(this.getUserDashboardKey(userEmail));
      if (cached) {
        console.log(`[Cache] Dashboard data hit for ${userEmail}`);
        return cached;
      }

      console.log(`[Cache] Dashboard data miss for ${userEmail}`);
      return null;
    } catch (error) {
      console.error('Error getting cached dashboard data:', error);
      return null;
    }
  }

  async setDashboardData(userEmail: string, data: UserDashboardData): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getUserDashboardKey(userEmail),
        data,
        'user'
      );
    } catch (error) {
      console.warn('Failed to cache dashboard data:', error);
    }
  }

  // Team members caching
  async getTeamMembers(teamId: string): Promise<any[]> {
    try {
      const cached = await cacheStrategy.get<any[]>(this.getTeamMembersKey(teamId));
      if (cached) {
        console.log(`[Cache] Team members hit for ${teamId}`);
        return cached;
      }

      console.log(`[Cache] Team members miss for ${teamId}`);
      return [];
    } catch (error) {
      console.error('Error getting cached team members:', error);
      return [];
    }
  }

  async setTeamMembers(teamId: string, members: any[]): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getTeamMembersKey(teamId),
        members,
        'user'
      );
    } catch (error) {
      console.warn('Failed to cache team members:', error);
    }
  }

  // Team shifts caching
  async getTeamShifts(teamId: string, date?: string): Promise<any[]> {
    try {
      const cached = await cacheStrategy.get<any[]>(this.getTeamShiftsKey(teamId, date));
      if (cached) {
        console.log(`[Cache] Team shifts hit for ${teamId}${date ? `:${date}` : ''}`);
        return cached;
      }

      console.log(`[Cache] Team shifts miss for ${teamId}${date ? `:${date}` : ''}`);
      return [];
    } catch (error) {
      console.error('Error getting cached team shifts:', error);
      return [];
    }
  }

  async setTeamShifts(teamId: string, shifts: any[], date?: string): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getTeamShiftsKey(teamId, date),
        shifts,
        'user'
      );
    } catch (error) {
      console.warn('Failed to cache team shifts:', error);
    }
  }

  // Project teams caching
  async getProjectTeams(projectId: string): Promise<any[]> {
    try {
      const cached = await cacheStrategy.get<any[]>(this.getProjectTeamsKey(projectId));
      if (cached) {
        console.log(`[Cache] Project teams hit for ${projectId}`);
        return cached;
      }

      console.log(`[Cache] Project teams miss for ${projectId}`);
      return [];
    } catch (error) {
      console.error('Error getting cached project teams:', error);
      return [];
    }
  }

  async setProjectTeams(projectId: string, teams: any[]): Promise<void> {
    try {
      await cacheStrategy.set(
        this.getProjectTeamsKey(projectId),
        teams,
        'project'
      );
    } catch (error) {
      console.warn('Failed to cache project teams:', error);
    }
  }

  // Cache invalidation methods
  async invalidateUserCache(userEmail: string): Promise<void> {
    try {
      const keys = [
        this.getUserKey(userEmail),
        this.getUserTeamsKey(userEmail),
        this.getUserProjectsKey(userEmail),
        this.getUserDashboardKey(userEmail)
      ];

      await Promise.all(keys.map(key => cacheStrategy.delete(key)));
      console.log(`[Cache] Invalidated user cache for ${userEmail}`);
    } catch (error) {
      console.error('Error invalidating user cache:', error);
    }
  }

  async invalidateUserShifts(userEmail: string): Promise<void> {
    try {
      const keys = [
        this.getUserShiftsKey(userEmail),
        this.getUserShiftsKey(userEmail, new Date().toISOString().split('T')[0])
      ];

      await Promise.all(keys.map(key => cacheStrategy.delete(key)));
      console.log(`[Cache] Invalidated user shifts for ${userEmail}`);
    } catch (error) {
      console.error('Error invalidating user shifts:', error);
    }
  }

  async invalidateTeamCache(teamId: string): Promise<void> {
    try {
      const keys = [
        this.getTeamMembersKey(teamId),
        this.getTeamShiftsKey(teamId)
      ];

      await Promise.all(keys.map(key => cacheStrategy.delete(key)));
      console.log(`[Cache] Invalidated team cache for ${teamId}`);
    } catch (error) {
      console.error('Error invalidating team cache:', error);
    }
  }

  async invalidateProjectCache(projectId: string): Promise<void> {
    try {
      await cacheStrategy.delete(this.getProjectTeamsKey(projectId));
      console.log(`[Cache] Invalidated project cache for ${projectId}`);
    } catch (error) {
      console.error('Error invalidating project cache:', error);
    }
  }

  // Bulk invalidation for related data
  async invalidateRelatedCaches(userEmail: string, teamIds: string[], projectIds: string[]): Promise<void> {
    try {
      await this.invalidateUserCache(userEmail);
      
      const teamPromises = teamIds.map(teamId => this.invalidateTeamCache(teamId));
      const projectPromises = projectIds.map(projectId => this.invalidateProjectCache(projectId));
      
      await Promise.all([...teamPromises, ...projectPromises]);
      console.log(`[Cache] Invalidated related caches for ${userEmail}`);
    } catch (error) {
      console.error('Error invalidating related caches:', error);
    }
  }
}

export const userCache = UserCache.getInstance();
