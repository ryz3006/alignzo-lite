import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';

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

    // Create the ticket data
    const ticketData = {
      fields: {
        project: {
          key: projectKey
        },
        summary: summary,
        description: description || '',
        issuetype: {
          name: issueType
        },
        priority: {
          name: priority
        },
        assignee: {
          name: credentials.user_email_integration
        }
      }
    };

    // Use the proxy API to create the ticket
    const response = await fetch('/api/jira/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: credentials.user_email_integration,
        endpoint: 'issue',
        method: 'POST',
        requestBody: ticketData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || `Failed to create ticket: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      ticket: data,
      message: 'JIRA ticket created successfully'
    });

  } catch (error) {
    console.error('JIRA create ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
