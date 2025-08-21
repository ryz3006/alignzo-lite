import winston from 'winston';
import { NextRequest } from 'next/server';

// Log levels for different types of events
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// Security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  INVALID_INPUT = 'invalid_input',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_ACCESS = 'data_access',
  API_KEY_USAGE = 'api_key_usage',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'alignzo-lite',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Security logs
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Extract client information from request
function extractClientInfo(request: NextRequest) {
  return {
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.ip || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    referer: request.headers.get('referer') || 'unknown',
    method: request.method,
    url: request.url
  };
}

// Log security events
export function logSecurityEvent(
  eventType: SecurityEventType, 
  details: any, 
  request?: NextRequest,
  severity: LogLevel = LogLevel.INFO
) {
  const clientInfo = request ? extractClientInfo(request) : {};
  
  const logEntry = {
    event: 'SECURITY_EVENT',
    eventType,
    severity,
    timestamp: new Date().toISOString(),
    details,
    client: clientInfo,
    sessionId: generateSessionId(),
  };

  logger.log(severity, 'Security Event', logEntry);
  
  // Also log to security-specific file
  if (severity === LogLevel.ERROR || severity === LogLevel.WARN) {
    logger.error('Security Alert', logEntry);
  }
}

// Log user actions
export function logUserAction(
  userEmail: string, 
  action: string, 
  details: any = {}, 
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};
  
  const logEntry = {
    event: 'USER_ACTION',
    userEmail,
    action,
    timestamp: new Date().toISOString(),
    details,
    client: clientInfo,
    sessionId: generateSessionId(),
  };

  logger.info('User Action', logEntry);
}

// Log API access
export function logAPIAccess(
  endpoint: string, 
  method: string, 
  statusCode: number, 
  responseTime: number,
  request: NextRequest,
  userEmail?: string
) {
  const clientInfo = extractClientInfo(request);
  
  const logEntry = {
    event: 'API_ACCESS',
    endpoint,
    method,
    statusCode,
    responseTime,
    timestamp: new Date().toISOString(),
    userEmail: userEmail || 'anonymous',
    client: clientInfo,
    sessionId: generateSessionId(),
  };

  logger.http('API Access', logEntry);
}

// Log application errors
export function logError(
  error: Error, 
  context: any = {}, 
  request?: NextRequest,
  userEmail?: string
) {
  const clientInfo = request ? extractClientInfo(request) : {};
  
  const logEntry = {
    event: 'APPLICATION_ERROR',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString(),
    userEmail: userEmail || 'anonymous',
    client: clientInfo,
    sessionId: generateSessionId(),
  };

  logger.error('Application Error', logEntry);
}

// Log data access (for audit trail)
export function logDataAccess(
  userEmail: string,
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  table: string,
  recordId?: string,
  request?: NextRequest
) {
  const clientInfo = request ? extractClientInfo(request) : {};
  
  const logEntry = {
    event: 'DATA_ACCESS',
    userEmail,
    operation,
    table,
    recordId,
    timestamp: new Date().toISOString(),
    client: clientInfo,
    sessionId: generateSessionId(),
  };

  logger.info('Data Access', logEntry);
}

// Log rate limiting events
export function logRateLimitEvent(
  request: NextRequest,
  limitType: string,
  limit: number,
  current: number
) {
  const clientInfo = extractClientInfo(request);
  
  logSecurityEvent(
    SecurityEventType.RATE_LIMIT_EXCEEDED,
    {
      limitType,
      limit,
      current,
      exceeded: current >= limit
    },
    request,
    LogLevel.WARN
  );
}

// Log CSRF violations
export function logCSRFViolation(request: NextRequest, details: any = {}) {
  logSecurityEvent(
    SecurityEventType.CSRF_VIOLATION,
    {
      ...details,
      endpoint: request.url,
      method: request.method
    },
    request,
    LogLevel.WARN
  );
}

// Log authentication attempts
export function logAuthAttempt(
  email: string,
  success: boolean,
  request: NextRequest,
  details: any = {}
) {
  const eventType = success ? 
    SecurityEventType.LOGIN_SUCCESS : 
    SecurityEventType.LOGIN_FAILED;
    
  const severity = success ? LogLevel.INFO : LogLevel.WARN;
  
  logSecurityEvent(
    eventType,
    {
      email,
      success,
      ...details
    },
    request,
    severity
  );
}

// Generate session ID for tracking related events
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Utility to search logs (for monitoring)
export function searchLogs(
  query: string,
  logType: 'error' | 'security' | 'combined' = 'combined',
  limit: number = 100
) {
  // This is a basic implementation - in production, use proper log aggregation
  try {
    const logFile = `logs/${logType}.log`;
    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter((line: string) => line.includes(query))
      .slice(-limit);
    
    return logs.map((line: string) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  } catch (error) {
    logger.error('Error searching logs', { error: error instanceof Error ? error.message : 'Unknown error', query });
    return [];
  }
}

// Health check for logging system
export function logHealthCheck() {
  logger.info('Logging System Health Check', {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    environment: process.env.NODE_ENV,
    logLevel: logger.level
  });
}

export default logger;
