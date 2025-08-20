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
 * Create Basic Auth header for JIRA API
 */
export function createJiraAuthHeader(credentials: JiraCredentials): string {
  const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
  return Buffer.from(authString).toString('base64');
}

/**
 * Clean up JIRA base URL
 */
export function cleanJiraBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * Verify JIRA credentials by testing the API
 */
export async function verifyJiraCredentials(credentials: JiraCredentials): Promise<{ success: boolean; user?: JiraUser; message: string }> {
  try {
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
    const cleanBaseUrl = cleanJiraBaseUrl(credentials.base_url);
    const authHeader = createJiraAuthHeader(credentials);

    const response = await fetch(`${cleanBaseUrl}/rest/api/2/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        maxResults,
        fields: ['summary', 'description', 'status', 'assignee', 'project']
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
      return {
        success: false,
        message: `Failed to search issues: ${response.status}`
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
 * Get a specific JIRA issue by key
 */
export async function getJiraIssue(
  credentials: JiraCredentials, 
  issueKey: string
): Promise<{ success: boolean; issue?: JiraIssue; message: string }> {
  try {
    const cleanBaseUrl = cleanJiraBaseUrl(credentials.base_url);
    const authHeader = createJiraAuthHeader(credentials);

    const response = await fetch(`${cleanBaseUrl}/rest/api/2/issue/${issueKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const issue = await response.json();
      return {
        success: true,
        issue,
        message: 'Issue retrieved successfully'
      };
    } else {
      return {
        success: false,
        message: `Failed to get issue: ${response.status}`
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
