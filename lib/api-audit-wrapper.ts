import { NextRequest, NextResponse } from 'next/server';
import { auditTrail, AuditEventType } from './audit-trail';
import { logUserAction, logError, logSecurityEvent, SecurityEventType } from './logger';

// API Audit Wrapper for automatic audit trail logging
export function withApiAudit(
  serviceName: string,
  eventType: AuditEventType = AuditEventType.READ,
  tableName?: string
) {
  return function(
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return async function(request: NextRequest): Promise<NextResponse> {
      const startTime = Date.now();
      let userEmail = 'anonymous';
      let success = true;
      let errorMessage: string | undefined;
      let responseData: any = null;

      try {
        // Extract user email from request headers or query params
        userEmail = extractUserEmail(request);

        // Log API access
        await logUserAction(
          userEmail,
          `${serviceName}_${eventType.toLowerCase()}`,
          {
            service: serviceName,
            endpoint: request.url,
            method: request.method,
            startTime: new Date().toISOString()
          },
          request
        );

        // Execute the handler
        const response = await handler(request);
        
        // Extract response data for audit trail
        const responseClone = response.clone();
        try {
          responseData = await responseClone.json();
        } catch {
          // Response might not be JSON, that's okay
        }

        // Log successful operation to audit trail
        await auditTrail.logDataAccess(
          userEmail,
          eventType,
          tableName || serviceName,
          extractRecordId(request, responseData),
          undefined, // old values
          sanitizeResponseData(responseData, eventType),
          request,
          {
            service: serviceName,
            responseTime: Date.now() - startTime,
            statusCode: response.status
          }
        );

        return response;

      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error
        await logError(error as Error, {
          service: serviceName,
          endpoint: request.url,
          userEmail: userEmail
        }, request);

        // Log security event for failed operations
        await logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            service: serviceName,
            error: errorMessage,
            endpoint: request.url,
            responseTime: Date.now() - startTime
          },
          request
        );

        // Log failed operation to audit trail
        await auditTrail.logSecurityEvent(
          userEmail,
          AuditEventType.SECURITY_EVENT,
          `${serviceName} operation failed: ${errorMessage}`,
          request,
          {
            service: serviceName,
            responseTime: Date.now() - startTime,
            error: errorMessage
          }
        );

        throw error;
      }
    };
  };
}

// Extract user email from request
function extractUserEmail(request: NextRequest): string {
  // Check query parameters
  const searchParams = new URL(request.url).searchParams;
  const userEmail = searchParams.get('userEmail');
  if (userEmail) return userEmail;

  // Check headers
  const authHeader = request.headers.get('x-user-email');
  if (authHeader) return authHeader;

  // Check request body (for POST requests)
  // Note: This would require reading the body, which can only be done once
  // Consider using middleware for this

  return 'anonymous';
}

// Extract record ID from request or response
function extractRecordId(request: NextRequest, responseData: any): string | undefined {
  // Try to extract from response
  if (responseData?.id) return responseData.id;
  if (responseData?.integration?.id) return responseData.integration.id;
  if (responseData?.ticket?.id) return responseData.ticket.id;

  // Try to extract from URL path
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];
  
  // If last segment looks like an ID (UUID or number)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lastSegment) ||
      /^\d+$/.test(lastSegment)) {
    return lastSegment;
  }

  return undefined;
}

// Sanitize response data for audit trail
function sanitizeResponseData(data: any, eventType: AuditEventType): any {
  if (!data) return null;

  // Clone to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(data));

  // Remove sensitive fields
  const sensitiveFields = ['api_token', 'password', 'secret', 'key', 'token'];
  
  function removeSensitiveFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveFields);
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = removeSensitiveFields(value);
      }
    }
    return result;
  }

  return removeSensitiveFields(sanitized);
}

// Service-specific audit wrappers
export const withJiraAudit = (eventType: AuditEventType = AuditEventType.READ) =>
  withApiAudit('JIRA_INTEGRATION', eventType, 'user_integrations');

export const withSupabaseAudit = (eventType: AuditEventType, tableName: string) =>
  withApiAudit('SUPABASE_ACCESS', eventType, tableName);

export const withAdminAudit = (eventType: AuditEventType = AuditEventType.READ) =>
  withApiAudit('ADMIN_ACTION', eventType, 'admin_actions');

// Admin audit wrapper that can handle dynamic route parameters
export function withAdminAuditDynamic(
  eventType: AuditEventType = AuditEventType.READ
) {
  return function(
    handler: (request: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>
  ) {
    return async function(
      request: NextRequest,
      context: { params: { id: string } }
    ): Promise<NextResponse> {
      const startTime = Date.now();
      let userEmail = 'anonymous';
      let success = true;
      let errorMessage: string | undefined;
      let responseData: any = null;

      try {
        // Extract user email from request headers or query params
        userEmail = extractUserEmail(request);

        // Log API access
        await logUserAction(
          userEmail,
          `ADMIN_ACTION_${eventType.toLowerCase()}`,
          {
            service: 'ADMIN_ACTION',
            endpoint: request.url,
            method: request.method,
            startTime: new Date().toISOString(),
            params: context.params
          },
          request
        );

        // Execute the handler
        const response = await handler(request, context);
        
        // Extract response data for audit trail
        const responseClone = response.clone();
        try {
          responseData = await responseClone.json();
        } catch {
          // Response might not be JSON, that's okay
        }

        // Log successful operation to audit trail
        await auditTrail.logDataAccess(
          userEmail,
          eventType,
          'admin_actions',
          context.params.id,
          undefined, // old values
          sanitizeResponseData(responseData, eventType),
          request,
          {
            service: 'ADMIN_ACTION',
            responseTime: Date.now() - startTime,
            statusCode: response.status,
            params: context.params
          }
        );

        return response;

      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error
        await logError(error as Error, {
          service: 'ADMIN_ACTION',
          endpoint: request.url,
          userEmail: userEmail,
          params: context.params
        }, request);

        // Log security event for failed operations
        await logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            service: 'ADMIN_ACTION',
            error: errorMessage,
            endpoint: request.url,
            responseTime: Date.now() - startTime,
            params: context.params
          },
          request
        );

        // Log failed operation to audit trail
        await auditTrail.logSecurityEvent(
          userEmail,
          AuditEventType.SECURITY_EVENT,
          `ADMIN_ACTION operation failed: ${errorMessage}`,
          request,
          {
            service: 'ADMIN_ACTION',
            responseTime: Date.now() - startTime,
            error: errorMessage,
            params: context.params
          }
        );

        throw error;
      }
    };
  };
}
