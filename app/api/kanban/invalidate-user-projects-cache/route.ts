import { NextRequest, NextResponse } from 'next/server';
import { invalidateUserProjectsCache } from '@/lib/kanban-api-enhanced';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email parameter is required' },
        { status: 400 }
      );
    }

    await invalidateUserProjectsCache(userEmail);
    
    return NextResponse.json({
      success: true,
      message: `Cache invalidated for user: ${userEmail}`
    });
  } catch (error) {
    console.error('Error invalidating user projects cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
