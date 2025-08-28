import { NextRequest, NextResponse } from 'next/server';
import { getUserTeamsWithCache } from '@/lib/user-api-enhanced';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const data = await getUserTeamsWithCache(currentUser.email);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in teams-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user teams' },
      { status: 500 }
    );
  }
}
