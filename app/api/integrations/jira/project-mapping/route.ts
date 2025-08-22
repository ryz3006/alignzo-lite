import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

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
    const response = await supabaseClient.get('jira_project_mappings', {
      select: '*,project:projects(*)',
      filters: { 
        integration_user_email: userEmail
      }
    });

    if (response.error) {
      console.error('Error fetching Jira project mappings:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch project mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mappings: response.data || []
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
    const { data: existingMappings, error: checkError } = await supabaseClient
      .get('jira_project_mappings', {
        select: 'id',
        filters: {
          dashboard_project_id: dashboard_project_id,
          jira_project_key: jira_project_key,
          integration_user_email: integration_user_email
        }
      });

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
      const response = await supabaseClient.update('jira_project_mappings', existingMapping.id, {
        jira_project_name: jira_project_name,
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error updating project mapping:', response.error);
        return NextResponse.json(
          { error: 'Failed to update project mapping' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Project mapping updated successfully',
        mapping: response.data
      });
    } else {
      // Create new mapping
      const response = await supabaseClient.insert('jira_project_mappings', {
        dashboard_project_id: dashboard_project_id,
        jira_project_key: jira_project_key,
        jira_project_name: jira_project_name,
        integration_user_email: integration_user_email
      });

      if (response.error) {
        console.error('Error creating project mapping:', response.error);
        return NextResponse.json(
          { error: 'Failed to create project mapping' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Project mapping created successfully',
        mapping: response.data
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
    const response = await supabaseClient.delete('jira_project_mappings', mappingId);

    if (response.error) {
      console.error('Error deleting project mapping:', response.error);
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
