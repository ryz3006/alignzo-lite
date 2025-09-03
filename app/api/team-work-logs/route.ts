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

    console.log('🔍 [TEAM-WORK-LOGS] User authenticated:', user.email);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userEmail = searchParams.get('userEmail');

    console.log('🔍 [TEAM-WORK-LOGS] Query params:', { page, pageSize, projectId, dateFrom, dateTo, userEmail });

    // Get user's team memberships
    console.log('🔍 [TEAM-WORK-LOGS] Getting team memberships for user:', user.email);
    const teamMemberships = await supabaseClient.getTeamMemberships(user.email);
    
    if (teamMemberships.error) {
      console.error('❌ [TEAM-WORK-LOGS] Error loading team memberships:', teamMemberships.error);
      return NextResponse.json(
        { error: 'Failed to load team memberships', details: teamMemberships.error },
        { status: 500 }
      );
    }

    console.log('🔍 [TEAM-WORK-LOGS] Team memberships response:', teamMemberships);

    // Get all team member emails
    const teamMemberEmails = teamMemberships.data?.map((membership: any) => membership.users?.email).filter(Boolean) || [];

    console.log('🔍 [TEAM-WORK-LOGS] Team member emails extracted:', teamMemberEmails);

    // If user is not in any teams, show only their own work logs
    if (teamMemberEmails.length === 0) {
      console.log('🔍 [TEAM-WORK-LOGS] No team members found, using only user email:', user.email);
      teamMemberEmails.push(user.email);
    }

    // Build filters
    const filters: any = {};
    if (projectId) filters.project_id = projectId;
    if (userEmail) filters.user_email = userEmail;
    if (dateFrom) filters.start_time = { gte: dateFrom };
    if (dateTo) filters.end_time = { lte: dateTo };

    console.log('🔍 [TEAM-WORK-LOGS] Final filters:', filters);
    console.log('🔍 [TEAM-WORK-LOGS] Team member emails for query:', teamMemberEmails);

    // Get work logs with project information
    const response = await supabaseClient.getTeamWorkLogs(teamMemberEmails, {
      filters,
      order: { column: 'created_at', ascending: false },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    if (response.error) {
      console.error('❌ [TEAM-WORK-LOGS] Error fetching work logs:', response.error);
      throw new Error(response.error);
    }

    console.log('🔍 [TEAM-WORK-LOGS] Work logs fetched successfully, count:', response.data?.length || 0);

    // Get total count for pagination
    const countResponse = await supabaseClient.getTeamWorkLogs(teamMemberEmails, {
      filters,
      select: 'id'
    });

    if (countResponse.error) {
      console.error('❌ [TEAM-WORK-LOGS] Error getting count:', countResponse.error);
    }

    const totalCount = countResponse.data?.length || 0;
    console.log('🔍 [TEAM-WORK-LOGS] Total count:', totalCount);

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
    console.error('❌ [TEAM-WORK-LOGS] Error fetching team work logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team work logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
