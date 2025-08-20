import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials, searchJiraIssues } from '@/lib/jira';

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

    // Create JQL query with LIKE operator for ticket search
    const jql = `project = "${projectKey}" AND (key LIKE "${searchTerm}%" OR summary ~ "${searchTerm}") ORDER BY updated DESC`;

    // Search for tickets
    const result = await searchJiraIssues(credentials, jql, maxResults);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tickets: result.issues || [],
      message: `Found ${result.issues?.length || 0} tickets`
    });

  } catch (error) {
    console.error('JIRA search tickets error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
