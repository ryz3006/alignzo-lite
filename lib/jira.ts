import { supabaseClient } from './supabase-client';

export interface JiraCredentials {
  base_url: string;
  user_email_integration: string;
  api_token: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    reporter?: {
      displayName: string;
    };
    project: {
      name: string;
      key: string;
    };
    issuetype?: {
      name: string;
    };
    created: string;
    updated: string;
    timespent?: number;
    customfield_10016?: number; // Story points field
  };
}

export interface JiraProject {
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead?: {
    displayName: string;
    emailAddress: string;
  };
}

export interface JiraUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
  active: boolean;
}

// Helper function to get JIRA credentials using the proxy client
export async function getJiraCredentials(userEmail: string): Promise<JiraCredentials | null> {
  try {
    // Early return if no user email provided
    if (!userEmail) {
      console.warn('No user email provided to getJiraCredentials');
      return null;
    }

    // Check if we're in a browser environment and if the app is properly configured
    if (typeof window !== 'undefined') {
      // Test if the Supabase proxy is working by making a simple request
      try {
        const testResponse = await fetch('/api/test-env');
        if (testResponse.ok) {
          const testData = await testResponse.json();
          if (testData.environment?.supabaseUrl === 'Not Set') {
            console.warn('Supabase environment variables not configured. JIRA integration will not work.');
            return null;
          }
        }
      } catch (testError) {
        console.warn('Unable to test environment configuration:', testError);
        // Don't return null here, continue with the request
      }
    }

    // Check if we're on an admin page and shouldn't be calling JIRA functions
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      console.warn('JIRA credentials requested on admin page. This might be unnecessary.');
      return null;
    }

    const response = await supabaseClient.get('user_integrations', {
      select: 'base_url,user_email_integration,api_token',
      filters: {
        user_email: userEmail,
        integration_type: 'jira',
        is_verified: true
      }
    });

    if (response.error) {
      console.error('Error fetching Jira credentials:', response.error);
      return null;
    }

    if (!response.data || response.data.length === 0) {
      return null;
    }

    return response.data[0];
  } catch (error) {
    console.error('Error getting Jira credentials:', error);
    return null;
  }
}

export class JiraIntegration {
  private static instance: JiraIntegration;

  private constructor() {}

  public static getInstance(): JiraIntegration {
    if (!JiraIntegration.instance) {
      JiraIntegration.instance = new JiraIntegration();
    }
    return JiraIntegration.instance;
  }

  async getCredentials(userEmail: string): Promise<JiraCredentials | null> {
    return getJiraCredentials(userEmail);
  }

  async verifyCredentials(credentials: JiraCredentials): Promise<boolean> {
    try {
      const response = await fetch(`${credentials.base_url}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying Jira credentials:', error);
      return false;
    }
  }

  async getProjects(credentials: JiraCredentials, query?: string): Promise<JiraProject[]> {
    try {
      let url = `${credentials.base_url}/rest/api/3/project/search`;
      const params = new URLSearchParams();
      
      if (query) {
        params.append('query', query);
      }
      
      params.append('expand', 'description,lead,issueTypes');
      params.append('maxResults', '50');
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.values || []).map((project: any) => ({
        key: project.key,
        name: project.name,
        description: project.description || '',
        projectTypeKey: project.projectTypeKey,
        lead: project.lead ? {
          displayName: project.lead.displayName,
          emailAddress: project.lead.emailAddress
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
      throw error;
    }
  }

  async getUsers(credentials: JiraCredentials, query?: string): Promise<JiraUser[]> {
    try {
      let url = `${credentials.base_url}/rest/api/3/user/search`;
      
      if (query) {
        url += `?query=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status}`);
      }

      const data = await response.json();
      return (data || []).map((user: any) => ({
        id: user.accountId || user.id,
        name: user.name || user.username,
        email: user.emailAddress || user.email || '',
        displayName: user.displayName || user.name,
        active: user.active !== false
      })).filter((user: any) => user.active && user.displayName);
    } catch (error) {
      console.error('Error fetching Jira users:', error);
      throw error;
    }
  }

  async createTicket(
    credentials: JiraCredentials,
    projectKey: string,
    summary: string,
    description: string,
    issueType: string = 'Task',
    priority: string = 'Medium',
    assignee?: string
  ): Promise<any> {
    try {
      // Convert plain text description to Atlassian Document Format (ADF)
      const adfDescription = {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description
              }
            ]
          }
        ]
      };

      // Determine assignee field - use accountId for assignment
      let assigneeField = undefined;
      if (assignee) {
        // If assignee looks like an accountId (starts with a letter and contains alphanumeric chars)
        if (typeof assignee === 'string' && /^[a-zA-Z0-9_-]+$/.test(assignee) && assignee.length > 10) {
          // Use as accountId
          assigneeField = { accountId: assignee };
        } else {
          // Use as name (for backward compatibility)
          assigneeField = { name: assignee };
        }
      }

      const response = await fetch(`${credentials.base_url}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary: summary,
            description: adfDescription,
            issuetype: { name: issueType },
            priority: { name: priority },
            ...(assigneeField && { assignee: assigneeField })
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Jira ticket:', error);
      throw error;
    }
  }

