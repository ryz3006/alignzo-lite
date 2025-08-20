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
    assignee?: {
      name: string;
      displayName?: string;
      emailAddress?: string;
    };
    reporter?: {
      name: string;
      displayName?: string;
      emailAddress?: string;
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
    created: string;
    updated: string;
    customfield_10016?: number; // Story points field
    timespent?: number; // Time spent in seconds
  };
}

export interface JiraApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
  rateLimitInfo?: {
    remaining: number;
    retryAfter?: number;
  };
}

// Rate limiting and retry configuration
const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  jitter: 0.1, // 10% jitter
};

// Utility function to add jitter to delay
function addJitter(delay: number): number {
  const jitter = delay * RATE_LIMIT_CONFIG.jitter * Math.random();
  return delay + jitter;
}

// Utility function to calculate exponential backoff delay
function calculateDelay(attempt: number): number {
  const delay = Math.min(
    RATE_LIMIT_CONFIG.baseDelay * Math.pow(2, attempt),
    RATE_LIMIT_CONFIG.maxDelay
  );
  return addJitter(delay);
}

// Parse rate limit headers
function parseRateLimitHeaders(response: Response) {
  const rateLimitInfo: { remaining: number; retryAfter?: number } = {
    remaining: -1,
  };

  const remaining = response.headers.get('X-RateLimit-Remaining');
  const retryAfter = response.headers.get('Retry-After');

  if (remaining) {
    rateLimitInfo.remaining = parseInt(remaining, 10);
  }

  if (retryAfter) {
    rateLimitInfo.retryAfter = parseInt(retryAfter, 10);
  }

  return rateLimitInfo;
}

// Generic JIRA API call with rate limiting and retry logic
export async function makeJiraApiCall<T>(
  url: string,
  options: RequestInit,
  credentials: JiraCredentials
): Promise<JiraApiResponse<T>> {
  let lastAttempt = 0;

  while (lastAttempt <= RATE_LIMIT_CONFIG.maxRetries) {
    try {
      const response = await fetch(url, options);
      const rateLimitInfo = parseRateLimitHeaders(response);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = rateLimitInfo.retryAfter || calculateDelay(lastAttempt);
        console.log(`Rate limited. Waiting ${retryAfter}ms before retry ${lastAttempt + 1}`);
        
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        lastAttempt++;
        continue;
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JIRA API error ${response.status}:`, errorText);
        
        return {
          success: false,
          error: `JIRA API error: ${response.status}`,
          details: errorText,
          rateLimitInfo,
        };
      }

      // Success
      const data = await response.json();
      return {
        success: true,
        data,
        message: 'Operation completed successfully',
        rateLimitInfo,
      };

    } catch (error) {
      console.error(`JIRA API call attempt ${lastAttempt + 1} failed:`, error);
      
      if (lastAttempt === RATE_LIMIT_CONFIG.maxRetries) {
        return {
          success: false,
          error: 'Network error',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Retry with exponential backoff
      const delay = calculateDelay(lastAttempt);
      console.log(`Retrying in ${delay}ms (attempt ${lastAttempt + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      lastAttempt++;
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
  };
}

export async function getJiraCredentials(userEmail: string): Promise<JiraCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('base_url, user_email_integration, api_token')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .eq('is_verified', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      base_url: data.base_url,
      user_email_integration: data.user_email_integration,
      api_token: data.api_token,
    };
  } catch (error) {
    console.error('Error fetching JIRA credentials:', error);
    return null;
  }
}

export function createJiraAuthHeader(credentials: JiraCredentials): string {
  const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
  return Buffer.from(authString).toString('base64');
}

export function cleanJiraBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export async function verifyJiraCredentials(credentials: JiraCredentials): Promise<boolean> {
  try {
    const baseUrl = cleanJiraBaseUrl(credentials.base_url);
    const url = `${baseUrl}/rest/api/2/myself`;
    const authHeader = createJiraAuthHeader(credentials);

    const result = await makeJiraApiCall(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
      },
    }, credentials);

    return result.success;
  } catch (error) {
    console.error('Error verifying JIRA credentials:', error);
    return false;
  }
}

export async function searchJiraIssues(
  credentials: JiraCredentials,
  jql: string,
  maxResults: number = 50
): Promise<JiraApiResponse<{ issues: JiraIssue[] }>> {
  try {
    const baseUrl = cleanJiraBaseUrl(credentials.base_url);
    const url = `${baseUrl}/rest/api/2/search`;
    const authHeader = createJiraAuthHeader(credentials);

    const result = await makeJiraApiCall<{ issues: JiraIssue[] }>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        maxResults,
        fields: ['summary', 'description', 'status', 'assignee', 'project', 'priority', 'issuetype', 'created', 'updated']
      }),
    }, credentials);

    return result;
  } catch (error) {
    console.error('JIRA search error:', error);
    return {
      success: false,
      error: 'Failed to search JIRA issues',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to search JIRA issues',
    };
  }
}

export async function searchAllJiraIssues(
  credentials: JiraCredentials,
  projectKey: string,
  maxResults: number = 100
): Promise<JiraApiResponse<{ issues: JiraIssue[] }>> {
  const jql = `project = "${projectKey}" ORDER BY updated DESC`;
  return searchJiraIssues(credentials, jql, maxResults);
}

