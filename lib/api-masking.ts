import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent, SecurityEventType } from './logger';

// API Masking and Proxy Configuration
interface MaskingConfig {
  enabled: boolean;
  maskSensitiveFields: boolean;
  logOriginalRequests: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  rateLimitByDomain: Record<string, number>;
}

// Default masking configuration
const defaultMaskingConfig: MaskingConfig = {
  enabled: true,
  maskSensitiveFields: true,
  logOriginalRequests: false, // Don't log sensitive data
  allowedDomains: [
    'api.atlassian.net',
    'supabase.co',
    'supabase.io',
    'firebaseapp.com',
    'googleapis.com'
  ],
  blockedDomains: [
    'malicious-site.com',
    'suspicious-domain.net'
  ],
  rateLimitByDomain: {
    'api.atlassian.net': 100, // JIRA API
    'supabase.co': 200,       // Supabase
    'supabase.io': 200,       // Supabase
    'firebaseapp.com': 50,    // Firebase
    'googleapis.com': 50      // Google APIs
  }
};

export class APIMaskingManager {
  private config: MaskingConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: Partial<MaskingConfig> = {}) {
    this.config = { ...defaultMaskingConfig, ...config };
  }

  // Mask external API response data
  public maskResponse(data: any, apiType: 'jira' | 'supabase' | 'firebase' | 'generic'): any {
    if (!this.config.enabled || !this.config.maskSensitiveFields) {
      return data;
    }

    return this.applyMasking(data, apiType);
  }

  // Mask external API request data
  public maskRequest(data: any, apiType: 'jira' | 'supabase' | 'firebase' | 'generic'): any {
    if (!this.config.enabled || !this.config.maskSensitiveFields) {
      return data;
    }

    return this.applyMasking(data, apiType, true);
  }

  // Check if domain is allowed
  public isDomainAllowed(url: string): boolean {
    try {
      const domain = new URL(url).hostname;
      
      // Check if domain is blocked
      if (this.config.blockedDomains.some(blocked => domain.includes(blocked))) {
        return false;
      }

      // Check if domain is in allowed list
      return this.config.allowedDomains.some(allowed => domain.includes(allowed));
    } catch {
      return false;
    }
  }

  // Apply rate limiting for external API calls
  public async checkRateLimit(url: string, userEmail: string): Promise<boolean> {
    try {
      const domain = new URL(url).hostname;
      const key = `${domain}:${userEmail}`;
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour window

      let rateLimitData = this.requestCounts.get(key);

      if (!rateLimitData || rateLimitData.resetTime < now) {
        // Reset count if window expired or new key
        rateLimitData = {
          count: 1,
          resetTime: now + windowMs,
        };
        this.requestCounts.set(key, rateLimitData);
        return true; // Allow request
      }

      const limit = this.config.rateLimitByDomain[domain] || 50; // Default limit
      
      if (rateLimitData.count >= limit) {
        // Rate limit exceeded
        await logSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          {
            domain: domain,
            userEmail: userEmail,
            currentCount: rateLimitData.count,
            limit: limit,
            resetTime: new Date(rateLimitData.resetTime).toISOString()
          }
        );
        return false;
      }

      // Increment count and allow request
      rateLimitData.count++;
      this.requestCounts.set(key, rateLimitData);
      return true;

    } catch {
      return false;
    }
  }

  // Apply data masking based on API type
  private applyMasking(data: any, apiType: string, isRequest: boolean = false): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Clone data to avoid modifying original
    const masked = JSON.parse(JSON.stringify(data));

    switch (apiType) {
      case 'jira':
        return this.maskJiraData(masked, isRequest);
      case 'supabase':
        return this.maskSupabaseData(masked, isRequest);
      case 'firebase':
        return this.maskFirebaseData(masked, isRequest);
      default:
        return this.maskGenericData(masked, isRequest);
    }
  }

  // Mask JIRA-specific sensitive data
  private maskJiraData(data: any, isRequest: boolean): any {
    const sensitiveJiraFields = [
      'api_token',
      'api_key',
      'token',
      'password',
      'secret',
      'key',
      'authentication',
      'authorization',
      'credentials'
    ];

    return this.maskSensitiveFields(data, sensitiveJiraFields, isRequest);
  }

  // Mask Supabase-specific sensitive data
  private maskSupabaseData(data: any, isRequest: boolean): any {
    const sensitiveSupabaseFields = [
      'anon_key',
      'service_role_key',
      'jwt_secret',
      'password',
      'access_token',
      'refresh_token',
      'api_key'
    ];

    return this.maskSensitiveFields(data, sensitiveSupabaseFields, isRequest);
  }

  // Mask Firebase-specific sensitive data
  private maskFirebaseData(data: any, isRequest: boolean): any {
    const sensitiveFirebaseFields = [
      'api_key',
      'private_key',
      'client_secret',
      'access_token',
      'refresh_token',
      'id_token',
      'auth_token'
    ];

    return this.maskSensitiveFields(data, sensitiveFirebaseFields, isRequest);
  }

  // Mask generic sensitive data
  private maskGenericData(data: any, isRequest: boolean): any {
    const genericSensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'api_key',
      'access_token',
      'refresh_token',
      'private_key',
      'public_key',
      'certificate',
      'credential',
      'auth'
    ];

    return this.maskSensitiveFields(data, genericSensitiveFields, isRequest);
  }

  // Core masking function
  private maskSensitiveFields(obj: any, sensitiveFields: string[], isRequest: boolean): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveFields(item, sensitiveFields, isRequest));
    }

    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field should be masked
      const shouldMask = sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );

      if (shouldMask) {
        if (typeof value === 'string' && value.length > 0) {
          // Mask string values
          if (value.length <= 4) {
            result[key] = '*'.repeat(value.length);
          } else {
            // Show first 2 and last 2 characters
            result[key] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
          }
        } else {
          result[key] = '[MASKED]';
        }
      } else {
        // Recursively process nested objects
        result[key] = this.maskSensitiveFields(value, sensitiveFields, isRequest);
      }
    }

    return result;
  }

  // Create a masked proxy for external API calls
  public createMaskedProxy(
    targetUrl: string,
    apiType: 'jira' | 'supabase' | 'firebase' | 'generic',
    userEmail: string
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // Check if domain is allowed
        if (!this.isDomainAllowed(targetUrl)) {
          await logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            {
              targetUrl: targetUrl,
              userEmail: userEmail,
              reason: 'Domain not allowed'
            },
            request
          );

          return NextResponse.json(
            { error: 'Access to this domain is not allowed' },
            { status: 403 }
          );
        }

        // Check rate limiting
        const rateLimitOk = await this.checkRateLimit(targetUrl, userEmail);
        if (!rateLimitOk) {
          return NextResponse.json(
            { error: 'Rate limit exceeded for this API' },
            { status: 429 }
          );
        }

        // Get request body and mask it
        let requestBody;
        try {
          requestBody = await request.json();
          requestBody = this.maskRequest(requestBody, apiType);
        } catch {
          // No JSON body or already consumed
        }

        // Make the external API call
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: {
            'Authorization': request.headers.get('authorization') || '',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: requestBody ? JSON.stringify(requestBody) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          await logSecurityEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            {
              targetUrl: targetUrl,
              userEmail: userEmail,
              statusCode: response.status,
              error: this.maskGenericData({ error: errorText }, false)
            },
            request
          );

          return NextResponse.json(
            { 
              error: `External API error: ${response.status}`,
              details: this.maskGenericData({ details: errorText }, false)
            },
            { status: response.status }
          );
        }

        // Get response data and mask it
        const responseData = await response.json();
        const maskedResponse = this.maskResponse(responseData, apiType);

        // Log successful API call (with masked data)
        await logSecurityEvent(
          SecurityEventType.DATA_ACCESS,
          {
            targetUrl: this.maskUrl(targetUrl),
            userEmail: userEmail,
            statusCode: response.status,
            method: request.method,
            responseSize: JSON.stringify(maskedResponse).length
          },
          request
        );

        return NextResponse.json(maskedResponse);

      } catch (error) {
        await logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            targetUrl: this.maskUrl(targetUrl),
            userEmail: userEmail,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          request
        );

        return NextResponse.json(
          { error: 'Internal proxy error' },
          { status: 500 }
        );
      }
    };
  }

  // Mask URLs to hide sensitive information
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Mask query parameters that might contain sensitive data
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
      
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          const value = urlObj.searchParams.get(param);
          if (value && value.length > 4) {
            urlObj.searchParams.set(param, value.substring(0, 2) + '***' + value.substring(value.length - 2));
          } else {
            urlObj.searchParams.set(param, '***');
          }
        }
      });

      return urlObj.toString();
    } catch {
      return '[MASKED_URL]';
    }
  }

  // Get masking statistics
  public getStats(): {
    totalRequests: number;
    requestsByDomain: Record<string, number>;
    rateLimitViolations: number;
    blockedRequests: number;
  } {
    const requestsByDomain: Record<string, number> = {};
    let totalRequests = 0;

    for (const [key, data] of Array.from(this.requestCounts.entries())) {
      const domain = key.split(':')[0];
      requestsByDomain[domain] = (requestsByDomain[domain] || 0) + data.count;
      totalRequests += data.count;
    }

    return {
      totalRequests,
      requestsByDomain,
      rateLimitViolations: 0, // Would need to track this separately
      blockedRequests: 0      // Would need to track this separately
    };
  }
}

