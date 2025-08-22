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

    // Get user's Jira project mappings
    const { data, error } = await supabase
      .from('jira_project_mappings')
      .select('*')
      .eq('integration_user_email', userEmail);

    if (error) {
      console.error('Error fetching Jira project mappings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mappings: data || []
    });

  } catch (error) {
    console.error('Error in Jira project mappings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
