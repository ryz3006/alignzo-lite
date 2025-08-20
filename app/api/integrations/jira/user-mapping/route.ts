import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Retrieve user mappings for a specific integration user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationUserEmail = searchParams.get('integrationUserEmail');
    const projectKey = searchParams.get('projectKey');

    if (!integrationUserEmail) {
      return NextResponse.json(
        { error: 'Integration user email is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('jira_user_mappings')
      .select('*')
      .eq('integration_user_email', integrationUserEmail);

    if (projectKey) {
      query = query.eq('jira_project_key', projectKey);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mappings: data || [] });
  } catch (error) {
    console.error('Error fetching user mappings:', error);
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
      userEmail, 
      jiraAssigneeName, 
      jiraReporterName, 
      jiraProjectKey, 
      integrationUserEmail 
    } = body;

    if (!userEmail || !jiraAssigneeName || !integrationUserEmail) {
      return NextResponse.json(
        { error: 'User email, JIRA assignee name, and integration user email are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from('jira_user_mappings')
      .select('id')
      .eq('user_email', userEmail)
      .eq('jira_project_key', jiraProjectKey || null)
      .eq('integration_user_email', integrationUserEmail)
      .single();

    let result;
    if (existingMapping) {
      // Update existing mapping
      const { data, error } = await supabase
        .from('jira_user_mappings')
        .update({
          jira_assignee_name: jiraAssigneeName,
          jira_reporter_name: jiraReporterName,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMapping.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new mapping
      const { data, error } = await supabase
        .from('jira_user_mappings')
        .insert({
          user_email: userEmail,
          jira_assignee_name: jiraAssigneeName,
          jira_reporter_name: jiraReporterName,
          jira_project_key: jiraProjectKey,
          integration_user_email: integrationUserEmail
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      mapping: result 
    });
  } catch (error) {
    console.error('Error saving user mapping:', error);
    return NextResponse.json(
      { error: 'Failed to save user mapping' },
      { status: 500 }
    );
  }
}

// DELETE - Remove user mapping
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

    const { error } = await supabase
      .from('jira_user_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete user mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
