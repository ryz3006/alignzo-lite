import { NextRequest, NextResponse } from 'next/server';
import { getUserShiftsWithCache } from '@/lib/user-api-enhanced';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const data = await getUserShiftsWithCache(currentUser.email, date || undefined);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in shifts-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user shifts' },
      { status: 500 }
    );
  }
}
