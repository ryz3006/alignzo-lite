import { supabaseClient } from './supabase-client';

export enum AuditEventType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SECURITY_ALERT = 'SECURITY_ALERT',
  API_CALL = 'API_CALL',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  USER_PERMISSION_CHANGE = 'USER_PERMISSION_CHANGE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE'
}

export interface AuditEvent {
  id?: string;
  user_email: string;
  event_type: AuditEventType;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  method?: string;
  success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export class AuditTrail {
  private static instance: AuditTrail;

  private constructor() {}

  public static getInstance(): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail();
    }
    return AuditTrail.instance;
  }

  async logEvent(event: AuditEvent): Promise<void> {
    try {
      const response = await supabaseClient.insert('audit_trail', {
        ...event,
        created_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Failed to log audit event:', response.error);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  async getEvents(
    userEmail?: string,
    eventType?: AuditEventType,
    resourceType?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditEvent[]> {
    try {
      const filters: any = {};
      
      if (userEmail) filters.user_email = userEmail;
      if (eventType) filters.event_type = eventType;
      if (resourceType) filters.table_name = resourceType;

      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters,
        order: { column: 'created_at', ascending: false },
        limit,
        offset
      });

      if (response.error) {
        throw new Error(`Failed to fetch audit events: ${response.error}`);
      }

      return response.data || [];
    } catch (error) {
      console.error('Error fetching audit events:', error);
      throw error;
    }
  }

  async getEventById(id: string): Promise<AuditEvent | null> {
    try {
      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters: { id }
      });

      if (response.error) {
        throw new Error(`Failed to fetch audit event: ${response.error}`);
      }

      return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error fetching audit event:', error);
      throw error;
    }
  }

  async deleteOldEvents(cutoffDate: Date): Promise<number> {
    try {
      const response = await supabaseClient.get('audit_trail', {
        select: 'id',
        filters: {
          created_at: { lt: cutoffDate.toISOString() }
        }
      });

      if (response.error) {
        throw new Error(`Failed to fetch old audit events: ${response.error}`);
      }

      const oldEvents = response.data || [];
      let deletedCount = 0;

      for (const event of oldEvents) {
        try {
          await supabaseClient.delete('audit_trail', event.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete audit event ${event.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old audit events:', error);
      throw error;
    }
  }

  async queryAuditTrail(filters: {
    userEmail?: string;
    eventType?: AuditEventType;
    tableName?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    try {
      const queryFilters: any = {};
      
      if (filters.userEmail) queryFilters.user_email = filters.userEmail;
      if (filters.eventType) queryFilters.event_type = filters.eventType;
      if (filters.tableName) queryFilters.table_name = filters.tableName;
      if (filters.success !== undefined) queryFilters.success = filters.success;
      
      // Handle date range filters using the correct format for the Supabase proxy
      if (filters.startDate) queryFilters.created_at_gte = filters.startDate;
      if (filters.endDate) queryFilters.created_at_lte = filters.endDate;

      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters: queryFilters,
        order: { column: 'created_at', ascending: false },
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });

      if (response.error) {
        throw new Error(`Failed to query audit trail: ${response.error}`);
      }

      return response.data || [];
    } catch (error) {
      console.error('Error querying audit trail:', error);
      throw error;
    }
  }

  async getAuditTrailCount(filters: {
    userEmail?: string;
    eventType?: AuditEventType;
    tableName?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
  }): Promise<number> {
    try {
      const queryFilters: any = {};
      
      if (filters.userEmail) queryFilters.user_email = filters.userEmail;
      if (filters.eventType) queryFilters.event_type = filters.eventType;
      if (filters.tableName) queryFilters.table_name = filters.tableName;
      if (filters.success !== undefined) queryFilters.success = filters.success;
      
      // Handle date range filters using the correct format for the Supabase proxy
      if (filters.startDate) queryFilters.created_at_gte = filters.startDate;
      if (filters.endDate) queryFilters.created_at_lte = filters.endDate;

      const response = await supabaseClient.get('audit_trail', {
        select: 'count(*)',
        filters: queryFilters
      });

      if (response.error) {
        throw new Error(`Failed to get audit trail count: ${response.error}`);
      }

      return response.data?.[0]?.count || 0;
    } catch (error) {
      console.error('Error getting audit trail count:', error);
      return 0;
    }
  }
}

// Global audit trail instance
export const auditTrail = AuditTrail.getInstance();

// Helper functions for common audit events
export async function logUserAction(
  userEmail: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  await auditTrail.logEvent({
    user_email: userEmail,
    event_type: AuditEventType.API_CALL,
    table_name: 'user_action',
    ip_address: metadata?.ip_address || 'unknown',
    endpoint: metadata?.endpoint || '/unknown',
    method: metadata?.method || 'GET',
    metadata
  });
}

export async function logSecurityEvent(
  userEmail: string,
  eventType: AuditEventType,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  await auditTrail.logEvent({
    user_email: userEmail,
    event_type: eventType,
    table_name: 'security',
    ip_address: metadata?.ip_address || 'unknown',
    endpoint: metadata?.endpoint || '/security',
    method: metadata?.method || 'POST',
    metadata
  });
}

export async function logDataAccess(
  userEmail: string,
  resourceType: string,
  resourceId: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  await auditTrail.logEvent({
    user_email: userEmail,
    event_type: AuditEventType.READ,
    table_name: resourceType,
    record_id: resourceId,
    ip_address: metadata?.ip_address || 'unknown',
    endpoint: metadata?.endpoint || '/data',
    method: metadata?.method || 'GET',
    metadata
  });
}
