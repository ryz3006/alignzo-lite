import { NextRequest, NextResponse } from 'next/server';
import { 
  createKanbanTaskWithRedis,
  updateKanbanTaskWithRedis,
  deleteKanbanTaskWithRedis
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
        const createResult = await createKanbanTaskWithRedis(data, projectId, teamId);
        return NextResponse.json(createResult);

      case 'update':
        const updateResult = await updateKanbanTaskWithRedis(data.id, data, projectId, teamId);
        return NextResponse.json(updateResult);

      case 'delete':
        const deleteResult = await deleteKanbanTaskWithRedis(data.id, projectId, teamId);
        return NextResponse.json(deleteResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in kanban tasks API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
