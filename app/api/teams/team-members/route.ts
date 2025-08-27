import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID parameter is required' }, { status: 400 });
    }

    // Get team members with user details
    const teamResponse = await supabaseClient.get('team_members', {
      select: 'user_id,users(id,email,full_name)',
      filters: { team_id: teamId }
    });

    if (teamResponse.error) {
      throw new Error(teamResponse.error);
    }

    const teamMembers = teamResponse.data?.map((membership: any) => membership.users).filter(Boolean) || [];

    return NextResponse.json({ teamMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