  async searchTickets(
    credentials: JiraCredentials,
    projectKey: string,
    searchTerm: string,
    maxResults: number = 20
  ): Promise<any[]> {
    try {
      // Try multiple search strategies for better results
      let issues: any[] = [];
      
      // Strategy 1: Exact ticket key match (most specific)
      if (searchTerm.includes('-')) {
        const exactKeyJql = `key = "${searchTerm}"`;
        try {
          const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(exactKeyJql)}&maxResults=${maxResults}`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.issues && data.issues.length > 0) {
              console.log(`Found ${data.issues.length} tickets with exact key match: ${searchTerm}`);
              return data.issues;
            }
          }
        } catch (error) {
          console.log('Exact key search failed, trying other strategies:', error);
        }
      }
      
      // Strategy 2: Project + ticket key pattern match
      if (searchTerm.includes('-')) {
        const keyPatternJql = `project = ${projectKey} AND key ~ "${searchTerm}"`;
        try {
          const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(keyPatternJql)}&maxResults=${maxResults}`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.issues && data.issues.length > 0) {
              console.log(`Found ${data.issues.length} tickets with key pattern match in project ${projectKey}`);
              return data.issues;
            }
          }
        } catch (error) {
          console.log('Key pattern search failed, trying other strategies:', error);
        }
      }
      
      // Strategy 3: Project + summary/description search (original strategy)
      const summaryDescJql = `project = ${projectKey} AND (summary ~ "${searchTerm}" OR description ~ "${searchTerm}") ORDER BY updated DESC`;
      try {
        const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(summaryDescJql)}&maxResults=${maxResults}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.issues && data.issues.length > 0) {
            console.log(`Found ${data.issues.length} tickets with summary/description match in project ${projectKey}`);
            return data.issues;
          }
        }
      } catch (error) {
        console.log('Summary/description search failed:', error);
      }
      
      // Strategy 4: Global search without project restriction (fallback)
      const globalJql = `(summary ~ "${searchTerm}" OR description ~ "${searchTerm}" OR key ~ "${searchTerm}") ORDER BY updated DESC`;
      try {
        const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(globalJql)}&maxResults=${maxResults}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.issues && data.issues.length > 0) {
            console.log(`Found ${data.issues.length} tickets with global search (including outside project ${projectKey})`);
            return data.issues;
          }
        }
      } catch (error) {
        console.log('Global search failed:', error);
      }
      
      console.log(`No tickets found with any search strategy for term: "${searchTerm}" in project: ${projectKey}`);
      return [];
      
    } catch (error) {
      console.error('Error searching Jira tickets:', error);
      throw error;
    }
  }
}

// Global Jira integration instance
export const jiraIntegration = JiraIntegration.getInstance();



// Helper function to verify Jira credentials
export async function verifyJiraCredentials(credentials: JiraCredentials): Promise<boolean> {
  return await jiraIntegration.verifyCredentials(credentials);
}

// Helper function to get Jira projects
export async function getJiraProjects(userEmail: string): Promise<JiraProject[]> {
  const credentials = await jiraIntegration.getCredentials(userEmail);
  if (!credentials) {
    throw new Error('Jira credentials not found');
  }
  return await jiraIntegration.getProjects(credentials);
}

// Helper function to get Jira users
export async function getJiraUsers(userEmail: string): Promise<JiraUser[]> {
  const credentials = await jiraIntegration.getCredentials(userEmail);
  if (!credentials) {
    throw new Error('Jira credentials not found');
  }
  return await jiraIntegration.getUsers(credentials);
}

// Helper function to search all Jira issues
export async function searchAllJiraIssues(credentials: JiraCredentials, jql: string, maxResults: number = 100): Promise<any[]> {
  try {
    const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.error('Error searching all Jira issues:', error);
    throw error;
  }
}

// Note: The old username-based assignment approach has been replaced with accountId-based assignment
// The create-ticket endpoint now gets the actual accountId from /rest/api/3/myself and uses it for assignment

// Helper function to create Jira issue
export async function createJiraIssue(credentials: JiraCredentials, issueData: {
  projectKey: string;
  summary: string;
  description: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
}): Promise<{success: boolean; data?: any; error?: string; details?: string; rateLimitInfo?: any}> {
  try {
    const result = await jiraIntegration.createTicket(
      credentials,
      issueData.projectKey,
      issueData.summary,
      issueData.description,
      issueData.issueType || 'Task',
      issueData.priority || 'Medium',
      issueData.assignee
    );

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('JIRA create ticket error details:', error);
    
    // Extract rate limit info if available
    let rateLimitInfo = null;
    if (error.message?.includes('429')) {
      rateLimitInfo = {
        retryAfter: error.headers?.get('Retry-After'),
        rateLimitRemaining: error.headers?.get('X-RateLimit-Remaining'),
        rateLimitReset: error.headers?.get('X-RateLimit-Reset')
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
      details: error.message || 'Failed to create JIRA ticket',
      rateLimitInfo
    };
  }
}

// Helper function to search Jira issues
export async function searchJiraIssues(credentials: JiraCredentials, jql: string, maxResults: number = 20): Promise<any[]> {
  try {
    const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();
    return data.issues || [];
  } catch (error) {
    console.error('Error searching Jira issues:', error);
    throw error;
  }
}

// Helper function to search Jira issues enhanced
export async function searchJiraIssuesEnhanced(credentials: JiraCredentials, projectKey: string, searchTerm: string, maxResults: number = 20): Promise<any[]> {
  return await jiraIntegration.searchTickets(credentials, projectKey, searchTerm, maxResults);
}
