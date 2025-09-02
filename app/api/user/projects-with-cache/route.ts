export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserProjectsWithCache } from '@/lib/user-api-enhanced';
import { getCurrentUserServer } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserServer(request);
    if (!currentUser?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const data = await getUserProjectsWithCache(currentUser.email);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in projects-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user projects' },
      { status: 500 }
    );
  }
}
