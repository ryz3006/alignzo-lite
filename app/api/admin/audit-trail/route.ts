import { NextRequest, NextResponse } from 'next/server';
import { auditTrail } from '@/lib/audit-trail';
import { withAdminAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { isAdminUserServer } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (!rateLimitResponse.success) {
    return NextResponse.json(
      { error: rateLimitResponse.message || 'Rate limit exceeded' },
      { status: rateLimitResponse.statusCode || 429 }
    );
  }

  try {
    // Check admin authentication via session or header
    const adminEmail = request.headers.get('x-admin-email');
    const authHeader = request.headers.get('authorization');
    
    // If no admin email in headers, check if it's a valid admin session
    if (!adminEmail && !authHeader) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }
    
    // Verify admin credentials
    if (adminEmail) {
      const isAdmin = await isAdminUserServer(adminEmail);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userEmailFilter = searchParams.get('userEmail') || undefined;
    const eventType = searchParams.get('eventType') || undefined;
    const tableName = searchParams.get('tableName') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const success = searchParams.get('success') || undefined;

    // Build filters
    const filters: any = {
      userEmail: userEmailFilter,
      eventType: eventType as AuditEventType | undefined,
      tableName,
      startDate: dateFrom,
      endDate: dateTo,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };

    // Add success filter if provided
    if (success !== undefined) {
      filters.success = success === 'true';
    }

    // Query audit trail
    const entries = await auditTrail.queryAuditTrail(filters);

    // Get total count for pagination
    const totalCount = await auditTrail.getAuditTrailCount(filters);
    const totalPages = Math.ceil(totalCount / pageSize);

    const response = NextResponse.json({
      entries,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      },
    });

    return addRateLimitHeaders(response, 19, new Date(Date.now() + 900000).toISOString());

  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
