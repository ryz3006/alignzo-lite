import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { logSecurityEvent, SecurityEventType, LogLevel } from './logger';

// Validation middleware configuration
interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: boolean;
  logValidation?: boolean;
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  errors?: ZodError;
  data?: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
}

// Centralized validation middleware
export function withValidation(config: ValidationConfig) {
  return function(handler: (request: NextRequest, validatedData?: any) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      const startTime = Date.now();
      
      try {
        // Validate request components
        const validationResult = await validateRequest(request, config);
        
        if (!validationResult.isValid) {
          // Log validation failure
          if (config.logValidation !== false) {
            logSecurityEvent(
              SecurityEventType.INVALID_INPUT,
              {
                endpoint: request.url,
                method: request.method,
                validationErrors: validationResult.errors?.errors,
                clientInfo: extractClientInfo(request)
              },
              request,
              LogLevel.WARN
            );
          }
          
          return NextResponse.json(
            {
              error: 'Validation failed',
              message: 'Request data validation failed',
              details: validationResult.errors?.errors || []
            },
            { status: 400 }
          );
        }
        
        // Log successful validation
        if (config.logValidation !== false) {
          logSecurityEvent(
            SecurityEventType.DATA_ACCESS,
            {
              endpoint: request.url,
              method: request.method,
              validationPassed: true,
              responseTime: Date.now() - startTime
            },
            request,
            LogLevel.INFO
          );
        }
        
        // Call the handler with validated data
        return await handler(request, validationResult.data);
        
      } catch (error) {
        // Log validation error
        logSecurityEvent(
          SecurityEventType.INVALID_INPUT,
          {
            endpoint: request.url,
            method: request.method,
            error: error instanceof Error ? error.message : 'Unknown validation error',
            responseTime: Date.now() - startTime
          },
          request,
          LogLevel.ERROR
        );
        
        return NextResponse.json(
          {
            error: 'Validation error',
            message: 'An error occurred during request validation'
          },
          { status: 500 }
        );
      }
    };
  };
}

// Validate request components
async function validateRequest(request: NextRequest, config: ValidationConfig): Promise<ValidationResult> {
  const result: ValidationResult = { isValid: true, data: {} };
  
  try {
    // Validate body if schema provided
    if (config.body) {
      const body = await request.json().catch(() => ({}));
      const validatedBody = config.body.parse(body);
      result.data!.body = validatedBody;
    }
    
    // Validate query parameters
    if (config.query) {
      const url = new URL(request.url);
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      const validatedQuery = config.query.parse(queryParams);
      result.data!.query = validatedQuery;
    }
    
    // Validate URL parameters (for dynamic routes)
    if (config.params) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const params: Record<string, string> = {};
      
      // Extract parameters from path (basic implementation)
      // This would need to be enhanced based on your routing structure
      if (pathParts.length > 0) {
        params.id = pathParts[pathParts.length - 1];
      }
      
      const validatedParams = config.params.parse(params);
      result.data!.params = validatedParams;
    }
    
    // Validate headers
    if (config.headers) {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const validatedHeaders = config.headers.parse(headers);
      result.data!.headers = validatedHeaders;
    }
    
  } catch (error) {
    if (error instanceof ZodError) {
      result.isValid = false;
      result.errors = error;
    } else {
      throw error;
    }
  }
  
  return result;
}

// Extract client information for logging
function extractClientInfo(request: NextRequest) {
  return {
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.ip || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
    referer: request.headers.get('referer') || 'unknown'
  };
}

// Predefined validation schemas for common use cases
export const commonSchemas = {
  // Pagination schema
  pagination: z.object({
    page: z.string().optional().transform(val => parseInt(val || '1')),
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),
  
  // ID parameter schema
  idParam: z.object({
    id: z.string().min(1, 'ID is required')
  }),
  
  // Email schema
  email: z.string().email('Invalid email format'),
  
  // Password schema
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  // Date range schema
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),
  
  // Search schema
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: z.record(z.any()).optional()
  }),
  
  // File upload schema
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    size: z.number().positive('File size must be positive'),
    type: z.string().min(1, 'File type is required')
  })
};

// Enhanced validation with custom error messages
export function createValidationSchema(
  schema: ZodSchema,
  customMessages?: Record<string, string>
): ZodSchema {
  if (!customMessages) return schema;
  
  // Apply custom error messages
  return schema.transform((data, ctx) => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (customMessages[path]) {
            err.message = customMessages[path];
          }
        });
      }
      throw error;
    }
  });
}

// Validation middleware with authentication check
export function withAuthValidation(
  config: ValidationConfig & { 
    requireAuth: true; 
    requireAdmin?: boolean;
  }
) {
  return withValidation({
    ...config,
    requireAuth: true,
    requireAdmin: config.requireAdmin
  });
}

// Validation middleware for admin-only endpoints
export function withAdminValidation(config: Omit<ValidationConfig, 'requireAdmin'>) {
  return withValidation({
    ...config,
    requireAuth: true,
    requireAdmin: true
  });
}

// Validation middleware for public endpoints
export function withPublicValidation(config: Omit<ValidationConfig, 'requireAuth' | 'requireAdmin'>) {
  return withValidation({
    ...config,
    requireAuth: false,
    requireAdmin: false
  });
}

// Utility function to create endpoint-specific validation
export function createEndpointValidation(
  endpoint: string,
  method: string,
  config: ValidationConfig
) {
  return {
    endpoint,
    method,
    config,
    middleware: withValidation(config)
  };
}

// Validation error formatter
export function formatValidationErrors(errors: ZodError) {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code
  }));
}

// Request sanitization (basic implementation)
export function sanitizeRequest(request: NextRequest): NextRequest {
  // This is a basic implementation - enhance based on your needs
  const url = new URL(request.url);
  
  // Remove potentially dangerous query parameters
  const dangerousParams = ['script', 'javascript', 'vbscript', 'onload', 'onerror'];
  dangerousParams.forEach(param => {
    url.searchParams.delete(param);
  });
  
  // Create new request with sanitized URL
  const sanitizedRequest = new NextRequest(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  
  return sanitizedRequest;
}
