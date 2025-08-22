import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

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

    // Get user's Jira project mappings
    const response = await supabaseClient.get('jira_project_mappings', {
      select: '*',
      filters: { 
        integration_user_email: userEmail
      }
    });

    if (response.error) {
      console.error('Error fetching Jira project mappings:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch project mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mappings: response.data || []
    });

  } catch (error) {
    console.error('Error in Jira project mappings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
