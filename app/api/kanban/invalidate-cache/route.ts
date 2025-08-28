import { NextRequest, NextResponse } from 'next/server';
import { kanbanCache } from '@/lib/kanban-cache';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');

    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    if (teamId) {
      // Invalidate specific board cache
      await kanbanCache.invalidateBoard(projectId, teamId);
      console.log(`[Cache] Invalidated board cache for ${projectId}:${teamId}`);
    } else {
      // Invalidate all project-related cache
      await kanbanCache.invalidateProject(projectId);
      console.log(`[Cache] Invalidated project cache for ${projectId}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cache invalidated successfully' 
    });
  } catch (error) {
    console.error('Cache invalidation failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to invalidate cache' 
    }, { status: 500 });
  }
}
