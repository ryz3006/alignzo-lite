import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userEmail, 
      projectKey,
      page = 1,
      pageSize = 10
    } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching JIRA tickets for user: ${userEmail}, project: ${projectKey || 'all'}, page: ${page}`);

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    // Get user's JIRA mapping to find their assignee name
    const { data: userMappings, error: mappingError } = await supabase
      .from('jira_user_mappings')
      .select('jira_assignee_name, jira_reporter_name')
      .eq('user_email', userEmail)
      .eq('jira_project_key', projectKey || null)
      .single();

    if (mappingError && mappingError.code !== 'PGRST116') {
      console.error('Error fetching user mapping:', mappingError);
      return NextResponse.json(
        { error: 'Failed to fetch user mapping' },
        { status: 500 }
      );
    }

    // If no project-specific mapping, try to get any mapping for the user
    let assigneeName = userMappings?.jira_assignee_name;
    if (!assigneeName) {
      const { data: fallbackMappings } = await supabase
        .from('jira_user_mappings')
        .select('jira_assignee_name')
        .eq('user_email', userEmail)
        .limit(1)
        .single();
      
      assigneeName = fallbackMappings?.jira_assignee_name;
    }

    if (!assigneeName) {
      return NextResponse.json(
        { error: 'No JIRA user mapping found for this user' },
        { status: 404 }
      );
    }

    console.log(`🔍 Found JIRA assignee name: ${assigneeName}`);

    // First, try to find the user's accountId by searching for them
    let assigneeAccountId = null;
    try {
      const userSearchResponse = await fetch(`${credentials.base_url}/rest/api/3/user/search?query=${encodeURIComponent(assigneeName)}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      if (userSearchResponse.ok) {
        const userSearchData = await userSearchResponse.json();
        if (userSearchData && userSearchData.length > 0) {
          // Find the user that matches our assignee name
          const matchingUser = userSearchData.find((user: any) => 
            user.displayName === assigneeName || 
            user.emailAddress === assigneeName ||
            user.name === assigneeName
          );
          
          if (matchingUser) {
            assigneeAccountId = matchingUser.accountId;
            console.log(`🔍 Found user accountId: ${assigneeAccountId} for assignee: ${assigneeName}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not search for user accountId:`, error);
    }

    // Build JQL query to get tickets assigned to the user
    let jql;
    if (assigneeAccountId) {
      // Use accountId if we found it
      jql = `assignee = "${assigneeAccountId}"`;
    } else {
      // Fallback to display name
      jql = `assignee = "${assigneeName}"`;
    }
    
    if (projectKey) {
      jql += ` AND project = ${projectKey}`;
    }
    
    jql += ' ORDER BY updated DESC';

    // Calculate pagination
    const startAt = (page - 1) * pageSize;
    const maxResults = pageSize;

    console.log(`🔍 JQL Query: ${jql}`);
    console.log(`📄 Pagination - Page: ${page}, PageSize: ${pageSize}, StartAt: ${startAt}, MaxResults: ${maxResults}`);

    // First, get the total count by making a POST call with maxResults=0 to the jql endpoint
    const countResponse = await fetch(`${credentials.base_url}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        startAt: 0,
        maxResults: 0,
        fields: ['id']
      })
    });

    let totalItems = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      totalItems = countData.total || 0;
      console.log(`📊 Total count from JIRA: ${totalItems}`);
    }

    // Now fetch the actual tickets with pagination via POST to /search/jql
    const response = await fetch(`${credentials.base_url}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        startAt: startAt,
        maxResults: maxResults,
        fields: ['key', 'summary', 'status', 'priority', 'assignee', 'reporter', 'project', 'issuetype', 'created', 'updated']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JIRA API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `JIRA API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`📊 JIRA API Response - Total: ${data.total}, StartAt: ${data.startAt}, MaxResults: ${data.maxResults}, Issues: ${data.issues?.length || 0}`);
    console.log(`📊 JIRA API Response Keys:`, Object.keys(data));
    console.log(`📊 First few issues:`, data.issues?.slice(0, 3).map((issue: any) => ({ key: issue.key, summary: issue.fields?.summary })));

    // Transform the data to match our expected format
    const tickets = data.issues?.map((issue: any) => ({
      key: issue.key,
      id: issue.id,
      summary: issue.fields?.summary || '',
      status: issue.fields?.status?.name || 'Unknown',
      priority: issue.fields?.priority?.name || 'Medium',
      assignee: issue.fields?.assignee?.displayName || 'Unassigned',
      reporter: issue.fields?.reporter?.displayName || 'Unknown',
      project: issue.fields?.project?.name || '',
      projectKey: issue.fields?.project?.key || '',
      issueType: issue.fields?.issuetype?.name || 'Task',
      created: issue.fields?.created || new Date().toISOString(),
      updated: issue.fields?.updated || new Date().toISOString(),
      jiraUrl: `${credentials.base_url}/browse/${issue.key}`
    })) || [];

    // Use the totalItems we got from the count call
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

    console.log(`📊 Pagination Calculation - Total: ${totalItems}, Issues Length: ${data.issues?.length}, TotalPages: ${totalPages}`);
    console.log(`✅ Found ${tickets.length} tickets (page ${page} of ${totalPages})`);

    return NextResponse.json({
      success: true,
      tickets: tickets,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: (startAt + tickets.length) < totalItems,
        hasPreviousPage: startAt > 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching JIRA tickets:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
