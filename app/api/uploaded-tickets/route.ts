import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUserServer } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET - Retrieve uploaded tickets
export const GET = withAudit(
  AuditEventType.READ,
  'uploaded_tickets',
  'User retrieved uploaded tickets'
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
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const projectId = searchParams.get('projectId');
    const sourceId = searchParams.get('sourceId');
    const status = searchParams.get('status');
    const searchTerm = searchParams.get('search');

    // Build filters
    const filters: any = { uploaded_by: user.email };
    if (projectId) filters.project_id = projectId;
    if (sourceId) filters.source_id = sourceId;
    if (status) filters.status = status;

    const response = await supabaseClient.get('uploaded_tickets', {
      select: '*,project:projects(*),source:ticket_sources(*)',
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
      filteredData = filteredData.filter((ticket: any) =>
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticket_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assignee?.toLowerCase().includes(searchTerm.toLowerCase())
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
    console.error('Error fetching uploaded tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch uploaded tickets' },
      { status: 500 }
    );
  }
});

// POST - Create a new uploaded ticket
export const POST = withAudit(
  AuditEventType.CREATE,
  'uploaded_tickets',
  'User created a new uploaded ticket'
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
    const ticketData = {
      ...body,
      uploaded_by: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await supabaseClient.insert('uploaded_tickets', ticketData);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Ticket created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error creating uploaded ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create uploaded ticket' },
      { status: 500 }
    );
  }
});

// PUT - Update an existing uploaded ticket
export const PUT = withAudit(
  AuditEventType.UPDATE,
  'uploaded_tickets',
  'User updated an uploaded ticket'
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
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Verify the ticket belongs to the user
    const existingTicket = await supabaseClient.get('uploaded_tickets', {
      select: 'id',
      filters: { id, uploaded_by: user.email }
    });

    if (existingTicket.error || !existingTicket.data || existingTicket.data.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.update('uploaded_tickets', id, {
      ...updateData,
      updated_at: new Date().toISOString()
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Ticket updated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Error updating uploaded ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update uploaded ticket' },
      { status: 500 }
    );
  }
});

// DELETE - Delete an uploaded ticket
export const DELETE = withAudit(
  AuditEventType.DELETE,
  'uploaded_tickets',
  'User deleted an uploaded ticket'
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
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Verify the ticket belongs to the user
    const existingTicket = await supabaseClient.get('uploaded_tickets', {
      select: 'id',
      filters: { id, uploaded_by: user.email }
    });

    if (existingTicket.error || !existingTicket.data || existingTicket.data.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found or access denied' },
        { status: 404 }
      );
    }

    const response = await supabaseClient.delete('uploaded_tickets', id);

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({
      message: 'Ticket deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting uploaded ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete uploaded ticket' },
      { status: 500 }
    );
  }
});
