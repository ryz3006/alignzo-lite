import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUserServer } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Retrieve work logs for all team members
export const GET = withAudit(
  AuditEventType.READ,
  'work_logs',
  'User retrieved team work logs'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUserServer(request);
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userEmail = searchParams.get('userEmail');

    // Get user's team memberships
    const teamMemberships = await supabaseClient.getTeamMemberships(user.email);
    if (teamMemberships.error) {
      console.error('Error loading team memberships:', teamMemberships.error);
      return NextResponse.json(
        { error: 'Failed to load team memberships' },
        { status: 500 }
      );
    }

    // Get all team member emails
    const teamMemberEmails = teamMemberships.data?.map((membership: any) => membership.users?.email).filter(Boolean) || [];

    // If user is not in any teams, show only their own work logs
    if (teamMemberEmails.length === 0) {
      teamMemberEmails.push(user.email);
    }

    // Build filters
    const filters: any = { user_email: teamMemberEmails };
    if (projectId) filters.project_id = projectId;
    if (userEmail) filters.user_email = userEmail;
    if (dateFrom) filters.start_time = { gte: dateFrom };
    if (dateTo) filters.end_time = { lte: dateTo };

    // Get work logs with project information
    const response = await supabaseClient.query({
      table: 'work_logs',
      action: 'select',
      select: '*,project:projects(*)',
      filters,
      order: { column: 'created_at', ascending: false },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Get total count for pagination
    const countResponse = await supabaseClient.query({
      table: 'work_logs',
      action: 'select',
      select: 'id',
      filters
    });

    const totalCount = countResponse.data?.length || 0;

    return NextResponse.json({
      data: response.data || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });

  } catch (error) {
    console.error('Error fetching team work logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team work logs' },
      { status: 500 }
    );
  }
});
