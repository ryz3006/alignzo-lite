import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { jiraIntegrationSchema } from '@/lib/validation';
import { z } from 'zod';
import { applyRateLimit, jiraLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { withJiraAudit } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { apiMaskingManager } from '@/lib/api-masking';

export const GET = withJiraAudit(AuditEventType.READ)(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, jiraLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailSchema = z.string().email();
    emailSchema.parse(userEmail);

    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch integration' },
        { status: 500 }
      );
    }

    // Mask sensitive data in the response
    const maskedIntegration = integration ? apiMaskingManager.maskResponse(integration, 'jira') : null;

    const response = NextResponse.json({
      integration: maskedIntegration
    });
    
    return addRateLimitHeaders(response, request, jiraLimiterConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    console.error('Error fetching JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

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
    const { data: existingIntegration } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_email', validatedData.user_email)
      .eq('integration_type', 'jira')
      .single();

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data: integration, error } = await supabase
        .from('user_integrations')
        .update({
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIntegration.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        );
      }

      result = integration;
    } else {
      // Create new integration
      const { data: integration, error } = await supabase
        .from('user_integrations')
        .insert({
          user_email: validatedData.user_email,
          integration_type: 'jira',
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified
        })
        .select()
        .single();

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