// Global API masking manager instance
export const apiMaskingManager = new APIMaskingManager({
  enabled: process.env.API_MASKING_ENABLED !== 'false',
  allowedDomains: process.env.ALLOWED_API_DOMAINS?.split(',') || undefined,
  blockedDomains: process.env.BLOCKED_API_DOMAINS?.split(',') || undefined,
});

// Helper function to create masked API wrapper
export function withAPIMasking(
  apiType: 'jira' | 'supabase' | 'firebase' | 'generic'
) {
  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      // Extract user email
      const userEmail = extractUserFromRequest(request);

      try {
        // Execute handler
        const response = await handler(request);

        // If response contains external API data, mask it
        if (response.headers.get('content-type')?.includes('application/json')) {
          const responseData = await response.clone().json();
          const maskedData = apiMaskingManager.maskResponse(responseData, apiType);
          
          return NextResponse.json(maskedData, {
            status: response.status,
            headers: response.headers,
          });
        }

        return response;

      } catch (error) {
        // Log error without exposing sensitive information
        await logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            apiType: apiType,
            userEmail: userEmail,
            error: 'Masked API call failed'
          },
          request
        );

        throw error;
      }
    };
  };
}

// Helper to extract user from request
function extractUserFromRequest(request: NextRequest): string {
  const searchParams = new URL(request.url).searchParams;
  return searchParams.get('userEmail') || 
         request.headers.get('x-user-email') || 
         'anonymous';
}
