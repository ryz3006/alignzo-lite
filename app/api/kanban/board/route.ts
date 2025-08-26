import { NextRequest, NextResponse } from 'next/server';
import { getKanbanBoardWithRedis } from '@/lib/kanban-api-redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const result = await getKanbanBoardWithRedis(projectId, teamId || undefined);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Kanban board:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Kanban board' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    // Import Supabase client for POST operations
    const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
    const { cookies } = await import('next/headers');
    
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'move_task':
        const { taskId, columnId, sortOrder } = data;
        const { data: moveResult, error: moveError } = await supabase.rpc(
          'move_kanban_task_optimized',
          {
            task_uuid: taskId,
            new_column_uuid: columnId,
            new_sort_order: sortOrder,
            user_email_param: user.email
          }
        );

        if (moveError) {
          console.error('Error moving task:', moveError);
          return NextResponse.json(
            { success: false, error: 'Failed to move task' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: moveResult
        });

      case 'create_task':
        const { data: createResult, error: createError } = await supabase.rpc(
          'create_kanban_task_optimized',
          {
            task_data: JSON.stringify(data),
            user_email_param: user.email
          }
        );

        if (createError) {
          console.error('Error creating task:', createError);
          return NextResponse.json(
            { success: false, error: 'Failed to create task' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: createResult
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in kanban board API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
