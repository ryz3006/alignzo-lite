import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || searchParams.get('integrationUserEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get user's Jira project mappings
    const { data, error } = await supabase
      .from('jira_project_mappings')
      .select('*,project:projects(*)')
      .eq('integration_user_email', userEmail);

    if (error) {
      console.error('Error fetching Jira project mappings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mappings: data || []
    });

  } catch (error) {
    console.error('Error in Jira project mappings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update project mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dashboard_project_id, 
      jira_project_key, 
      jira_project_name, 
      integration_user_email 
    } = body;

    if (!dashboard_project_id || !jira_project_key || !integration_user_email) {
      return NextResponse.json(
        { error: 'Dashboard project ID, JIRA project key, and integration user email are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const { data: existingMappings, error: checkError } = await supabase
      .from('jira_project_mappings')
      .select('id')
      .eq('dashboard_project_id', dashboard_project_id)
      .eq('jira_project_key', jira_project_key)
      .eq('integration_user_email', integration_user_email);

    if (checkError) {
      console.error('Error checking existing mapping:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing mapping' },
        { status: 500 }
      );
    }

    const existingMapping = existingMappings && existingMappings.length > 0 ? existingMappings[0] : null;

    if (existingMapping) {
      // Update existing mapping
      const { data: updateData, error: updateError } = await supabase
        .from('jira_project_mappings')
        .update({
          jira_project_name: jira_project_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMapping.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating project mapping:', updateError);
        return NextResponse.json(
          { error: 'Failed to update project mapping' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Project mapping updated successfully',
        mapping: updateData
      });
    } else {
      // Create new mapping
      const { data: insertData, error: insertError } = await supabase
        .from('jira_project_mappings')
        .insert({
          dashboard_project_id: dashboard_project_id,
          jira_project_key: jira_project_key,
          jira_project_name: jira_project_name,
          integration_user_email: integration_user_email
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating project mapping:', insertError);
        return NextResponse.json(
          { error: 'Failed to create project mapping' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Project mapping created successfully',
        mapping: insertData
      });
    }
  } catch (error) {
    console.error('Error in project mapping operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a project mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    // Delete mapping
    const { error } = await supabase
      .from('jira_project_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Error deleting project mapping:', error);
      return NextResponse.json(
        { error: 'Failed to delete project mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project mapping deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting project mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
