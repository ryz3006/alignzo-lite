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
  resource_type: string;
  resource_id?: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
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
      if (resourceType) filters.resource_type = resourceType;

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
    resource_type: 'user_action',
    description: action,
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
    resource_type: 'security',
    description,
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
    resource_type: resourceType,
    resource_id: resourceId,
    description: action,
    metadata
  });
}
