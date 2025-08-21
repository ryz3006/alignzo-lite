import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { logDataAccess, logUserAction, logSecurityEvent, SecurityEventType } from './logger';
import { isAdminUser } from './auth';

// Audit trail event types
export enum AuditEventType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SECURITY_EVENT = 'SECURITY_EVENT'
}

// Audit trail entry interface
export interface AuditEntry {
  id?: string;
  user_email: string;
  event_type: AuditEventType;
  table_name?: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
  created_at?: string;
}

// Audit trail configuration
interface AuditConfig {
  enabled: boolean;
  logToDatabase: boolean;
  logToFile: boolean;
  includeOldValues: boolean;
  includeNewValues: boolean;
  sensitiveFields: string[];
  excludedTables: string[];
  excludedEndpoints: string[];
}

// Default audit configuration
const defaultAuditConfig: AuditConfig = {
  enabled: true,
  logToDatabase: true,
  logToFile: true,
  includeOldValues: true,
  includeNewValues: true,
  sensitiveFields: ['password', 'api_token', 'secret', 'key'],
  excludedTables: ['audit_trail', 'sessions', 'temp_data'],
  excludedEndpoints: ['/api/health', '/api/metrics']
};

// Audit trail manager
export class AuditTrailManager {
  private config: AuditConfig;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...defaultAuditConfig, ...config };
  }

  // Log a data access event
  async logDataAccess(
    userEmail: string,
    eventType: AuditEventType,
    tableName: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    request?: NextRequest,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Check if table is excluded
    if (this.config.excludedTables.includes(tableName)) return;

    const auditEntry: AuditEntry = {
      user_email: userEmail,
      event_type: eventType,
      table_name: tableName,
      record_id: recordId,
      old_values: this.sanitizeData(oldValues),
      new_values: this.sanitizeData(newValues),
      ip_address: this.extractIP(request),
      user_agent: this.extractUserAgent(request),
      endpoint: this.extractEndpoint(request),
      method: this.extractMethod(request),
      success: true,
      metadata: metadata,
      created_at: new Date().toISOString()
    };

    await this.saveAuditEntry(auditEntry);
  }

  // Log a user action event
  async logUserAction(
    userEmail: string,
    eventType: AuditEventType,
    action: string,
    request?: NextRequest,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const auditEntry: AuditEntry = {
      user_email: userEmail,
      event_type: eventType,
      table_name: 'user_actions',
      record_id: action,
      ip_address: this.extractIP(request),
      user_agent: this.extractUserAgent(request),
      endpoint: this.extractEndpoint(request),
      method: this.extractMethod(request),
      success: true,
      metadata: metadata,
      created_at: new Date().toISOString()
    };

    await this.saveAuditEntry(auditEntry);
  }

  // Log a security event
  async logSecurityEvent(
    userEmail: string,
    eventType: AuditEventType,
    securityEvent: string,
    request?: NextRequest,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const auditEntry: AuditEntry = {
      user_email: userEmail,
      event_type: eventType,
      table_name: 'security_events',
      record_id: securityEvent,
      ip_address: this.extractIP(request),
      user_agent: this.extractUserAgent(request),
      endpoint: this.extractEndpoint(request),
      method: this.extractMethod(request),
      success: false,
      metadata: metadata,
      created_at: new Date().toISOString()
    };

    await this.saveAuditEntry(auditEntry);
  }

  // Log an access denied event
  async logAccessDenied(
    userEmail: string,
    resource: string,
    reason: string,
    request?: NextRequest
  ): Promise<void> {
    await this.logSecurityEvent(
      userEmail,
      AuditEventType.ACCESS_DENIED,
      `Access denied to ${resource}: ${reason}`,
      request,
      { resource, reason }
    );
  }

  // Log configuration changes
  async logConfigurationChange(
    userEmail: string,
    configType: string,
    oldConfig: any,
    newConfig: any,
    request?: NextRequest
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      user_email: userEmail,
      event_type: AuditEventType.CONFIGURATION_CHANGE,
      table_name: 'configuration',
      record_id: configType,
      old_values: this.sanitizeData(oldConfig),
      new_values: this.sanitizeData(newConfig),
      ip_address: this.extractIP(request),
      user_agent: this.extractUserAgent(request),
      endpoint: this.extractEndpoint(request),
      method: this.extractMethod(request),
      success: true,
      metadata: { configType },
      created_at: new Date().toISOString()
    };

    await this.saveAuditEntry(auditEntry);
  }

  // Save audit entry to database and/or file
  private async saveAuditEntry(auditEntry: AuditEntry): Promise<void> {
    try {
      // Save to database
      if (this.config.logToDatabase) {
        await this.saveToDatabase(auditEntry);
      }

      // Save to file
      if (this.config.logToFile) {
        await this.saveToFile(auditEntry);
      }

      // Log to application logger
      logDataAccess(
        auditEntry.user_email,
        auditEntry.event_type as any,
        auditEntry.table_name || 'audit',
        auditEntry.record_id
      );

    } catch (error) {
      console.error('Failed to save audit entry:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  // Save to Supabase database
  private async saveToDatabase(auditEntry: AuditEntry): Promise<void> {
    const { error } = await supabase
      .from('audit_trail')
      .insert(auditEntry);

    if (error) {
      throw new Error(`Database audit save failed: ${error.message}`);
    }
  }

  // Save to file system
  private async saveToFile(auditEntry: AuditEntry): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    const auditLogDir = 'logs/audit';
    const auditLogFile = path.join(auditLogDir, `audit-${new Date().toISOString().split('T')[0]}.log`);

    // Ensure directory exists
    if (!fs.existsSync(auditLogDir)) {
      fs.mkdirSync(auditLogDir, { recursive: true });
    }

    // Append to log file
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...auditEntry
    }) + '\n';

    fs.appendFileSync(auditLogFile, logEntry);
  }

  // Sanitize sensitive data
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

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

  // Extract IP address from request
  private extractIP(request?: NextRequest): string {
    if (!request) return 'unknown';
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           request.ip || 
           'unknown';
  }

  // Extract user agent from request
  private extractUserAgent(request?: NextRequest): string {
    if (!request) return 'unknown';
    return request.headers.get('user-agent') || 'unknown';
  }

  // Extract endpoint from request
  private extractEndpoint(request?: NextRequest): string {
    if (!request) return 'unknown';
    return request.url;
  }

  // Extract method from request
  private extractMethod(request?: NextRequest): string {
    if (!request) return 'unknown';
    return request.method;
  }

  // Query audit trail
  async queryAuditTrail(
    filters: {
      userEmail?: string;
      eventType?: AuditEventType;
      tableName?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      isAdmin?: boolean;
      success?: boolean;
    } = {}
  ): Promise<AuditEntry[]> {
    let query = supabase
      .from('audit_trail')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.userEmail) {
      query = query.eq('user_email', filters.userEmail);
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.tableName) {
      query = query.eq('table_name', filters.tableName);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Audit trail query failed: ${error.message}`);
    }

    // Apply success filter if provided
    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }

    // Apply admin filtering at application layer if needed
    // The RLS policies in the database will handle basic access control
    // Additional admin-specific filtering can be done here if required
    return data || [];
  }

  // Get audit trail count with filters
  async getAuditTrailCount(
    filters: {
      userEmail?: string;
      eventType?: AuditEventType;
      tableName?: string;
      startDate?: string;
      endDate?: string;
      success?: boolean;
    } = {}
  ): Promise<number> {
    let query = supabase
      .from('audit_trail')
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters.userEmail) {
      query = query.eq('user_email', filters.userEmail);
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.tableName) {
      query = query.eq('table_name', filters.tableName);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting audit trail count:', error);
      return 0;
    }

    return count || 0;
  }

  // Get audit trail statistics
  async getAuditStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByUser: Record<string, number>;
    eventsByTable: Record<string, number>;
  }> {
    let query = supabase
      .from('audit_trail')
      .select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Audit stats query failed: ${error.message}`);
    }

    const events = data || [];

    const stats = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsByUser: {} as Record<string, number>,
      eventsByTable: {} as Record<string, number>
    };

    events.forEach(event => {
      // Count by event type
      stats.eventsByType[event.event_type] = (stats.eventsByType[event.event_type] || 0) + 1;
      
      // Count by user
      stats.eventsByUser[event.user_email] = (stats.eventsByUser[event.user_email] || 0) + 1;
      
      // Count by table
      if (event.table_name) {
        stats.eventsByTable[event.table_name] = (stats.eventsByTable[event.table_name] || 0) + 1;
      }
    });

    return stats;
  }
}

// Global audit trail instance
export const auditTrail = new AuditTrailManager();

// Audit trail middleware
export function withAuditTrail(
  eventType: AuditEventType,
  tableName?: string
) {
  return function(handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      const startTime = Date.now();
      let userEmail = 'anonymous';
      let success = true;
      let errorMessage: string | undefined;

      try {
        // Extract user email from request (implement based on your auth system)
        // userEmail = extractUserEmail(request);

        const response = await handler(request, userEmail);
        
        // Log successful operation
        await auditTrail.logDataAccess(
          userEmail,
          eventType,
          tableName || 'unknown',
          undefined,
          undefined,
          undefined,
          request,
          { responseTime: Date.now() - startTime }
        );

        return response;

      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed operation
        await auditTrail.logSecurityEvent(
          userEmail,
          AuditEventType.SECURITY_EVENT,
          `Operation failed: ${errorMessage}`,
          request,
          { responseTime: Date.now() - startTime }
        );

        throw error;
      }
    };
  };
}
