export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardDataWithCache } from '@/lib/user-api-enhanced';
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

    const data = await getDashboardDataWithCache(currentUser.email);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to load dashboard data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in dashboard-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
