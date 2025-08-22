import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira');

    if (error) {
      console.error('Error fetching Jira integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Jira integrations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      integrations: data || []
    });

  } catch (error) {
    console.error('Error in Jira integrations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withJiraAudit(AuditEventType.CREATE)('jira_integration', 'Create or update Jira integration')(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, jiraLimiterConfig);
  if (!rateLimitResponse.success) {
    return NextResponse.json(
      { error: rateLimitResponse.message || 'Rate limit exceeded' },
      { status: rateLimitResponse.statusCode || 429 }
    );
  }
  
  try {
    const body = await request.json();

    // Mask request data for logging
    const maskedBody = apiMaskingManager.maskApiRequest(body, '/api/integrations/jira', 'POST');

    // Validate input
    const validatedData = jiraIntegrationSchema.parse(body);

    // Check if integration already exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_email', validatedData.user_email)
      .eq('integration_type', 'jira');

    if (checkError) {
      console.error('Error checking existing integration:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing integration' },
        { status: 500 }
      );
    }

    let result;
    if (existingIntegration && existingIntegration.length > 0) {
      // Update existing integration
      const { data: updateData, error: updateError } = await supabase
        .from('user_integrations')
        .update({
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIntegration[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating JIRA integration:', updateError);
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        );
      }

      result = updateData;
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
    const maskedResult = apiMaskingManager.maskApiResponse(result, '/api/integrations/jira', 'POST');

    const response = NextResponse.json({
      message: 'Integration saved successfully',
      integration: maskedResult
    });

    const finalResponse = addRateLimitHeaders(response, 29, new Date(Date.now() + 60000).toISOString());
    return finalResponse as NextResponse;
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
