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

    // Get team members with user details using a proper join
    const teamResponse = await supabaseClient.query({
      table: 'team_members',
      action: 'select',
      select: 'id, user_id, users(id, email, full_name)',
      filters: { team_id: teamId },
      order: { column: 'created_at', ascending: true }
    });

    if (teamResponse.error) {
      throw new Error(teamResponse.error);
    }

    // Transform the data to match the expected format
    const teamMembers = teamResponse.data?.map((membership: any) => ({
      id: membership.id,
      email: membership.users?.email || '',
      full_name: membership.users?.full_name || ''
    })).filter((member: any) => member.email) || [];

    return NextResponse.json({ teamMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
