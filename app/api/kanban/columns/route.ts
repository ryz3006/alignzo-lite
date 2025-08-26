import { NextRequest, NextResponse } from 'next/server';
import { 
  createKanbanColumnWithRedis,
  updateKanbanColumnWithRedis,
  deleteKanbanColumnWithRedis
} from '@/lib/kanban-api-redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json(
        { success: false, error: 'Action and data are required' },
        { status: 400 }
      );
    }

    const projectId = data.project_id;
    const teamId = data.team_id;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create':
        const createResult = await createKanbanColumnWithRedis(data, projectId, teamId);
        return NextResponse.json(createResult);

      case 'update':
        const updateResult = await updateKanbanColumnWithRedis(data.id, data, projectId, teamId);
        return NextResponse.json(updateResult);

      case 'delete':
        const deleteResult = await deleteKanbanColumnWithRedis(data.id, projectId, teamId);
        return NextResponse.json(deleteResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in kanban columns API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
