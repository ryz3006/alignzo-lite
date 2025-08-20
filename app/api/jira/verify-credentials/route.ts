import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_url, user_email, api_token } = body;

    if (!base_url || !user_email || !api_token) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Clean up the base URL
    const cleanBaseUrl = base_url.endsWith('/') ? base_url.slice(0, -1) : base_url;
    
    // Create Basic Auth header
    const authString = `${user_email}:${api_token}`;
    const authHeader = Buffer.from(authString).toString('base64');

    // Test the connection to JIRA
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
      return NextResponse.json({
        success: true,
        message: 'JIRA connection verified successfully',
        user: {
          name: userData.displayName,
          email: userData.emailAddress,
          accountId: userData.accountId
        }
      });
    } else {
      let message = 'Failed to verify JIRA connection';
      if (response.status === 401) {
        message = 'Invalid credentials. Please check your email and API token.';
      } else if (response.status === 403) {
        message = 'Access denied. Please check your API token permissions.';
      } else if (response.status === 404) {
        message = 'JIRA instance not found. Please check your base URL.';
      }
      
      return NextResponse.json({
        success: false,
        message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in JIRA verification:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Unable to connect to JIRA. Please check your configuration.'
      },
      { status: 500 }
    );
  }
}
