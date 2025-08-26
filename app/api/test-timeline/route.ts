import { NextRequest, NextResponse } from 'next/server';
import { createTaskTimeline, getTaskTimeline } from '@/lib/kanban-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, userEmail, action, details } = body;

    if (!taskId || !userEmail || !action) {
      return NextResponse.json(
        { success: false, error: 'Task ID, user email, and action are required' },
        { status: 400 }
      );
    }

    console.log('Test timeline creation:', { taskId, userEmail, action, details });

    // Create timeline entry
    const createResponse = await createTaskTimeline(taskId, userEmail, action, details);
    console.log('Create response:', createResponse);

    if (!createResponse.success) {
      return NextResponse.json(
        { success: false, error: createResponse.error },
        { status: 500 }
      );
    }

    // Immediately retrieve timeline entries
    const getResponse = await getTaskTimeline(taskId);
    console.log('Get response:', getResponse);

    return NextResponse.json({
      success: true,
      createResult: createResponse,
      getResult: getResponse
    });

  } catch (error) {
    console.error('Test timeline error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log('Test timeline retrieval for task ID:', taskId);

    const response = await getTaskTimeline(taskId);
    console.log('Timeline response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Test timeline retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
