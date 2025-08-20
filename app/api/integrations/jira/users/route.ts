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
      console.log('Fetching JIRA users from:', `${integration.base_url}/rest/api/3/users/search`);
      
      const jiraResponse = await fetch(`${integration.base_url}/rest/api/3/users/search`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${integration.user_email_integration}:${integration.api_token}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('JIRA API response status:', jiraResponse.status);

      if (!jiraResponse.ok) {
        const errorText = await jiraResponse.text();
        console.error('JIRA API error response:', errorText);
        throw new Error(`JIRA API error: ${jiraResponse.status} - ${errorText}`);
      }

      const jiraUsers = await jiraResponse.json();
      console.log('JIRA API response:', JSON.stringify(jiraUsers, null, 2));
      
      // Extract relevant user information
      const users = jiraUsers.map((user: any) => ({
        id: user.accountId || user.id,
        name: user.displayName || user.name,
        email: user.emailAddress || user.email,
        username: user.name || user.username,
        active: user.active !== false // Default to true if not specified
      })).filter((user: any) => user.active && user.name); // Only show active users with names

      console.log('Processed users:', users.length);
      return NextResponse.json({ users });
    } catch (jiraError) {
      console.error('Error fetching JIRA users:', jiraError);
      
      // Return sample data for testing if JIRA API fails
      console.log('Returning sample data for testing');
      const sampleUsers = [
        {
          id: 'sample1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          username: 'johndoe',
          active: true
        },
        {
          id: 'sample2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          username: 'janesmith',
          active: true
        },
        {
          id: 'sample3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          username: 'bobjohnson',
          active: true
        }
      ];
      
      return NextResponse.json({ 
        users: sampleUsers,
        error: `JIRA API failed: ${jiraError instanceof Error ? jiraError.message : 'Unknown error'}. Showing sample data.`
      });
    }
  } catch (error) {
    console.error('Error in JIRA users endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
