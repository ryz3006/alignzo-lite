import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch JIRA projects for selection
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

    // Fetch JIRA projects using the JIRA API
    try {
      let searchUrl = `${integration.base_url}/rest/api/3/project/search`;
      const searchParams = new URLSearchParams();
      
      if (query.trim()) {
        searchParams.append('query', query);
      }
      
      // Add expand to get more project details
      searchParams.append('expand', 'description,lead,issueTypes');
      searchParams.append('maxResults', '50');
      
      if (searchParams.toString()) {
        searchUrl += `?${searchParams.toString()}`;
      }
      
      console.log('JIRA projects search URL:', searchUrl);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${integration.user_email_integration}:${integration.api_token}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('JIRA projects response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('JIRA projects error response:', errorText);
        throw new Error(`JIRA API error: ${response.status} - ${errorText}`);
      }

      const jiraResponse = await response.json();
      console.log('JIRA projects response:', JSON.stringify(jiraResponse, null, 2));
      
      // Extract relevant project information
      const projects = (jiraResponse.values || []).map((project: any) => ({
        key: project.key,
        name: project.name,
        description: project.description || '',
        projectTypeKey: project.projectTypeKey,
        lead: project.lead ? {
          displayName: project.lead.displayName,
          emailAddress: project.lead.emailAddress
        } : null,
        issueTypeCount: project.issueTypes ? project.issueTypes.length : 0
      }));

      console.log('Processed projects:', projects.length);
      return NextResponse.json({ projects });
    } catch (jiraError) {
      console.error('Error fetching JIRA projects:', jiraError);
      
      // Return sample data for testing if JIRA API fails
      console.log('Returning sample data for testing');
      const sampleProjects = [
        {
          key: 'PROJ1',
          name: 'Sample Project 1',
          description: 'This is a sample project for testing',
          projectTypeKey: 'software',
          lead: {
            displayName: 'John Doe',
            emailAddress: 'john.doe@example.com'
          },
          issueTypeCount: 5
        },
        {
          key: 'PROJ2',
          name: 'Sample Project 2',
          description: 'Another sample project',
          projectTypeKey: 'business',
          lead: {
            displayName: 'Jane Smith',
            emailAddress: 'jane.smith@example.com'
          },
          issueTypeCount: 3
        },
        {
          key: 'DEV',
          name: 'Development Project',
          description: 'Development and testing project',
          projectTypeKey: 'software',
          lead: {
            displayName: 'Bob Johnson',
            emailAddress: 'bob.johnson@example.com'
          },
          issueTypeCount: 7
        }
      ];
      
      return NextResponse.json({ 
        projects: sampleProjects,
        error: `JIRA API failed: ${jiraError instanceof Error ? jiraError.message : 'Unknown error'}`
      });
    }
  } catch (error) {
    console.error('Error in JIRA projects endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
