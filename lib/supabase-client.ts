import { createClient } from '@supabase/supabase-js';

// Client-side Supabase utility that uses server-side proxy
// This prevents environment variable exposure to the client
export interface SupabaseQuery {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
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
  functionName?: string;
  params?: Record<string, any>;
}

export interface SupabaseResponse<T = any> {
  data: T;
  count?: number;
  error?: string;
}

class SupabaseClient {
  private baseUrl: string;

  constructor() {
    // Use absolute URL in server environment, relative URL in browser
    if (typeof window === 'undefined') {
      // Server environment - use environment variable or default
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/api/supabase-proxy`
        : 'http://localhost:3000/api/supabase-proxy';
      this.baseUrl = baseUrl;
    } else {
      // Browser environment - use relative URL
      this.baseUrl = '/api/supabase-proxy';
    }
  }

  async query<T = any>(query: SupabaseQuery): Promise<SupabaseResponse<T>> {
    try {
      // In server environment, use direct Supabase client
      if (typeof window === 'undefined') {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase environment variables not configured');
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Handle different query types
        switch (query.action) {
          case 'select':
            let supabaseQuery = supabase.from(query.table).select(query.select || '*');
            
            // Apply filters
            if (query.filters) {
              Object.entries(query.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  if (key.endsWith('_gte')) {
                    const column = key.replace('_gte', '');
                    supabaseQuery = supabaseQuery.gte(column, value);
                  } else if (key.endsWith('_lte')) {
                    const column = key.replace('_lte', '');
                    supabaseQuery = supabaseQuery.lte(column, value);
                  } else if (key.endsWith('_lt')) {
                    const column = key.replace('_lt', '');
                    supabaseQuery = supabaseQuery.lt(column, value);
                  } else if (key.endsWith('_in')) {
                    const column = key.replace('_in', '');
                    supabaseQuery = supabaseQuery.in(column, value);
                  } else {
                    supabaseQuery = supabaseQuery.eq(key, value);
                  }
                }
              });
            }
            
            // Apply user-specific filtering for work_logs on server side
            if (query.userEmail && query.table === 'work_logs') {
              console.log('🔍 [SERVER] Applying user filter for work_logs:', query.userEmail);
              supabaseQuery = supabaseQuery.eq('user_email', query.userEmail);
            }
            
            // Apply ordering
            if (query.order) {
              supabaseQuery = supabaseQuery.order(query.order.column, { ascending: query.order.ascending !== false });
            }
            
            // Apply pagination
            if (query.limit) {
              supabaseQuery = supabaseQuery.limit(query.limit);
            }
            if (query.offset) {
              supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 10) - 1);
            }
            
            const result = await supabaseQuery;
            
            if (result.error) {
              throw new Error(result.error.message);
            }
            
            return {
              data: result.data || [],
              count: result.count
            };
            
          case 'insert':
            const insertResult = await supabase.from(query.table).insert(query.data);
            if (insertResult.error) {
              throw new Error(insertResult.error.message);
            }
            return {
              data: insertResult.data || []
            };
            
          case 'update':
            const updateResult = await supabase.from(query.table).update(query.data).eq('id', query.filters?.id);
            if (updateResult.error) {
              throw new Error(updateResult.error.message);
            }
            return {
              data: updateResult.data || []
            };
            
          case 'delete':
            const deleteResult = await supabase.from(query.table).delete().eq('id', query.filters?.id);
            if (deleteResult.error) {
              throw new Error(deleteResult.error.message);
            }
            return {
              data: deleteResult.data || []
            };
            
          default:
            throw new Error(`Unsupported action: ${query.action}`);
        }
      }

      // In browser environment, use the proxy
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

      const result = await response.json();
      return result;
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
      filters: { id }
    });
  }

  async delete<T = any>(table: string, id: string): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'delete',
      filters: { id }
    });
  }

  async upsert<T = any>(table: string, data: any): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table,
      action: 'upsert',
      data
    });
  }

  async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<SupabaseResponse<T>> {
    return this.query<T>({
      table: '',
      action: 'rpc',
      functionName,
      params
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

  // Team work logs method - gets work logs for all team members
  async getTeamWorkLogs(teamMemberEmails: string[], options?: {
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    select?: string;
  }) {
    return this.query({
      table: 'work_logs',
      action: 'select',
      select: options?.select || '*,project:projects(*)',
      filters: {
        ...options?.filters,
        user_email: teamMemberEmails // This will use the 'in' filter
      },
      order: options?.order,
      limit: options?.limit,
      offset: options?.offset
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
    return this.query({
      table: 'ticket_master_mappings',
      action: 'select',
      select: '*'
    });
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

  // Team work reports methods
  async getTeamMemberships(userEmail: string) {
    // First get the teams the user belongs to
    const userTeams = await this.query({
      table: 'team_members',
      action: 'select',
      select: 'team_id',
      filters: { 'users.email': userEmail }
    });

    if (userTeams.error || !userTeams.data || userTeams.data.length === 0) {
      return { data: [], error: 'No teams found' };
    }

    const teamIds = userTeams.data.map((team: any) => team.team_id);

    // Then get all members of those teams
    return this.query({
      table: 'team_members',
      action: 'select',
      select: 'team_id,user_id,users(email,full_name)',
      filters: { team_id: teamIds }
    });
  }

  async getTeamProjectAssignments(teamIds: string[]) {
    return this.query({
      table: 'team_project_assignments',
      action: 'select',
      select: 'project_id',
      filters: { team_id: teamIds } // Array will be handled by proxy
    });
  }

  async getTeamMembersByTeams(teamIds: string[]) {
    return this.query({
      table: 'team_members',
      action: 'select',
      select: 'user_id,users(*)',
      filters: { team_id: teamIds } // Array will be handled by proxy
    });
  }

  async getTeamWorkLogs(filters: Record<string, any>, options?: {
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }) {
    return this.query({
      table: 'work_logs',
      action: 'select',
      select: '*,project:projects(*)',
      filters,
      ...options
    });
  }
}

// Export singleton instance
export const supabaseClient = new SupabaseClient();
