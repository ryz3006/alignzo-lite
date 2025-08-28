import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { getTaskComments, createTaskComment } from '@/lib/kanban-api';


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

    const response = await getTaskComments(taskId);
    
    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, comment, userEmail } = body;

    if (!taskId || !comment || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Task ID, comment, and user email are required' },
        { status: 400 }
      );
    }

    const response = await createTaskComment(taskId, userEmail, comment);
    
    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating task comment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
