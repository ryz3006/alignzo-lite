import { NextRequest, NextResponse } from 'next/server';
import { archivalManager, triggerManualCleanup, getCleanupStats } from '@/lib/archival-manager';
import { withAdminAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { isAdminUserServer } from '@/lib/auth';

// GET - Get archival statistics
export const GET = withAdminAudit(AuditEventType.READ)(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
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

    return addRateLimitHeaders(response, request, authLimiterConfig);

  } catch (error) {
    console.error('Error fetching archival stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST - Trigger manual cleanup
export const POST = withAdminAudit(AuditEventType.DELETE)(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
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

    return addRateLimitHeaders(response, request, authLimiterConfig);

  } catch (error) {
    console.error('Error triggering manual cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to trigger cleanup' },
      { status: 500 }
    );
  }
});

// Helper function to extract user email
function extractUserEmail(request: NextRequest): string {
  const searchParams = new URL(request.url).searchParams;
  return searchParams.get('userEmail') || 
         request.headers.get('x-user-email') || 
         'anonymous';
}
