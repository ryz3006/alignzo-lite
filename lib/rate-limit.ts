import { NextRequest, NextResponse } from 'next/server';
import { logRateLimitEvent } from './logger';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

// In-memory store for rate limiting (use Redis in production)
const store = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(store.entries())) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

// General API rate limiter configuration (relaxed)
export const apiLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
};

// Authentication endpoints (same as before)
export const authLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
};

// JIRA integration rate limiter (external API calls) - same as before
export const jiraLimiterConfig: RateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute
  message: 'Too many JIRA API requests, please try again later.',
};

// Special relaxed rate limiting for upload and import operations
export const uploadLimiterConfig: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 upload/import requests per 5 minutes
  message: 'Too many upload/import requests, please try again later.',
};

// Very relaxed rate limiting for file operations
export const fileOperationLimiterConfig: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 file operations per 10 minutes
  message: 'Too many file operations, please try again later.',
};

// Apply rate limiting to requests
export function applyRateLimit(request: NextRequest, config: RateLimitConfig): NextResponse | null {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';

  const key = `rate_limit:${ip}`;
  const now = Date.now();
  
  // Get or create rate limit data for this IP
  let rateLimitData = store.get(key);
  
  if (!rateLimitData || now > rateLimitData.resetTime) {
    // Reset or create new rate limit data
    rateLimitData = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(key, rateLimitData);
    return null; // Allow request
  }
  
  // Check if limit exceeded
  if (rateLimitData.count >= config.max) {
    // Log rate limit exceeded event
    logRateLimitEvent(request, 'api_rate_limit', config.max, rateLimitData.count);
    
    const resetTime = new Date(rateLimitData.resetTime).toISOString();
    return NextResponse.json(
      { 
        error: config.message,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
        resetTime: resetTime
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitData.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitData.resetTime - now) / 1000).toString(),
        }
      }
    );
  }
  
  // Increment count and allow request
  rateLimitData.count++;
  store.set(key, rateLimitData);
  
  return null; // Allow request
}

// Helper function to add rate limit headers to successful responses
export function addRateLimitHeaders(response: NextResponse, request: NextRequest, config: RateLimitConfig): NextResponse {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
             
  const key = `rate_limit:${ip}`;
  const rateLimitData = store.get(key);
  
  if (rateLimitData) {
    const remaining = Math.max(0, config.max - rateLimitData.count);
    response.headers.set('X-RateLimit-Limit', config.max.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitData.resetTime.toString());
  }
  
  return response;
}

// Middleware wrapper for easy use
export function withRateLimit(config: RateLimitConfig) {
  return function(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      // Apply rate limiting
      const rateLimitResponse = applyRateLimit(request, config);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      
      // Process the request
      const response = await handler(request);
      
      // Add rate limit headers to response
      return addRateLimitHeaders(response, request, config);
    };
  };
}
