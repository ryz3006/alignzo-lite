import { NextRequest, NextResponse } from 'next/server';
import { kanbanCache } from '@/lib/kanban-cache';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    // Invalidate user-related cache
    await kanbanCache.invalidateUser(userId);
    console.log(`[Cache] Invalidated user cache for ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'User cache invalidated successfully' 
    });
  } catch (error) {
    console.error('User cache invalidation failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to invalidate user cache' 
    }, { status: 500 });
  }
}
