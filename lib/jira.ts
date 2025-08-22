import { supabase } from './supabase';

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
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('base_url,user_email_integration,api_token')
        .eq('user_email', userEmail)
        .eq('integration_type', 'jira')
        .eq('is_verified', true)
        .single();

      if (error) {
        console.error('Error fetching Jira credentials:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting Jira credentials:', error);
      return null;
    }
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
    priority: string = 'Medium'
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
            priority: { name: priority }
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
      const jql = `project = ${projectKey} AND (summary ~ "${searchTerm}" OR description ~ "${searchTerm}") ORDER BY updated DESC`;
      
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
      console.error('Error searching Jira tickets:', error);
      throw error;
    }
  }
}

// Global Jira integration instance
export const jiraIntegration = JiraIntegration.getInstance();

// Helper function to get Jira credentials
export async function getJiraCredentials(userEmail: string): Promise<JiraCredentials | null> {
  return await jiraIntegration.getCredentials(userEmail);
}

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

// Helper function to create Jira issue
export async function createJiraIssue(credentials: JiraCredentials, issueData: {
  projectKey: string;
  summary: string;
  description: string;
  issueType?: string;
  priority?: string;
}): Promise<{success: boolean; data?: any; error?: string; details?: string; rateLimitInfo?: any}> {
  try {
    const result = await jiraIntegration.createTicket(
      credentials,
      issueData.projectKey,
      issueData.summary,
      issueData.description,
      issueData.issueType || 'Task',
      issueData.priority || 'Medium'
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