export async function getJiraIssue(
  credentials: JiraCredentials,
  issueKey: string
): Promise<JiraApiResponse<JiraIssue>> {
  try {
    const baseUrl = cleanJiraBaseUrl(credentials.base_url);
    const url = `${baseUrl}/rest/api/2/issue/${issueKey}`;
    const authHeader = createJiraAuthHeader(credentials);

    const result = await makeJiraApiCall<JiraIssue>(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
      },
    }, credentials);

    return result;
  } catch (error) {
    console.error('JIRA get issue error:', error);
    return {
      success: false,
      error: 'Failed to get JIRA issue',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get JIRA issue',
    };
  }
}

export async function createJiraIssue(
  credentials: JiraCredentials,
  issueData: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
    assignee?: string;
  }
): Promise<JiraApiResponse<{ key: string; id: string }>> {
  try {
    const baseUrl = cleanJiraBaseUrl(credentials.base_url);
    const url = `${baseUrl}/rest/api/2/issue`;
    const authHeader = createJiraAuthHeader(credentials);

    // First, try to get user info to get accountId if assignee is provided
    let assigneeField = undefined;
    if (issueData.assignee) {
      try {
        // Try to get user info to get accountId
        const userUrl = `${baseUrl}/rest/api/2/user?username=${encodeURIComponent(issueData.assignee)}`;
        const userResult = await makeJiraApiCall<{ accountId: string; name: string; emailAddress: string }>(userUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json',
          },
        }, credentials);

        if (userResult.success && userResult.data) {
          // Use accountId if available, otherwise fall back to name
          assigneeField = {
            accountId: userResult.data.accountId
          };
          console.log(`Found user accountId: ${userResult.data.accountId} for assignee: ${issueData.assignee}`);
        } else {
          // Fall back to using name
          assigneeField = {
            name: issueData.assignee
          };
          console.log(`Using name for assignee: ${issueData.assignee} (accountId lookup failed)`);
        }
      } catch (error) {
        // Fall back to using name if user lookup fails
        assigneeField = {
          name: issueData.assignee
        };
        console.log(`Using name for assignee: ${issueData.assignee} (user lookup failed)`);
      }
    }

    const ticketData = {
      fields: {
        project: {
          key: issueData.projectKey
        },
        summary: issueData.summary,
        description: issueData.description || '',
        issuetype: {
          name: issueData.issueType || 'Task'
        },
        priority: {
          name: issueData.priority || 'Medium'
        },
        ...(assigneeField && {
          assignee: assigneeField
        })
      }
    };

    console.log('Creating JIRA ticket with data:', JSON.stringify(ticketData, null, 2));

    const result = await makeJiraApiCall<{ key: string; id: string }>(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    }, credentials);

    return result;
  } catch (error) {
    console.error('JIRA create issue error:', error);
    return {
      success: false,
      error: 'Failed to create JIRA issue',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create JIRA issue',
    };
  }
}

// Enhanced search function with multiple strategies
export async function searchJiraIssuesEnhanced(
  credentials: JiraCredentials,
  projectKey: string,
  searchTerm: string,
  maxResults: number = 20
): Promise<JiraApiResponse<{ issues: JiraIssue[] }>> {
  const searchStrategies = [
    // Strategy 1: Exact key match
    `project = "${projectKey}" AND key = "${searchTerm.toUpperCase()}"`,
    // Strategy 2: Key contains search term
    `project = "${projectKey}" AND key ~ "${searchTerm.toUpperCase()}"`,
    // Strategy 3: Summary contains search term
    `project = "${projectKey}" AND summary ~ "${searchTerm}"`,
    // Strategy 4: Text search (broader)
    `project = "${projectKey}" AND text ~ "${searchTerm}"`,
    // Strategy 5: Get all and filter client-side (fallback)
    `project = "${projectKey}" ORDER BY updated DESC`
  ];

  for (let i = 0; i < searchStrategies.length - 1; i++) {
    const jql = searchStrategies[i];
    console.log(`Trying search strategy ${i + 1}: ${jql}`);
    
    const result = await searchJiraIssues(credentials, jql, maxResults);
    
    if (result.success && result.data && result.data.issues.length > 0) {
      console.log(`Strategy ${i + 1} successful: Found ${result.data.issues.length} tickets`);
      return result;
    }
  }

  // Fallback: Get all tickets and filter client-side
  console.log('Trying fallback strategy: Get all tickets and filter client-side');
  const fallbackResult = await searchJiraIssues(credentials, searchStrategies[searchStrategies.length - 1], maxResults);
  
  if (fallbackResult.success && fallbackResult.data) {
    const filteredIssues = fallbackResult.data.issues.filter(issue => 
      issue.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.fields.summary.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log(`Fallback successful: Found ${filteredIssues.length} tickets after filtering`);
    
          return {
        success: true,
        data: { issues: filteredIssues },
        message: `Found ${filteredIssues.length} tickets`,
        rateLimitInfo: fallbackResult.rateLimitInfo,
      };
  }

  return fallbackResult;
}
