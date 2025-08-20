import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch JIRA users for suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const query = searchParams.get('query') || '';

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('Looking for JIRA integration for user:', userEmail);

    // Get JIRA integration details for the user
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('base_url, user_email_integration, api_token')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .eq('is_verified', true)
      .single();

    console.log('Integration lookup result:', { integration, error: integrationError });

    if (integrationError || !integration) {
      console.log('Integration not found or error:', integrationError);
      return NextResponse.json(
        { error: 'JIRA integration not found or not verified' },
        { status: 404 }
      );
    }

    // Fetch JIRA users using the JIRA API
    try {
      let jiraUsers = [];
      
      // Strategy 1: Search by email if query looks like an email
      if (query && query.includes('@')) {
        console.log('Searching JIRA users by email:', query);
        const emailSearchUrl = `${integration.base_url}/rest/api/3/user/search?query=${encodeURIComponent(query)}`;
        console.log('Email search URL:', emailSearchUrl);
        
        const emailResponse = await fetch(emailSearchUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${integration.user_email_integration}:${integration.api_token}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log('Email search response status:', emailResponse.status);

        if (emailResponse.ok) {
          jiraUsers = await emailResponse.json();
          console.log('Email search results:', JSON.stringify(jiraUsers, null, 2));
        } else {
          const errorText = await emailResponse.text();
          console.log('Email search failed:', errorText);
        }
      }
      
      // Strategy 2: If no results from email search or query doesn't look like email, try general search
      if (jiraUsers.length === 0) {
        console.log('Performing general JIRA user search with query:', query);
        let searchUrl = `${integration.base_url}/rest/api/3/user/search`;
        if (query.trim()) {
          searchUrl += `?query=${encodeURIComponent(query)}`;
        }
        console.log('General search URL:', searchUrl);
        
        const generalResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${integration.user_email_integration}:${integration.api_token}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log('General search response status:', generalResponse.status);

        if (!generalResponse.ok) {
          const errorText = await generalResponse.text();
          console.error('General search error response:', errorText);
          throw new Error(`JIRA API error: ${generalResponse.status} - ${errorText}`);
        }

        jiraUsers = await generalResponse.json();
        console.log('General search results:', JSON.stringify(jiraUsers, null, 2));
      }
      
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
