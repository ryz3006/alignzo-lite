import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthSchema } from '@/lib/validation';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { verifyAdminCredentials } from '@/lib/password';
import { logAuthAttempt, logError, SecurityEventType, logSecurityEvent } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  try {
    const body = await request.json();
    
    // Validate input
    const { email, password } = adminAuthSchema.parse(body);

    // Verify admin credentials using secure password hashing
    const isValidCredentials = await verifyAdminCredentials(email, password);
    
    // Log authentication attempt
    logAuthAttempt(email, isValidCredentials, request, {
      endpoint: '/api/admin/auth',
      userType: 'admin'
    });
    
    if (!isValidCredentials) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Return success with admin session data
    const response = NextResponse.json({
      success: true,
      admin: {
        email: email,
        isAdmin: true
      }
    });
    
    // Add rate limit headers
    return addRateLimitHeaders(response, request, authLimiterConfig);

  } catch (error) {
    if (error instanceof z.ZodError) {
      logSecurityEvent(
        SecurityEventType.INVALID_INPUT,
        { 
          endpoint: '/api/admin/auth',
          validationErrors: error.errors 
        },
        request
      );
      
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    logError(error as Error, { endpoint: '/api/admin/auth' }, request);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
