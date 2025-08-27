import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { withAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { getCurrentUser } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export const POST = withAudit(
  AuditEventType.DATA_IMPORT,
  'tickets',
  'User uploaded ticket data'
)(async (request: NextRequest) => {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingId = formData.get('mapping_id') as string;

    if (!file || !mappingId) {
      return NextResponse.json(
        { error: 'File and mapping ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Only CSV and Excel files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Get mapping details
    const mappingResponse = await supabaseClient.get('ticket_upload_mappings', {
      select: '*,source:ticket_sources(*),project:projects(*)',
      filters: { id: mappingId }
    });

    if (mappingResponse.error || !mappingResponse.data || mappingResponse.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid mapping configuration' },
        { status: 400 }
      );
    }

    const mapping = mappingResponse.data[0];

    // Create upload session
    const sessionResponse = await supabaseClient.insert('upload_sessions', {
      filename: file.name,
      file_size: file.size,
      mapping_id: mappingId,
      status: 'processing',
      total_records: 0,
      processed_records: 0,
      successful_uploads: 0,
      failed_uploads: 0,
      uploaded_by: user.email
    });

    if (sessionResponse.error) {
      console.error('Error creating upload session:', sessionResponse.error);
      return NextResponse.json(
        { error: 'Failed to create upload session' },
        { status: 500 }
      );
    }

    const session = sessionResponse.data[0];

    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    // Parse CSV file (simplified implementation)
    let records: any[] = [];
    try {
      if (file.name.endsWith('.csv')) {
        const textContent = fileContent.toString('utf-8');
        const lines = textContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain header and at least one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const record: any = {};
          
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });
          
          records.push(record);
        }
      } else {
        // For Excel files, you would use a library like xlsx
        // For now, we'll return an error
        return NextResponse.json(
          { error: 'Excel file parsing not implemented yet' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse file content' },
        { status: 400 }
      );
    }

    // Update session with total records
    await supabaseClient.update('upload_sessions', session.id, {
      total_records: records.length
    });

    // Process records (simplified - in production you'd want to process in batches)
    let successfulUploads = 0;
    let failedUploads = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Map record fields to ticket structure based on mapping
        const ticketData = {
          project_id: mapping.project_id,
          source_id: mapping.source_id,
          ticket_id: record[mapping.source_organization_field] || '',
          title: record.title || record.summary || '',
          description: record.description || '',
          status: record.status || 'Open',
          priority: record.priority || 'Medium',
          assignee: record.assignee || '',
          reporter: record.reporter || '',
          created_date: record.created || record.created_date || new Date().toISOString(),
          updated_date: record.updated || record.updated_date || new Date().toISOString(),
          raw_data: record,
          uploaded_by: user.email,
          upload_session_id: session.id
        };

        const ticketResponse = await supabaseClient.insert('uploaded_tickets', ticketData);
        
        if (ticketResponse.error) {
          throw new Error(ticketResponse.error);
        }
        
        successfulUploads++;
      } catch (error) {
        failedUploads++;
        errors.push(`Row ${successfulUploads + failedUploads}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update session with final status
    const finalStatus = failedUploads === 0 ? 'completed' : 'completed_with_errors';
    await supabaseClient.update('upload_sessions', session.id, {
      status: finalStatus,
      processed_records: records.length,
      successful_uploads: successfulUploads,
      failed_uploads: failedUploads,
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null
    });

    return NextResponse.json({
      message: 'Upload completed',
      session_id: session.id,
      total_records: records.length,
      successful_uploads: successfulUploads,
      failed_uploads: failedUploads,
      errors: errors.slice(0, 5) // Return first 5 errors
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
});
