import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch JIRA users for suggestions
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

    // Get JIRA integration details for the user
    const { data: integration, error: integrationError } = await supabase
      .from('jira_integrations')
      .select('base_url, user_email_integration, api_token')
      .eq('user_email', userEmail)
      .eq('is_verified', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'JIRA integration not found or not verified' },
        { status: 404 }
      );
    }

    // Fetch JIRA users using the JIRA API
    try {
      const jiraResponse = await fetch(`${integration.base_url}/rest/api/3/users/search`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${integration.user_email_integration}:${integration.api_token}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!jiraResponse.ok) {
        throw new Error(`JIRA API error: ${jiraResponse.status}`);
      }

      const jiraUsers = await jiraResponse.json();
      
      // Extract relevant user information
      const users = jiraUsers.map((user: any) => ({
        id: user.accountId,
        name: user.displayName,
        email: user.emailAddress,
        username: user.name,
        active: user.active
      })).filter((user: any) => user.active); // Only show active users

      return NextResponse.json({ users });
    } catch (jiraError) {
      console.error('Error fetching JIRA users:', jiraError);
      return NextResponse.json(
        { error: 'Failed to fetch JIRA users' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in JIRA users endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
