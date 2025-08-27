import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { archivalManager, triggerManualCleanup, getCleanupStats } from '@/lib/archival-manager';
import { withAdminAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { isAdminUserServer } from '@/lib/auth';

// GET - Get archival statistics
export async function GET(request: NextRequest) {
  // Check if Supabase is properly configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 500 }
    );
  }

  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (!rateLimitResponse.success) {
    return NextResponse.json(
      { error: rateLimitResponse.message || 'Rate limit exceeded' },
      { status: rateLimitResponse.statusCode || 429 }
    );
  }

  try {
    // Check admin authentication
    const userEmail = extractUserEmail(request);
    const isAdmin = await isAdminUserServer(userEmail);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get cleanup statistics
    const stats = await getCleanupStats();

    const response = NextResponse.json({
      success: true,
      stats: stats
    });

    return addRateLimitHeaders(response, 4, new Date(Date.now() + 900000).toISOString());

  } catch (error) {
    console.error('Error fetching archival stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual cleanup
export async function POST(request: NextRequest) {
  // Check if Supabase is properly configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Service configuration error' },
      { status: 500 }
    );
  }

  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (!rateLimitResponse.success) {
    return NextResponse.json(
      { error: rateLimitResponse.message || 'Rate limit exceeded' },
      { status: rateLimitResponse.statusCode || 429 }
    );
  }

  try {
    // Check admin authentication
    const userEmail = extractUserEmail(request);
    const isAdmin = await isAdminUserServer(userEmail);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Trigger manual cleanup
    const results = await triggerManualCleanup();

    const response = NextResponse.json({
      success: true,
      message: 'Manual cleanup completed successfully',
      results: results
    });

    return addRateLimitHeaders(response, 4, new Date(Date.now() + 900000).toISOString());

  } catch (error) {
    console.error('Error triggering manual cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to trigger cleanup' },
      { status: 500 }
    );
  }
}

// Helper function to extract user email
function extractUserEmail(request: NextRequest): string {
  const searchParams = new URL(request.url).searchParams;
  return searchParams.get('userEmail') || 
         request.headers.get('x-user-email') || 
         'anonymous';
}
