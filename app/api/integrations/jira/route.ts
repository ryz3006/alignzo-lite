import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    return NextResponse.json({
      integration: integration || null
    });
  } catch (error) {
    console.error('Error fetching JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_email,
      base_url,
      user_email_integration,
      api_token,
      is_verified
    } = body;

    if (!user_email || !base_url || !user_email_integration || !api_token) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_email', user_email)
      .eq('integration_type', 'jira')
      .single();

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data: integration, error } = await supabase
        .from('user_integrations')
        .update({
          base_url,
          user_email_integration,
          api_token,
          is_verified,
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
          user_email,
          integration_type: 'jira',
          base_url,
          user_email_integration,
          api_token,
          is_verified
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

    return NextResponse.json({
      message: 'Integration saved successfully',
      integration: result
    });
  } catch (error) {
    console.error('Error saving JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
