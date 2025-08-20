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

    // Create the full JIRA API URL
    const baseUrl = credentials.base_url.endsWith('/') 
      ? credentials.base_url.slice(0, -1) 
      : credentials.base_url;
    const url = `${baseUrl}/rest/api/2/issue`;

    // Create Basic Auth header
    const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
    const authHeader = Buffer.from(authString).toString('base64');

    console.log(`Creating JIRA ticket in project: ${projectKey}`);

    // Make the request directly to JIRA
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JIRA API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Failed to create JIRA ticket: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`JIRA ticket created successfully: ${data.key}`);
    
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
