import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials, createJiraIssue, getJiraUsernameForUser } from '@/lib/jira';

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

    // Get JIRA username for the logged-in user
    const jiraUsername = await getJiraUsernameForUser(userEmail, projectKey);
    
    console.log(`Creating JIRA ticket in project: ${projectKey} for user: ${userEmail}`);
    console.log(`JIRA username for assignment: ${jiraUsername || 'Not found - will use integration user'}`);
    console.log('JIRA credentials:', {
      base_url: credentials.base_url,
      user_email_integration: credentials.user_email_integration,
      hasApiToken: !!credentials.api_token
    });

    // Use enhanced create issue function with user assignment
    const result = await createJiraIssue(credentials, {
      projectKey,
      summary,
      description,
      issueType,
      priority,
      assignee: jiraUsername || undefined
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
    const assignedTo = jiraUsername || credentials.user_email_integration;
    console.log(`JIRA ticket created successfully: ${ticket?.key} assigned to: ${assignedTo}`);
    
    return NextResponse.json({
      success: true,
      ticket: {
        key: ticket?.key,
        id: ticket?.id
      },
      message: `JIRA ticket ${ticket?.key} created successfully and assigned to ${assignedTo}! Please update the ticket in JIRA for closure or reassignments.`,
      rateLimitInfo: result.rateLimitInfo
    });

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
