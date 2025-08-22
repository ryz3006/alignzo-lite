import { supabaseClient } from './supabase-client';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export interface LogEntry {
  id?: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  metadata?: any;
  stack_trace?: string;
}

export interface SecurityLogEntry {
  id?: string;
  event_type: SecurityEventType;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
  timestamp: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private enableDatabase: boolean;
  private enableFile: boolean;

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    this.enableConsole = process.env.LOG_ENABLE_CONSOLE !== 'false';
    this.enableDatabase = process.env.LOG_ENABLE_DATABASE !== 'false';
    this.enableFile = process.env.LOG_ENABLE_FILE !== 'false';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] ${message}${metadataStr}`;
  }

  async log(
    level: LogLevel,
    message: string,
    metadata?: any,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      user_email: userEmail,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint,
      metadata
    };

    // Console logging
    if (this.enableConsole) {
      const formattedMessage = this.formatMessage(level, message, metadata);
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formattedMessage);
          break;
      }
    }

    // Database logging
    if (this.enableDatabase) {
      try {
        await this.logToDatabase(logEntry);
      } catch (error) {
        console.error('Failed to log to database:', error);
      }
    }

    // File logging
    if (this.enableFile) {
      try {
        await this.logToFile(logEntry);
      } catch (error) {
        console.error('Failed to log to file:', error);
      }
    }
  }

  private async logToDatabase(logEntry: LogEntry): Promise<void> {
    try {
      await supabaseClient.insert('application_logs', logEntry);
    } catch (error) {
      console.error('Error logging to database:', error);
    }
  }

  private async logToFile(logEntry: LogEntry): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');

      const logsDir = 'logs';
      const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);

      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Error logging to file:', error);
    }
  }

  async debug(message: string, metadata?: any, userEmail?: string, ipAddress?: string, userAgent?: string, endpoint?: string): Promise<void> {
    await this.log(LogLevel.DEBUG, message, metadata, userEmail, ipAddress, userAgent, endpoint);
  }

  async info(message: string, metadata?: any, userEmail?: string, ipAddress?: string, userAgent?: string, endpoint?: string): Promise<void> {
    await this.log(LogLevel.INFO, message, metadata, userEmail, ipAddress, userAgent, endpoint);
  }

  async warn(message: string, metadata?: any, userEmail?: string, ipAddress?: string, userAgent?: string, endpoint?: string): Promise<void> {
    await this.log(LogLevel.WARN, message, metadata, userEmail, ipAddress, userAgent, endpoint);
  }

  async error(message: string, metadata?: any, userEmail?: string, ipAddress?: string, userAgent?: string, endpoint?: string): Promise<void> {
    await this.log(LogLevel.ERROR, message, metadata, userEmail, ipAddress, userAgent, endpoint);
  }

  async critical(message: string, metadata?: any, userEmail?: string, ipAddress?: string, userAgent?: string, endpoint?: string): Promise<void> {
    await this.log(LogLevel.CRITICAL, message, metadata, userEmail, ipAddress, userAgent, endpoint);
  }

  async logUserAction(
    userEmail: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.info(
      `User action: ${action}`,
      { action, resourceType, resourceId, ...metadata },
      userEmail,
      ipAddress,
      userAgent,
      endpoint
    );
  }

  async logDataAccess(
    userEmail: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    await this.info(
      `Data access: ${action}`,
      { action, resourceType, resourceId, ...metadata },
      userEmail,
      ipAddress,
      userAgent,
      endpoint
    );
  }

  async logSecurityEvent(
    eventType: SecurityEventType,
    metadata: any,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string
  ): Promise<void> {
    const severity = this.getSecurityEventSeverity(eventType);
    const level = this.getLogLevelFromSeverity(severity);

    await this.log(
      level,
      `Security event: ${eventType}`,
      { eventType, ...metadata },
      userEmail,
      ipAddress,
      userAgent,
      endpoint
    );

    // Also log to security logs table
    await this.logSecurityEventToDatabase(eventType, metadata, userEmail, ipAddress, userAgent, endpoint, severity);
  }

  private getSecurityEventSeverity(eventType: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case SecurityEventType.LOGIN_SUCCESS:
      case SecurityEventType.LOGOUT:
        return 'low';
      case SecurityEventType.LOGIN_ATTEMPT:
      case SecurityEventType.DATA_ACCESS:
        return 'medium';
      case SecurityEventType.LOGIN_FAILURE:
      case SecurityEventType.ACCESS_DENIED:
      case SecurityEventType.DATA_MODIFICATION:
        return 'high';
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
      case SecurityEventType.SYSTEM_ERROR:
        return 'critical';
      default:
        return 'medium';
    }
  }

  private getLogLevelFromSeverity(severity: string): LogLevel {
    switch (severity) {
      case 'low':
        return LogLevel.INFO;
      case 'medium':
        return LogLevel.WARN;
      case 'high':
        return LogLevel.ERROR;
      case 'critical':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.INFO;
    }
  }

  private async logSecurityEventToDatabase(
    eventType: SecurityEventType,
    metadata: any,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    endpoint?: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      const securityLogEntry: Omit<SecurityLogEntry, 'id'> = {
        event_type: eventType,
        user_email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        description: `Security event: ${eventType}`,
        severity: severity || this.getSecurityEventSeverity(eventType),
        metadata,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await supabaseClient.insert('security_logs', securityLogEntry);
    } catch (error) {
      console.error('Error logging security event to database:', error);
    }
  }

  async getLogs(
    level?: LogLevel,
    userEmail?: string,
    startTime?: string,
    endTime?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LogEntry[]> {
    try {
      const filters: any = {};
      
      if (level) filters.level = level;
      if (userEmail) filters.user_email = userEmail;
      if (startTime) filters.timestamp = { gte: startTime };
      if (endTime) filters.timestamp = { lte: endTime };

      const response = await supabaseClient.get('application_logs', {
        select: '*',
        filters,
        order: { column: 'timestamp', ascending: false },
        limit,
        offset
      });

      if (response.error) {
        console.error('Error getting logs:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting logs:', error);
      return [];
    }
  }

  async getSecurityLogs(
    eventType?: SecurityEventType,
    severity?: string,
    userEmail?: string,
    startTime?: string,
    endTime?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SecurityLogEntry[]> {
    try {
      const filters: any = {};
      
      if (eventType) filters.event_type = eventType;
      if (severity) filters.severity = severity;
      if (userEmail) filters.user_email = userEmail;
      if (startTime) filters.timestamp = { gte: startTime };
      if (endTime) filters.timestamp = { lte: endTime };

      const response = await supabaseClient.get('security_logs', {
        select: '*',
        filters,
        order: { column: 'timestamp', ascending: false },
        limit,
        offset
      });

      if (response.error) {
        console.error('Error getting security logs:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting security logs:', error);
      return [];
    }
  }

  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up application logs
      const appLogsResponse = await supabaseClient.get('application_logs', {
        select: 'id',
        filters: {
          timestamp: { lt: cutoffDate.toISOString() }
        }
      });

      let cleanedCount = 0;

      if (!appLogsResponse.error && appLogsResponse.data) {
        for (const log of appLogsResponse.data) {
          await supabaseClient.delete('application_logs', log.id);
          cleanedCount++;
        }
      }

      // Clean up security logs
      const securityLogsResponse = await supabaseClient.get('security_logs', {
        select: 'id',
        filters: {
          timestamp: { lt: cutoffDate.toISOString() }
        }
      });

      if (!securityLogsResponse.error && securityLogsResponse.data) {
        for (const log of securityLogsResponse.data) {
          await supabaseClient.delete('security_logs', log.id);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return 0;
    }
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Convenience functions
export async function logInfo(message: string, metadata?: any, userEmail?: string): Promise<void> {
  await logger.info(message, metadata, userEmail);
}

export async function logError(message: string, metadata?: any, userEmail?: string): Promise<void> {
  await logger.error(message, metadata, userEmail);
}

export async function logWarning(message: string, metadata?: any, userEmail?: string): Promise<void> {
  await logger.warn(message, metadata, userEmail);
}

export async function logDebug(message: string, metadata?: any, userEmail?: string): Promise<void> {
  await logger.debug(message, metadata, userEmail);
}

export async function logUserAction(
  userEmail: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: any
): Promise<void> {
  await logger.logUserAction(userEmail, action, resourceType, resourceId, metadata);
}

export async function logSecurityEvent(
  eventType: SecurityEventType,
  metadata: any,
  userEmail?: string,
  ipAddress?: string,
  userAgent?: string,
  endpoint?: string
): Promise<void> {
  await logger.logSecurityEvent(eventType, metadata, userEmail, ipAddress, userAgent, endpoint);
}

// Helper function to log authentication attempts
export async function logAuthAttempt(
  email: string,
  success: boolean,
  request: Request,
  metadata?: any
): Promise<void> {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const endpoint = new URL(request.url).pathname;

  const eventType = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE;
  
  await logger.logSecurityEvent(eventType, {
    email,
    success,
    ipAddress,
    userAgent,
    endpoint,
    ...metadata
  }, email, ipAddress, userAgent, endpoint);
}
