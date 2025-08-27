import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUser } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Retrieve master mappings
export const GET = withAudit(
  AuditEventType.READ,
  'ticket_master_mappings',
  'User retrieved master mappings'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sourceId = searchParams.get('sourceId');
    const searchTerm = searchParams.get('search');

    // Build filters
    const filters: any = {};
    if (sourceId) filters.source_id = sourceId;

    const response = await supabaseClient.get('ticket_master_mappings', {
      select: '*',
      filters,
      order: { column: 'created_at', ascending: false },
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Filter by search term if provided
    let filteredData = response.data || [];
    if (searchTerm) {
      filteredData = filteredData.filter((mapping: any) =>
        mapping.source_assignee_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.mapped_user_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return NextResponse.json({
      data: filteredData,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount: filteredData.length,
        totalPages: Math.ceil(filteredData.length / pageSize)
      }
    });

  } catch (error) {
    console.error('Error fetching master mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch master mappings' },
      { status: 500 }
    );
  }
});

// POST - Create a new master mapping
export const POST = withAudit(
  AuditEventType.CREATE,
  'ticket_master_mappings',
  'User created a new master mapping'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { source_id, source_assignee_value, mapped_user_email } = body;

    if (!source_id || !source_assignee_value || !mapped_user_email) {
      return NextResponse.json(
        { error: 'Source ID, assignee value, and mapped user email are required' },
        { status: 400 }
      );
    }

    const mappingData = {
      source_id,
      source_assignee_value: source_assignee_value.trim(),
      mapped_user_email: mapped_user_email.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await supabaseClient.insert('ticket_master_mappings', mappingData);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Master mapping created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating master mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create master mapping' },
      { status: 500 }
    );
  }
});

// PUT - Update an existing master mapping
export const PUT = withAudit(
  AuditEventType.UPDATE,
  'ticket_master_mappings',
  'User updated a master mapping'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, source_id, source_assignee_value, mapped_user_email, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    const updateData = {
      ...(source_id && { source_id }),
      ...(source_assignee_value && { source_assignee_value: source_assignee_value.trim() }),
      ...(mapped_user_email && { mapped_user_email: mapped_user_email.trim() }),
      ...(typeof is_active === 'boolean' && { is_active }),
      updated_at: new Date().toISOString()
    };

    const response = await supabaseClient.update('ticket_master_mappings', id, updateData);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Master mapping updated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error updating master mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update master mapping' },
      { status: 500 }
    );
  }
});

// DELETE - Delete a master mapping
export const DELETE = withAudit(
  AuditEventType.DELETE,
  'ticket_master_mappings',
  'User deleted a master mapping'
)(async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();
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
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    const response = await supabaseClient.delete('ticket_master_mappings', id);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Master mapping deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting master mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete master mapping' },
      { status: 500 }
    );
  }
});
