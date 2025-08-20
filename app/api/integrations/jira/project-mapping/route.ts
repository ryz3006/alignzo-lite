import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Retrieve project mappings for a specific integration user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationUserEmail = searchParams.get('integrationUserEmail');
    const dashboardProjectId = searchParams.get('dashboardProjectId');

    if (!integrationUserEmail) {
      return NextResponse.json(
        { error: 'Integration user email is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('jira_project_mappings')
      .select(`
        *,
        project:projects(id, name, product, country)
      `)
      .eq('integration_user_email', integrationUserEmail);

    if (dashboardProjectId) {
      query = query.eq('dashboard_project_id', dashboardProjectId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mappings: data || [] });
  } catch (error) {
    console.error('Error fetching project mappings:', error);
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

    let result;
    if (existingMapping) {
      // Update existing mapping
      const { data, error } = await supabase
        .from('jira_project_mappings')
        .update({
          jira_project_name: jira_project_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMapping.id)
        .select(`
          *,
          project:projects(id, name, product, country)
        `)
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new mapping
      const { data, error } = await supabase
        .from('jira_project_mappings')
        .insert({
          dashboard_project_id: dashboard_project_id,
          jira_project_key: jira_project_key,
          jira_project_name: jira_project_name,
          integration_user_email: integration_user_email
        })
        .select(`
          *,
          project:projects(id, name, product, country)
        `)
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      message: existingMapping ? 'Project mapping updated successfully' : 'Project mapping created successfully',
      mapping: result
    });
  } catch (error) {
    console.error('Error saving project mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save project mapping' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a project mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

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
