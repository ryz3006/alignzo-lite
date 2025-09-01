import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getJiraProjects } from '@/lib/jira';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Get user's JIRA credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('user_integrations')
      .select('base_url, user_email_integration, api_token, is_verified')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .eq('is_verified', true)
      .single();

    if (credentialsError || !credentials) {
      return NextResponse.json(
        { error: 'JIRA integration not found or not verified' },
        { status: 404 }
      );
    }

    // Fetch JIRA projects from JIRA API
    const jiraProjects = await getJiraProjects(userEmail);

    // Filter projects based on query if provided
    let filteredProjects = jiraProjects;
    if (query) {
      const queryLower = query.toLowerCase();
      filteredProjects = jiraProjects.filter(project => 
        project.key.toLowerCase().includes(queryLower) || 
        project.name.toLowerCase().includes(queryLower)
      );
    }

    return NextResponse.json({
      success: true,
      projects: filteredProjects
    });

  } catch (error) {
    console.error('Error fetching JIRA projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch JIRA projects' },
      { status: 500 }
    );
  }
}
