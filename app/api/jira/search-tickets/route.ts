import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials, searchJiraIssuesEnhanced } from '@/lib/jira';

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

    console.log(`Searching JIRA tickets in project: ${projectKey} with term: "${searchTerm}"`);

    // Use enhanced search function with multiple strategies
    const result = await searchJiraIssuesEnhanced(credentials, projectKey, searchTerm, maxResults);

    if (!result.success) {
      console.error('JIRA search failed:', result.error, result.details);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to search JIRA tickets';
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

    const tickets = result.data?.issues || [];
    console.log(`JIRA search successful: Found ${tickets.length} tickets`);

    return NextResponse.json({
      success: true,
      tickets: tickets,
      message: tickets.length > 0 ? `Found ${tickets.length} tickets` : 'No tickets found',
      rateLimitInfo: result.rateLimitInfo
    });

  } catch (error) {
    console.error('JIRA search tickets error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
