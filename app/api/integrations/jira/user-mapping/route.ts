import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get user's Jira user mappings
    const response = await supabaseClient.get('jira_user_mappings', {
      select: '*',
      filters: { 
        integration_user_email: userEmail
      }
    });

    if (response.error) {
      console.error('Error fetching Jira user mappings:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch user mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mappings: response.data || []
    });

  } catch (error) {
    console.error('Error in Jira user mappings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update user mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_email, 
      jira_assignee_name, 
      jira_reporter_name, 
      jira_project_key, 
      integration_user_email 
    } = body;

    if (!user_email || !jira_assignee_name || !integration_user_email) {
      return NextResponse.json(
        { error: 'User email, JIRA assignee name, and integration user email are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const { data: existingMappings, error: checkError } = await supabaseClient
      .get('jira_user_mappings', {
        select: 'id',
        filters: {
          user_email: user_email,
          jira_project_key: jira_project_key || null,
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

    let result;
    if (existingMapping) {
      // Update existing mapping
      const response = await supabaseClient.update('jira_user_mappings', existingMapping.id, {
        jira_assignee_name: jira_assignee_name,
        jira_reporter_name: jira_reporter_name,
        updated_at: new Date().toISOString()
      });

      if (response.error) throw new Error(response.error);
      result = response.data;
    } else {
      // Create new mapping
      const response = await supabaseClient.insert('jira_user_mappings', {
        user_email: user_email,
        jira_assignee_name: jira_assignee_name,
        jira_reporter_name: jira_reporter_name,
        jira_project_key: jira_project_key,
        integration_user_email: integration_user_email
      });

      if (response.error) throw new Error(response.error);
      result = response.data;
    }

    return NextResponse.json({
      message: existingMapping ? 'User mapping updated successfully' : 'User mapping created successfully',
      mapping: result
    });
  } catch (error) {
    console.error('Error saving user mapping:', error);
    return NextResponse.json(
      { error: `Failed to save user mapping: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove user mapping
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

    // Delete mapping
    const response = await supabaseClient.delete('jira_user_mappings', mappingId);

    if (response.error) {
      console.error('Error deleting user mapping:', response.error);
      return NextResponse.json(
        { error: 'Failed to delete user mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
