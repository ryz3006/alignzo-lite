import { NextRequest, NextResponse } from 'next/server';
import { jiraCredentialsSchema } from '@/lib/validation';
import { z } from 'zod';
import { applyRateLimit, jiraLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, jiraLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = jiraCredentialsSchema.parse(body);
    const { base_url, user_email, api_token } = validatedData;

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
      const successResponse = NextResponse.json({
        success: true,
        message: 'JIRA connection verified successfully',
        user: {
          name: userData.displayName,
          email: userData.emailAddress,
          accountId: userData.accountId
        }
      });
      
      return addRateLimitHeaders(successResponse, request, jiraLimiterConfig);
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
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
