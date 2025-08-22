import { createClient } from '@supabase/supabase-js';

// Client-side Supabase utility that uses server-side proxy
// This prevents environment variable exposure to the client
export interface SupabaseQuery {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  data?: any;
  filters?: Record<string, any>;
  select?: string;
  order?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
  userEmail?: string;
}

export interface SupabaseResponse<T = any> {
  data: T;
  count?: number;
  error?: string;
}

class SupabaseClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/supabase-proxy';
  }

  async query<T = any>(query: SupabaseQuery): Promise<SupabaseResponse<T>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase client error:', error);
      return {
        data: [] as T,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async get<T = any>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'select',
      ...options,
    });
  }

  async insert<T = any>(table: string, data: any): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'insert',
      data,
    });
  }

  async update<T = any>(table: string, id: string, data: any): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'update',
      data,
      filters: { id },
    });
  }

  async delete<T = any>(table: string, id: string): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'delete',
      filters: { id },
    });
  }

  // Convenience methods for common operations
  async getUsers(options?: { order?: { column: string; ascending?: boolean } }) {
    return this.get('users', { select: '*', ...options });
  }

  async getTeams(options?: { order?: { column: string; ascending?: boolean } }) {
    return this.get('teams', { select: '*', ...options });
  }

  async getProjects(options?: { order?: { column: string; ascending?: boolean } }) {
    return this.get('projects', { select: '*', ...options });
  }

  async getWorkLogs(options?: { 
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }) {
    return this.get('work_logs', { 
      select: '*,project:projects(*)', 
      ...options 
    });
  }

  // User-specific methods for Phase 1
  async getUserWorkLogs(userEmail: string, options?: {
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
  }) {
    return this.query({
      table: 'work_logs',
      action: 'select',
      select: '*,project:projects(*)',
      userEmail,
      ...options
    });
  }

  async getUserProjects(userEmail: string, options?: {
    order?: { column: string; ascending?: boolean };
  }) {
    // Get projects where user is assigned
    return this.get('projects', {
      select: '*',
      filters: { assigned_users: userEmail }, // This might need adjustment based on your schema
      ...options
    });
  }

  async getShiftSchedules(options?: {
    filters?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
  }) {
    return this.get('shift_schedules', {
      select: '*',
      ...options
    });
  }

  async getProjectCategories() {
    return this.get('project_categories', { select: '*' });
  }

  async getTicketSources() {
    return this.get('ticket_sources', { select: '*' });
  }

  async getTicketMasterMappings() {
    return this.get('ticket_master_mappings', { select: '*' });
  }

  async getTicketUploadMappings() {
    return this.get('ticket_upload_mappings', { 
      select: '*,source:ticket_sources(*),project:projects(*)' 
    });
  }

  async getUploadSessions() {
    return this.get('upload_sessions', { 
      select: '*',
      order: { column: 'created_at', ascending: false }
    });
  }

  // Admin dashboard methods
  async getProjectTeams(projectId: string) {
    return this.get('team_project_assignments', {
      select: 'team_id,teams(*)',
      filters: { project_id: projectId }
    });
  }

  async getTeamMembers(teamId: string) {
    return this.get('team_members', {
      select: 'user_id,users(email,full_name)',
      filters: { team_id: teamId }
    });
  }

  async getCustomShiftEnums(projectId: string, teamId: string) {
    return this.query({
      table: 'custom_shift_enums',
      action: 'select',
      filters: { 
        project_id: projectId,
        team_id: teamId
      }
    });
  }

  async upsertShiftSchedules(data: {
    projectId: string;
    teamId: string;
    userEmail: string;
    shiftDate: string;
    shiftType: string;
  }) {
    return this.query({
      table: 'shift_schedules',
      action: 'upsert',
      data: {
        project_id: data.projectId,
        team_id: data.teamId,
        user_email: data.userEmail,
        shift_date: data.shiftDate,
        shift_type: data.shiftType
      }
    });
  }
}

// Export singleton instance
export const supabaseClient = new SupabaseClient();

// For backward compatibility, export the old supabase instance
export { supabase } from './supabase';
