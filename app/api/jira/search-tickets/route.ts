import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userEmail, 
      projectKey, 
      searchTerm,
      maxResults = 20
    } = body;

    if (!userEmail || !projectKey || !searchTerm) {
      return NextResponse.json(
        { error: 'User email, project key, and search term are required' },
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

    // Create JQL query with simpler, more compatible syntax
    // Using 'text ~' for text search which is more reliable
    const jql = `project = "${projectKey}" AND text ~ "${searchTerm}" ORDER BY updated DESC`;

    console.log(`Searching JIRA tickets with JQL: ${jql}`);

    // Create the full JIRA API URL
    const baseUrl = credentials.base_url.endsWith('/') 
      ? credentials.base_url.slice(0, -1) 
      : credentials.base_url;
    const url = `${baseUrl}/rest/api/2/search`;

    // Create Basic Auth header
    const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
    const authHeader = Buffer.from(authString).toString('base64');

    // Make the request directly to JIRA
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        maxResults,
        fields: ['summary', 'description', 'status', 'assignee', 'project', 'priority', 'issuetype', 'created', 'updated']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JIRA search error ${response.status}:`, errorText);
      
      // Try a fallback query if the first one fails
      if (response.status === 400) {
        console.log('Trying fallback JQL query...');
        const fallbackJql = `project = "${projectKey}" ORDER BY updated DESC`;
        
        const fallbackResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jql: fallbackJql,
            maxResults,
            fields: ['summary', 'description', 'status', 'assignee', 'project', 'priority', 'issuetype', 'created', 'updated']
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          // Filter results client-side for the search term
          const filteredIssues = fallbackData.issues?.filter((issue: any) => 
            issue.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.fields.summary.toLowerCase().includes(searchTerm.toLowerCase())
          ) || [];

          console.log(`Fallback search successful: Found ${filteredIssues.length} tickets after filtering`);

          return NextResponse.json({
            success: true,
            tickets: filteredIssues,
            message: `Found ${filteredIssues.length} tickets`
          });
        } else {
          const fallbackErrorText = await fallbackResponse.text();
          console.error(`Fallback JIRA search error ${fallbackResponse.status}:`, fallbackErrorText);
        }
      }
      
      return NextResponse.json(
        { error: `Failed to search JIRA tickets: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`JIRA search successful: Found ${data.issues?.length || 0} tickets`);

    return NextResponse.json({
      success: true,
      tickets: data.issues || [],
      message: `Found ${data.issues?.length || 0} tickets`
    });

  } catch (error) {
    console.error('JIRA search tickets error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
