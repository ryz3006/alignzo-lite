import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
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
    const { data: mapping, error: mappingError } = await supabase
      .from('ticket_upload_mappings')
      .select('*,source:ticket_sources(*),project:projects(*)')
      .eq('id', mappingId)
      .single();

    if (mappingError || !mapping) {
      return NextResponse.json(
        { error: 'Invalid mapping configuration' },
        { status: 400 }
      );
    }

    // Create upload session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        filename: file.name,
        file_size: file.size,
        mapping_id: mappingId,
        status: 'processing',
        total_records: 0,
        processed_records: 0,
        successful_uploads: 0,
        failed_uploads: 0,
        uploaded_by: user.email
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating upload session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create upload session' },
        { status: 500 }
      );
    }

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
        // For Excel files, you would need a library like 'xlsx'
        // For now, return an error
        return NextResponse.json(
          { error: 'Excel file processing not implemented yet. Please use CSV files.' },
          { status: 400 }
        );
      }

      // Update session with total records
      await supabase
        .from('upload_sessions')
        .update({ total_records: records.length })
        .eq('id', session.id);

      // Process records and insert into uploaded_tickets
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          // Map CSV fields to ticket fields (this mapping should be configurable)
          const ticketData = {
            incident_id: record.incident_id || record.ticket_id || record.id || `UPLOAD_${Date.now()}_${i}`,
            priority: record.priority || 'Medium',
            status: record.status || 'Open',
            assignee: record.assignee || '',
            summary: record.summary || record.description || '',
            description: record.description || record.summary || '',
            user_name: record.user_name || record.reported_by || '',
            reported_date1: record.created_date || record.reported_date || new Date().toISOString(),
            mapping_id: mappingId,
            upload_session_id: session.id
          };

          const { error: insertError } = await supabase
            .from('uploaded_tickets')
            .insert(ticketData);

          if (insertError) {
            throw insertError;
          }

          successCount++;
        } catch (error) {
          failureCount++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Update progress
        await supabase
          .from('upload_sessions')
          .update({ 
            processed_records: i + 1,
            successful_uploads: successCount,
            failed_uploads: failureCount
          })
          .eq('id', session.id);
      }

      // Update final session status
      const finalStatus = failureCount === 0 ? 'completed' : (successCount === 0 ? 'failed' : 'completed');
      await supabase
        .from('upload_sessions')
        .update({ 
          status: finalStatus,
          error_details: errors.length > 0 ? errors.join('\n') : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      return NextResponse.json({
        success: true,
        session_id: session.id,
        total_records: records.length,
        successful_uploads: successCount,
        failed_uploads: failureCount,
        message: `Upload completed. ${successCount} tickets uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}.`
      });

    } catch (parseError) {
      // Update session as failed
      await supabase
        .from('upload_sessions')
        .update({ 
          status: 'failed',
          error_details: parseError instanceof Error ? parseError.message : 'File parsing failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      return NextResponse.json(
        { error: `File parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
