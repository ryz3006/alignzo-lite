import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';
import { applyRateLimit, apiLimiterConfig } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, apiLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const token = generateCSRFToken();
    
    return NextResponse.json({
      csrfToken: token,
      message: 'CSRF token generated successfully'
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
