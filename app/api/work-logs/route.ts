import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUserServer } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Retrieve work logs for the current user
export const GET = withAudit(
  AuditEventType.READ,
  'work_logs',
  'User retrieved their work logs'
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

    // Build filters
    const filters: any = { user_email: user.email };
    if (projectId) filters.project_id = projectId;
    if (dateFrom) filters.start_time = { gte: dateFrom };
    if (dateTo) filters.end_time = { lte: dateTo };

    const response = await supabaseClient.getUserWorkLogs(user.email, {
      filters,
      order: { column: 'created_at', ascending: false },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      data: response.data,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount: response.count || 0,
        totalPages: Math.ceil((response.count || 0) / pageSize)
      }
    });

  } catch (error) {
    console.error('Error fetching work logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work logs' },
      { status: 500 }
    );
  }
});

// POST - Create a new work log
export const POST = withAudit(
  AuditEventType.CREATE,
  'work_logs',
  'User created a new work log'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUserServer(request);
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const workLogData = {
      ...body,
      user_email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await supabaseClient.insert('work_logs', workLogData);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Work log created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating work log:', error);
    return NextResponse.json(
      { error: 'Failed to create work log' },
      { status: 500 }
    );
  }
});

// PUT - Update an existing work log
export const PUT = withAudit(
  AuditEventType.UPDATE,
  'work_logs',
  'User updated a work log'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUserServer(request);
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Work log ID is required' },
        { status: 400 }
      );
    }

    // Verify the work log belongs to the user
    const existingLog = await supabaseClient.get('work_logs', {
      select: 'id',
      filters: { id, user_email: user.email }
    });

    if (existingLog.error || !existingLog.data || existingLog.data.length === 0) {
      return NextResponse.json(
        { error: 'Work log not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.update('work_logs', id, {
      ...updateData,
      updated_at: new Date().toISOString()
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Work log updated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error updating work log:', error);
    return NextResponse.json(
      { error: 'Failed to update work log' },
      { status: 500 }
    );
  }
});

// DELETE - Delete a work log
export const DELETE = withAudit(
  AuditEventType.DELETE,
  'work_logs',
  'User deleted a work log'
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Work log ID is required' },
        { status: 400 }
      );
    }

    // Verify the work log belongs to the user
    const existingLog = await supabaseClient.get('work_logs', {
      select: 'id',
      filters: { id, user_email: user.email }
    });

    if (existingLog.error || !existingLog.data || existingLog.data.length === 0) {
      return NextResponse.json(
        { error: 'Work log not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.delete('work_logs', id);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Work log deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting work log:', error);
    return NextResponse.json(
      { error: 'Failed to delete work log' },
      { status: 500 }
    );
  }
});
