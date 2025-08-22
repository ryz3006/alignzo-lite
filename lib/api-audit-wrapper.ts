import { supabaseClient } from './supabase-client';
import { NextRequest, NextResponse } from 'next/server';

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

export interface AuditEntry {
  id?: string;
  user_email: string;
  event_type: AuditEventType;
  resource_type: string;
  resource_id?: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  endpoint: string;
  method: string;
  success: boolean;
  error_message?: string;
  response_time?: number;
  created_at?: string;
}

export interface AuditConfig {
  enabled: boolean;
  logSuccess: boolean;
  logErrors: boolean;
  includeMetadata: boolean;
  includeResponseTime: boolean;
  sensitiveFields: string[];
  excludedEndpoints: string[];
}

export class ApiAuditWrapper {
  private static instance: ApiAuditWrapper;
  private config: AuditConfig;

  private constructor() {
    this.config = {
      enabled: process.env.AUDIT_ENABLED !== 'false',
      logSuccess: process.env.AUDIT_LOG_SUCCESS !== 'false',
      logErrors: process.env.AUDIT_LOG_ERRORS !== 'false',
      includeMetadata: process.env.AUDIT_INCLUDE_METADATA !== 'false',
      includeResponseTime: process.env.AUDIT_INCLUDE_RESPONSE_TIME !== 'false',
      sensitiveFields: process.env.AUDIT_SENSITIVE_FIELDS?.split(',') || ['password', 'api_token', 'secret'],
      excludedEndpoints: process.env.AUDIT_EXCLUDED_ENDPOINTS?.split(',') || ['/api/health', '/api/metrics']
    };
  }

  public static getInstance(): ApiAuditWrapper {
    if (!ApiAuditWrapper.instance) {
      ApiAuditWrapper.instance = new ApiAuditWrapper();
    }
    return ApiAuditWrapper.instance;
  }

  private shouldAudit(endpoint: string): boolean {
    if (!this.config.enabled) return false;
    
    return !this.config.excludedEndpoints.some(excluded => 
      endpoint.includes(excluded)
    );
  }

  private sanitizeMetadata(metadata: any): any {
    if (!this.config.includeMetadata || !metadata) return metadata;

    const sanitized = JSON.parse(JSON.stringify(metadata));

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.config.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  private extractIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           request.ip || 
           'unknown';
  }

  private extractUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  private extractUserEmail(request: NextRequest): string {
    // Try to extract user email from various sources
    return request.headers.get('x-user-email') || 
           request.headers.get('authorization')?.replace('Bearer ', '') || 
           'anonymous';
  }

