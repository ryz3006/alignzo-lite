import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAdminAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { isAdminUserServer } from '@/lib/auth';

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const userEmailFilter = searchParams.get('userEmail') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const acknowledged = searchParams.get('acknowledged') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Build query
    let query = supabase
      .from('security_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (userEmailFilter) {
      query = query.eq('user_email', userEmailFilter);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (acknowledged === 'unacknowledged') {
      query = query.eq('acknowledged', false);
    } else if (acknowledged === 'acknowledged') {
      query = query.eq('acknowledged', true);
    } else if (acknowledged === 'resolved') {
      query = query.eq('resolved', true);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Get total count for pagination with same filters
    let countQuery = supabase
      .from('security_alerts')
      .select('*', { count: 'exact', head: true });

    // Apply same filters to count query
    if (userEmailFilter) {
      countQuery = countQuery.eq('user_email', userEmailFilter);
    }
    if (severity) {
      countQuery = countQuery.eq('severity', severity);
    }
    if (acknowledged === 'unacknowledged') {
      countQuery = countQuery.eq('acknowledged', false);
    } else if (acknowledged === 'acknowledged') {
      countQuery = countQuery.eq('acknowledged', true);
    } else if (acknowledged === 'resolved') {
      countQuery = countQuery.eq('resolved', true);
    }
    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo);
    }

    const { count: totalCount } = await countQuery;
    const totalPages = Math.ceil((totalCount || 0) / pageSize);

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    // Execute query
    const { data: alerts, error } = await query;

    if (error) {
      throw error;
    }

    const response = NextResponse.json({
      alerts: alerts || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      },
    });

    return addRateLimitHeaders(response, request, authLimiterConfig);

  } catch (error) {
    console.error('Error fetching security alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
