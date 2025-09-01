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

    console.log(`🔍 JIRA Search Request:`, {
      userEmail,
      projectKey,
      searchTerm,
      maxResults
    });

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      console.log(`❌ JIRA credentials not found for user: ${userEmail}`);
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    console.log(`✅ JIRA credentials found for user: ${userEmail}`);
    console.log(`🔍 Searching JIRA tickets in project: ${projectKey} with term: "${searchTerm}"`);

    // Use enhanced search function with multiple strategies
    const result = await searchJiraIssuesEnhanced(credentials, projectKey, searchTerm, maxResults);

    const tickets = result || [];
    console.log(`🎯 JIRA search completed: Found ${tickets.length} tickets`);
    
    if (tickets.length > 0) {
      console.log(`📋 Sample ticket keys found:`, tickets.slice(0, 3).map(t => t.key));
    }

    return NextResponse.json({
      success: true,
      tickets: tickets,
      message: tickets.length > 0 ? `Found ${tickets.length} tickets` : 'No tickets found'
    });

  } catch (error) {
    console.error('❌ JIRA search tickets error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