  async logAuditEvent(
    request: NextRequest,
    eventType: AuditEventType,
    resourceType: string,
    description: string,
    resourceId?: string,
    metadata?: any,
    success: boolean = true,
    errorMessage?: string,
    responseTime?: number
  ): Promise<void> {
    if (!this.shouldAudit(request.url)) return;

    try {
      const auditEntry: Omit<AuditEntry, 'id' | 'created_at'> = {
        user_email: this.extractUserEmail(request),
        event_type: eventType,
        resource_type: resourceType,
        resource_id: resourceId,
        description,
        metadata: this.sanitizeMetadata(metadata),
        ip_address: this.extractIP(request),
        user_agent: this.extractUserAgent(request),
        endpoint: request.url,
        method: request.method,
        success,
        error_message: errorMessage,
        response_time: this.config.includeResponseTime ? responseTime : undefined
      };

      await supabaseClient.insert('audit_trail', {
        ...auditEntry,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  withAudit(
    eventType: AuditEventType,
    resourceType: string,
    description?: string
  ) {
    const self = this;
    return function(handler: (request: NextRequest) => Promise<NextResponse>) {
      return async function(request: NextRequest): Promise<NextResponse> {
        const startTime = Date.now();
        let success = true;
        let errorMessage: string | undefined;
        let responseTime: number | undefined;

        try {
          const response = await handler(request);
          
          if (self.config.includeResponseTime) {
            responseTime = Date.now() - startTime;
          }

          // Log successful operation
          if (self.config.logSuccess) {
            await self.logAuditEvent(
              request,
              eventType,
              resourceType,
              description || `${eventType} operation on ${resourceType}`,
              undefined,
              { responseStatus: response.status },
              true,
              undefined,
              responseTime
            );
          }

          return response;
        } catch (error) {
          success = false;
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
          responseTime = Date.now() - startTime;

          // Log failed operation
          if (self.config.logErrors) {
            await self.logAuditEvent(
              request,
              eventType,
              resourceType,
              description || `${eventType} operation on ${resourceType} failed`,
              undefined,
              { error: errorMessage },
              false,
              errorMessage,
              responseTime
            );
          }

          throw error;
        }
      };
    };
  }

  withAdminAudit(
    eventType: AuditEventType,
    resourceType: string,
    description?: string
  ) {
    const self = this;
    return function(handler: (request: NextRequest) => Promise<NextResponse>) {
      return async function(request: NextRequest): Promise<NextResponse> {
        const startTime = Date.now();
        let success = true;
        let errorMessage: string | undefined;
        let responseTime: number | undefined;

        try {
          // Verify admin access
          const userEmail = self.extractUserEmail(request);
          if (userEmail === 'anonymous') {
            throw new Error('Admin authentication required');
          }

          // Check if user is admin (you can implement your own admin check logic here)
          const isAdmin = await self.checkAdminAccess(userEmail);
          if (!isAdmin) {
            throw new Error('Admin access required');
          }

          const response = await handler(request);
          
          if (self.config.includeResponseTime) {
            responseTime = Date.now() - startTime;
          }

          // Log successful admin operation
          if (self.config.logSuccess) {
            await self.logAuditEvent(
              request,
              eventType,
              resourceType,
              `Admin ${description || eventType} operation on ${resourceType}`,
              undefined,
              { responseStatus: response.status, adminUser: userEmail },
              true,
              undefined,
              responseTime
            );
          }

          return response;
        } catch (error) {
          success = false;
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
          responseTime = Date.now() - startTime;

          // Log failed admin operation
          if (self.config.logErrors) {
            await self.logAuditEvent(
              request,
              eventType,
              resourceType,
              `Admin ${description || eventType} operation on ${resourceType} failed`,
              undefined,
              { error: errorMessage },
              false,
              errorMessage,
              responseTime
            );
          }

          throw error;
        }
      };
    };
  }

  private async checkAdminAccess(userEmail: string): Promise<boolean> {
    try {
      const response = await supabaseClient.get('admin_users', {
        select: 'id',
        filters: { user_email: userEmail }
      });

      return !response.error && response.data && response.data.length > 0;
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }

  async getAuditTrail(
    filters?: {
      userEmail?: string;
      eventType?: AuditEventType;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
      success?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditEntry[]> {
    try {
      const queryFilters: any = {};
      
      if (filters?.userEmail) queryFilters.user_email = filters.userEmail;
      if (filters?.eventType) queryFilters.event_type = filters.eventType;
      if (filters?.resourceType) queryFilters.resource_type = filters.resourceType;
      if (filters?.startDate) queryFilters.created_at = { gte: filters.startDate };
      if (filters?.endDate) queryFilters.created_at = { lte: filters.endDate };
      if (filters?.success !== undefined) queryFilters.success = filters.success;

      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters: queryFilters,
        order: { column: 'created_at', ascending: false },
        limit: filters?.limit || 100,
        offset: filters?.offset || 0
      });

      if (response.error) {
        console.error('Error getting audit trail:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting audit trail:', error);
      return [];
    }
  }

  async getAuditStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByUser: Record<string, number>;
    eventsByResource: Record<string, number>;
    successRate: number;
    averageResponseTime: number;
  }> {
    try {
      const filters: any = {};
      if (startDate) filters.created_at = { gte: startDate };
      if (endDate) filters.created_at = { lte: endDate };

      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters
      });

      if (response.error) {
        throw new Error(`Failed to get audit stats: ${response.error}`);
      }

      const events = response.data || [];
      const totalEvents = events.length;

      const stats = {
        totalEvents,
        eventsByType: {} as Record<string, number>,
        eventsByUser: {} as Record<string, number>,
        eventsByResource: {} as Record<string, number>,
        successRate: 0,
        averageResponseTime: 0
      };

      let successCount = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      events.forEach((event: AuditEntry) => {
        // Count by event type
        stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;
        
        // Count by user
        stats.eventsByUser[event.user_email] = (stats.eventsByUser[event.user_email] || 0) + 1;
        
        // Count by resource
        stats.eventsByResource[event.resource_type] = (stats.eventsByResource[event.resource_type] || 0) + 1;

        // Count successes
        if (event.success) successCount++;

        // Calculate response time
        if (event.response_time) {
          totalResponseTime += event.response_time;
          responseTimeCount++;
        }
      });

      stats.successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;
      stats.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

      return stats;
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  }

  async cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const response = await supabaseClient.get('audit_trail', {
        select: 'id',
        filters: {
          created_at: { lt: cutoffDate.toISOString() }
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const entry of response.data) {
        await supabaseClient.delete('audit_trail', entry.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      return 0;
    }
  }
}

// Global API audit wrapper instance
export const apiAuditWrapper = ApiAuditWrapper.getInstance();

// Convenience functions
export function withAudit(
  eventType: AuditEventType,
  resourceType: string,
  description?: string
) {
  return apiAuditWrapper.withAudit(eventType, resourceType, description);
}

export function withAdminAudit(
  eventType: AuditEventType,
  resourceType: string,
  description?: string
) {
  return apiAuditWrapper.withAdminAudit(eventType, resourceType, description);
}

export function withAuditDynamic(eventType: AuditEventType) {
  return function(resourceType: string, description?: string) {
    return apiAuditWrapper.withAudit(eventType, resourceType, description);
  };
}

export function withAdminAuditDynamic(eventType: AuditEventType) {
  return function(resourceType: string, description?: string) {
    return apiAuditWrapper.withAdminAudit(eventType, resourceType, description);
  };
}

// Jira-specific audit wrapper
export function withJiraAudit(eventType: AuditEventType) {
  return function(resourceType: string, description?: string) {
    return apiAuditWrapper.withAudit(eventType, resourceType, description || `Jira ${eventType} operation`);
  };
}
