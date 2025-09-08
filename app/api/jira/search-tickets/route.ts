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
    console.log(`🔍 Credentials details:`, {
      base_url: credentials.base_url,
      user_email: credentials.user_email_integration,
      has_api_token: !!credentials.api_token
    });
    console.log(`🔍 Searching JIRA tickets in project: ${projectKey} with term: "${searchTerm}"`);

    // Test project access first
    console.log(`🔍 Testing project access for: ${projectKey}`);
    try {
      const projectResponse = await fetch(`${credentials.base_url}/rest/api/3/project/${projectKey}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      
      console.log(`🔍 Project access test result:`, {
        project: projectKey,
        status: projectResponse.status,
        ok: projectResponse.ok
      });
      
      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        console.log(`❌ Project ${projectKey} not accessible:`, errorText);
        
        // Try to list available projects
        console.log(`🔍 Attempting to list available projects...`);
        try {
          const projectsResponse = await fetch(`${credentials.base_url}/rest/api/3/project/search?maxResults=20`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            console.log(`📋 Available projects (${projectsData.values.length}):`);
            projectsData.values.forEach((project: any) => {
              console.log(`  - ${project.key}: ${project.name}`);
            });
          } else {
            console.log(`❌ Could not list projects:`, projectsResponse.status);
          }
        } catch (error) {
          console.log(`❌ Error listing projects:`, error instanceof Error ? error.message : String(error));
        }
      } else {
        const projectData = await projectResponse.json();
        console.log(`✅ Project ${projectKey} accessible:`, {
          key: projectData.key,
          name: projectData.name
        });
      }
    } catch (error) {
      console.log(`❌ Error testing project access:`, error instanceof Error ? error.message : String(error));
    }

    // Use enhanced search function with multiple strategies
    const result = await searchJiraIssuesEnhanced(credentials, projectKey, searchTerm, maxResults);

    const rawTickets = result || [];
    console.log(`🎯 JIRA search completed: Found ${rawTickets.length} tickets`);
    
    // Debug: Log the raw structure
    if (rawTickets.length > 0) {
      console.log(`📋 Raw ticket structure:`, JSON.stringify(rawTickets[0], null, 2));
    }
    
    // The searchJiraIssuesEnhanced function already returns the raw JIRA API response
    // We need to transform it to match our expected format
    const tickets = rawTickets.map((issue: any) => ({
      key: issue.key,
      id: issue.id,
      summary: issue.fields?.summary || 'No summary available',
      status: issue.fields?.status?.name || 'Unknown',
      priority: issue.fields?.priority?.name || 'N/A',
      assignee: issue.fields?.assignee?.displayName || 'Unassigned',
      reporter: issue.fields?.reporter?.displayName || 'N/A',
      project: issue.fields?.project?.name || 'N/A',
      projectKey: issue.fields?.project?.key || 'N/A',
      issueType: issue.fields?.issuetype?.name || 'Task',
      created: issue.fields?.created || new Date().toISOString(),
      updated: issue.fields?.updated || new Date().toISOString(),
      jiraUrl: `${credentials.base_url}/browse/${issue.key}`
    }));
    
    if (tickets.length > 0) {
      console.log(`📋 Sample ticket keys found:`, tickets.slice(0, 3).map(t => t.key));
      console.log(`📋 Transformed ticket data:`, JSON.stringify(tickets[0], null, 2));
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
