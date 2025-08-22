import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';
import { jiraIntegrationSchema } from '@/lib/validation';
import { z } from 'zod';
import { applyRateLimit, jiraLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { withJiraAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { apiMaskingManager } from '@/lib/api-masking';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get user's Jira integrations
    const response = await supabaseClient.get('user_integrations', {
      select: '*',
      filters: { 
        user_email: userEmail,
        integration_type: 'jira'
      }
    });

    if (response.error) {
      console.error('Error fetching Jira integrations:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch Jira integrations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      integrations: response.data || []
    });

  } catch (error) {
    console.error('Error in Jira integrations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withJiraAudit(AuditEventType.CREATE)(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, jiraLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const body = await request.json();

    // Mask request data for logging
    const maskedBody = apiMaskingManager.maskRequest(body, 'jira');

    // Validate input
    const validatedData = jiraIntegrationSchema.parse(body);

    // Check if integration already exists
    const { data: existingIntegration } = await supabaseClient
      .get('user_integrations', {
        select: 'id',
        filters: {
          user_email: validatedData.user_email,
          integration_type: 'jira'
        }
      });

    let result;
    if (existingIntegration.data && existingIntegration.data.length > 0) {
      // Update existing integration
      const response = await supabaseClient.update('user_integrations', existingIntegration.data[0].id, {
        base_url: validatedData.base_url,
        user_email_integration: validatedData.user_email_integration,
        api_token: validatedData.api_token,
        is_verified: validatedData.is_verified,
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error updating JIRA integration:', response.error);
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        );
      }

      result = response.data;
    } else {
      // Create new integration
      const { data: integration, error } = await supabaseClient
        .insert('user_integrations', {
          user_email: validatedData.user_email,
          integration_type: 'jira',
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified
        });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create integration' },
          { status: 500 }
        );
      }

      result = integration;
    }

        // Mask sensitive data in the response
    const maskedResult = apiMaskingManager.maskResponse(result, 'jira');

    const response = NextResponse.json({
      message: 'Integration saved successfully',
      integration: maskedResult
    });

    return addRateLimitHeaders(response, request, jiraLimiterConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error saving JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
