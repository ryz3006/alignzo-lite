import { NextRequest, NextResponse } from 'next/server';
import { getKanbanBoardWithCache } from '@/lib/kanban-api-enhanced';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');

    if (!projectId || !teamId) {
      return NextResponse.json(
        { error: 'Missing projectId or teamId parameter' },
        { status: 400 }
      );
    }

    const data = await getKanbanBoardWithCache(projectId, teamId);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in board-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kanban board' },
      { status: 500 }
    );
  }
}
