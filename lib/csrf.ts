import { NextRequest, NextResponse } from 'next/server';
import Tokens from 'csrf';

// Initialize CSRF token generator
const tokens = new Tokens();

// CSRF configuration
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

// Generate CSRF token
export function generateCSRFToken(): string {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);
  return `${secret}:${token}`;
}

// Verify CSRF token
export function verifyCSRFToken(token: string): boolean {
  try {
    const [secret, tokenValue] = token.split(':');
    if (!secret || !tokenValue) {
      return false;
    }
    return tokens.verify(secret, tokenValue);
  } catch (error) {
    return false;
  }
}

// CSRF middleware for API routes
export function withCSRF(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async function(request: NextRequest): Promise<NextResponse> {
    // Skip CSRF for GET requests (they should be safe)
    if (request.method === 'GET') {
      return handler(request);
    }

    // Check for CSRF token in headers
    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.headers.get('csrf-token');

    if (!csrfToken) {
      return NextResponse.json(
        { 
          error: 'CSRF token missing',
          message: 'CSRF token is required for state-changing operations'
        },
        { status: 403 }
      );
    }

    // Verify CSRF token
    if (!verifyCSRFToken(csrfToken)) {
      return NextResponse.json(
        { 
          error: 'Invalid CSRF token',
          message: 'CSRF token verification failed'
        },
        { status: 403 }
      );
    }

    // Token is valid, proceed with the request
    return handler(request);
  };
}

// API endpoint to get CSRF token
export async function getCSRFToken(request: NextRequest): Promise<NextResponse> {
  const token = generateCSRFToken();
  
  return NextResponse.json({
    csrfToken: token,
    message: 'CSRF token generated successfully'
  });
}

// Helper function to add CSRF token to response headers
export function addCSRFTokenToResponse(response: NextResponse): NextResponse {
  const token = generateCSRFToken();
  response.headers.set('X-CSRF-Token', token);
  return response;
}

// Validate request origin (additional security)
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // Allow requests with no origin (same-origin requests)
  if (!origin) {
    return true;
  }

  // Check if origin matches host
  const allowedOrigins = [
    `http://${host}`,
    `https://${host}`,
    'http://localhost:3000',
    'https://localhost:3000'
  ];

  return allowedOrigins.includes(origin);
}

// Enhanced CSRF middleware with origin validation
export function withEnhancedCSRF(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async function(request: NextRequest): Promise<NextResponse> {
    // Skip CSRF for GET requests
    if (request.method === 'GET') {
      return handler(request);
    }

    // Validate origin
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { 
          error: 'Invalid origin',
          message: 'Request origin validation failed'
        },
        { status: 403 }
      );
    }

    // Apply CSRF protection
    return withCSRF(handler)(request);
  };
}
