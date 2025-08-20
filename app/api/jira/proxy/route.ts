import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, endpoint, method = 'GET', requestBody } = body;

    if (!userEmail || !endpoint) {
      return NextResponse.json(
        { error: 'User email and endpoint are required' },
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

    // Create the full JIRA API URL
    const baseUrl = credentials.base_url.endsWith('/') 
      ? credentials.base_url.slice(0, -1) 
      : credentials.base_url;
    const url = `${baseUrl}/rest/api/2/${endpoint}`;

    // Create Basic Auth header
    const authString = `${credentials.user_email_integration}:${credentials.api_token}`;
    const authHeader = Buffer.from(authString).toString('base64');

    console.log(`Making JIRA request to: ${url}`);

    // Make the request to JIRA
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
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
    console.log(`JIRA API success: ${endpoint}`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('JIRA proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
