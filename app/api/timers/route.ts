import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUserServer } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Retrieve timers for the current user
export const GET = withAudit(
  AuditEventType.READ,
  'timers',
  'User retrieved their timers'
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
    const status = searchParams.get('status');

    // Build filters
    const filters: any = { user_email: user.email };
    if (projectId) filters.project_id = projectId;
    if (status) filters.status = status;

    const response = await supabaseClient.get('timers', {
      select: '*,project:projects(*)',
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
    console.error('Error fetching timers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timers' },
      { status: 500 }
    );
  }
});

// POST - Create a new timer
export const POST = withAudit(
  AuditEventType.CREATE,
  'timers',
  'User created a new timer'
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
    const timerData = {
      ...body,
      user_email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await supabaseClient.insert('timers', timerData);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Timer created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating timer:', error);
    return NextResponse.json(
      { error: 'Failed to create timer' },
      { status: 500 }
    );
  }
});

// PUT - Update an existing timer
export const PUT = withAudit(
  AuditEventType.UPDATE,
  'timers',
  'User updated a timer'
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
        { error: 'Timer ID is required' },
        { status: 400 }
      );
    }

    // Verify the timer belongs to the user
    const existingTimer = await supabaseClient.get('timers', {
      select: 'id',
      filters: { id, user_email: user.email }
    });

    if (existingTimer.error || !existingTimer.data || existingTimer.data.length === 0) {
      return NextResponse.json(
        { error: 'Timer not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.update('timers', id, {
      ...updateData,
      updated_at: new Date().toISOString()
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Timer updated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error updating timer:', error);
    return NextResponse.json(
      { error: 'Failed to update timer' },
      { status: 500 }
    );
  }
});

// DELETE - Delete a timer
export const DELETE = withAudit(
  AuditEventType.DELETE,
  'timers',
  'User deleted a timer'
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
        { error: 'Timer ID is required' },
        { status: 400 }
      );
    }

    // Verify the timer belongs to the user
    const existingTimer = await supabaseClient.get('timers', {
      select: 'id',
      filters: { id, user_email: user.email }
    });

    if (existingTimer.error || !existingTimer.data || existingTimer.data.length === 0) {
      return NextResponse.json(
        { error: 'Timer not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.delete('timers', id);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Timer deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting timer:', error);
    return NextResponse.json(
      { error: 'Failed to delete timer' },
      { status: 500 }
    );
  }
});
