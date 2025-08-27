import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Validate that the user exists in the database and get user ID
    const userResponse = await supabaseClient.get('users', {
      select: 'id,email',
      filters: { email: email }
    });

    if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResponse.data[0].id;

    // Get user's team memberships
    const teamResponse = await supabaseClient.get('team_members', {
      select: 'team_id,teams(*)',
      filters: { user_id: userId }
    });

    if (teamResponse.error) {
      throw new Error(teamResponse.error);
    }

    const teams = teamResponse.data?.map((membership: any) => membership.teams) || [];

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user teams' },
      { status: 500 }
    );
  }
}
