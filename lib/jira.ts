import { supabase } from './supabase';

export interface JiraCredentials {
  base_url: string;
  user_email_integration: string;
  api_token: string;
}

export interface JiraUser {
  name: string;
  email: string;
  accountId: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    project: {
      key: string;
      name: string;
    };
    priority?: {
      name: string;
    };
    issuetype?: {
      name: string;
    };
    customfield_10016?: number; // Story points field
    timespent?: number; // Time spent in seconds
    timeestimate?: number; // Time estimate in seconds
    created?: string; // ISO date string
    updated?: string; // ISO date string
    [key: string]: any; // Allow additional custom fields
  };
}

/**
 * Get JIRA credentials for a user
 */
export async function getJiraCredentials(userEmail: string): Promise<JiraCredentials | null> {
  try {
    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('base_url, user_email_integration, api_token')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .eq('is_verified', true)
      .single();

    if (error || !integration) {
      return null;
    }

    return {
      base_url: integration.base_url!,
      user_email_integration: integration.user_email_integration!,
      api_token: integration.api_token!
    };
  } catch (error) {
    console.error('Error fetching JIRA credentials:', error);
    return null;
  }
}

/**
 * Create Basic Auth header for JIRA API (used for verification before saving)
 */
export function createJiraAuthHeader(credentials: JiraCredentials): string {
  const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
  return Buffer.from(authString).toString('base64');
}

/**
 * Clean up JIRA base URL (used for verification before saving)
 */
export function cleanJiraBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * Verify JIRA credentials by testing the API
 */
export async function verifyJiraCredentials(credentials: JiraCredentials): Promise<{ success: boolean; user?: JiraUser; message: string }> {
  try {
    // For verification, we need to make a direct call since the credentials aren't saved yet
    const cleanBaseUrl = cleanJiraBaseUrl(credentials.base_url);
    const authHeader = createJiraAuthHeader(credentials);

    const response = await fetch(`${cleanBaseUrl}/rest/api/2/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        success: true,
        user: {
          name: userData.displayName,
          email: userData.emailAddress,
          accountId: userData.accountId
        },
        message: 'JIRA connection verified successfully'
      };
    } else {
      let message = 'Failed to verify JIRA connection';
      if (response.status === 401) {
        message = 'Invalid credentials. Please check your email and API token.';
      } else if (response.status === 403) {
        message = 'Access denied. Please check your API token permissions.';
      } else if (response.status === 404) {
        message = 'JIRA instance not found. Please check your base URL.';
      }
      
      return {
        success: false,
        message
      };
    }
  } catch (error) {
    console.error('JIRA verification error:', error);
    return {
      success: false,
      message: 'Unable to connect to JIRA. Please check your configuration.'
    };
  }
}

/**
 * Search JIRA issues
 */
export async function searchJiraIssues(
  credentials: JiraCredentials, 
  jql: string, 
  maxResults: number = 50
): Promise<{ success: boolean; issues?: JiraIssue[]; message: string }> {
  try {
    // Use the proxy API to avoid CORS issues
    const response = await fetch('/api/jira/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: credentials.user_email_integration, // We need the user email for the proxy
        endpoint: 'search',
        method: 'POST',
        requestBody: {
          jql,
          maxResults,
          fields: ['summary', 'description', 'status', 'assignee', 'project', 'priority', 'issuetype', 'customfield_10016', 'timespent', 'timeestimate', 'created', 'updated']
        }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        issues: data.issues,
        message: `Found ${data.issues.length} issues`
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.error || `Failed to search issues: ${response.status}`
      };
    }
  } catch (error) {
    console.error('JIRA search error:', error);
    return {
      success: false,
      message: 'Failed to search JIRA issues'
    };
  }
}

/**
 * Search JIRA issues with pagination to get ALL results
 */
export async function searchAllJiraIssues(
  credentials: JiraCredentials, 
  jql: string
): Promise<{ success: boolean; issues?: JiraIssue[]; message: string }> {
  try {
    const allIssues: JiraIssue[] = [];
    const maxResultsPerPage = 500; // Increased page size for better performance
    let startAt = 0;
    let total = 0;
    
    console.log(`Starting paginated JIRA search with JQL: ${jql}`);
    
    do {
      const response = await fetch('/api/jira/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: credentials.user_email_integration,
          endpoint: 'search',
          method: 'POST',
          requestBody: {
            jql,
            maxResults: maxResultsPerPage,
            startAt,
            fields: ['summary', 'description', 'status', 'assignee', 'project', 'priority', 'issuetype', 'customfield_10016', 'timespent', 'timeestimate', 'created', 'updated']
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error || 'Failed to search JIRA issues'
        };
      }

      const data = await response.json();
      total = data.total || 0;
      const issues = data.issues || [];
      
      allIssues.push(...issues);
      startAt += maxResultsPerPage;
      
      console.log(`Fetched ${issues.length} issues (${allIssues.length}/${total} total)`);
      
    } while (startAt < total);

    console.log(`Completed JIRA search: Retrieved ${allIssues.length} total issues`);
    
    return {
      success: true,
      issues: allIssues,
      message: `Found ${allIssues.length} issues`
    };
  } catch (error) {
    console.error('Error searching JIRA issues:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get a specific JIRA issue by key
 */
export async function getJiraIssue(
  credentials: JiraCredentials, 
  issueKey: string
): Promise<{ success: boolean; issue?: JiraIssue; message: string }> {
  try {
    // Use the proxy API to avoid CORS issues
    const response = await fetch('/api/jira/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: credentials.user_email_integration,
        endpoint: `issue/${issueKey}`,
        method: 'GET'
      }),
    });

    if (response.ok) {
      const issue = await response.json();
      return {
        success: true,
        issue,
        message: 'Issue retrieved successfully'
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.error || `Failed to get issue: ${response.status}`
      };
    }
  } catch (error) {
    console.error('JIRA get issue error:', error);
    return {
      success: false,
      message: 'Failed to get JIRA issue'
    };
  }
}
