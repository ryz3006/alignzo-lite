import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials, searchJiraIssues } from '@/lib/jira';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, jql, maxResults = 100 } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    if (!jql) {
      return NextResponse.json(
        { error: 'JQL query is required' },
        { status: 400 }
      );
    }

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return NextResponse.json(
        { error: 'JIRA credentials not found or invalid' },
        { status: 401 }
      );
    }

    // Search JIRA issues using the backend function
    const result = await searchJiraIssues(credentials, jql, maxResults);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to search JIRA issues' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      issues: result.data?.issues || [],
      total: result.data?.issues?.length || 0
    });

  } catch (error) {
    console.error('Error in JIRA search issues API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
