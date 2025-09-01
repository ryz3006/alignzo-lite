import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials, createJiraIssue } from '@/lib/jira';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userEmail, 
      projectKey, 
      summary, 
      description, 
      issueType = 'Task',
      priority = 'Medium'
    } = body;

    if (!userEmail || !projectKey || !summary) {
      return NextResponse.json(
        { error: 'User email, project key, and summary are required' },
        { status: 400 }
      );
    }

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    console.log(`Creating JIRA ticket in project: ${projectKey} for user: ${userEmail}`);

    // Step 1: Try to get the actual user's JIRA accountId from user mappings
    let assigneeAccountId = null;
    let assigneeDisplayName = null;
    
    try {
      // First, try to get user's JIRA mapping
      const { data: userMappings, error: mappingError } = await supabase
        .from('jira_user_mappings')
        .select('jira_assignee_name, jira_reporter_name')
        .eq('user_email', userEmail)
        .eq('jira_project_key', projectKey)
        .single();

      if (!mappingError && userMappings) {
        console.log('Found project-specific user mapping:', userMappings);
        // Try to get the user's JIRA accountId by searching for them
        const searchResponse = await fetch(`${credentials.base_url}/rest/api/3/user/search?query=${encodeURIComponent(userMappings.jira_assignee_name || userMappings.jira_reporter_name)}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData && searchData.length > 0) {
            const user = searchData[0];
            assigneeAccountId = user.accountId;
            assigneeDisplayName = user.displayName;
            console.log('Found JIRA user for assignment:', { accountId: assigneeAccountId, displayName: assigneeDisplayName });
          }
        }
      } else {
        // Try to get any user mapping for this user
        const { data: fallbackMappings, error: fallbackError } = await supabase
          .from('jira_user_mappings')
          .select('jira_assignee_name, jira_reporter_name')
          .eq('user_email', userEmail)
          .limit(1)
          .single();

        if (!fallbackError && fallbackMappings) {
          console.log('Found fallback user mapping:', fallbackMappings);
          // Try to get the user's JIRA accountId
          const searchResponse = await fetch(`${credentials.base_url}/rest/api/3/user/search?query=${encodeURIComponent(fallbackMappings.jira_assignee_name || fallbackMappings.jira_reporter_name)}`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData && searchData.length > 0) {
              const user = searchData[0];
              assigneeAccountId = user.accountId;
              assigneeDisplayName = user.displayName;
              console.log('Found JIRA user for assignment (fallback):', { accountId: assigneeAccountId, displayName: assigneeDisplayName });
            }
          }
        }
      }
    } catch (error) {
      console.log('Error looking up user mapping, will create ticket without assignment:', error);
    }

    // Step 2: Create ticket with or without assignee
    const result = await createJiraIssue(credentials, {
      projectKey,
      summary,
      description,
      issueType,
      priority,
      assignee: assigneeAccountId // Use the actual user's accountId if found
    });

    if (!result.success) {
      console.error('JIRA ticket creation failed:', result.error, result.details);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to create JIRA ticket';
      if (result.error?.includes('401')) {
        userMessage = 'JIRA authentication failed. Please check your credentials.';
      } else if (result.error?.includes('403')) {
        userMessage = 'Access denied. Please check your JIRA permissions.';
      } else if (result.error?.includes('404')) {
        userMessage = 'JIRA project not found. Please check the project key.';
      } else if (result.error?.includes('429')) {
        userMessage = 'JIRA rate limit exceeded. Please try again in a moment.';
      } else if (result.error?.includes('Network error')) {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (result.details?.includes('assignee')) {
        userMessage = 'Failed to assign ticket. Please check if the assignee exists in JIRA.';
      } else if (result.details?.includes('project')) {
        userMessage = 'Project not found or access denied. Please check the project key.';
      }

      return NextResponse.json(
        { 
          error: userMessage,
          details: result.details,
          rateLimitInfo: result.rateLimitInfo
        },
        { status: 500 }
      );
    }

    const ticket = result.data;
    
    if (assigneeAccountId && assigneeDisplayName) {
      console.log(`JIRA ticket created successfully: ${ticket?.key} assigned to user: ${assigneeDisplayName} (${assigneeAccountId})`);
      return NextResponse.json({
        success: true,
        ticket: {
          key: ticket?.key,
          id: ticket?.id
        },
        message: `JIRA ticket ${ticket?.key} created successfully and assigned to ${assigneeDisplayName}!`,
        assignee: {
          accountId: assigneeAccountId,
          displayName: assigneeDisplayName
        }
      });
    } else {
      console.log(`JIRA ticket created successfully: ${ticket?.key} without assignment (no user mapping found)`);
      return NextResponse.json({
        success: true,
        ticket: {
          key: ticket?.key,
          id: ticket?.id
        },
        message: `JIRA ticket ${ticket?.key} created successfully without assignment. Please assign it manually in JIRA.`,
        note: 'No user mapping found for automatic assignment'
      });
    }

  } catch (error) {
    console.error('JIRA create ticket error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
