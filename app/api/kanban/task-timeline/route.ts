import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { getTaskTimeline, createTaskTimeline } from '@/lib/kanban-api';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    console.log(`[DEBUG] Timeline API called with taskId: ${taskId}`);

    if (!taskId) {
      console.log(`[DEBUG] Task ID is missing, returning 400 error`);
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Calling getTaskTimeline function for taskId: ${taskId}`);
    const response = await getTaskTimeline(taskId);
    
    console.log(`[DEBUG] Timeline API response received:`, {
      success: response.success,
      dataCount: response.data?.length || 0,
      error: response.error
    });
    
    if (response.success) {
      console.log(`[DEBUG] Returning successful timeline response with ${response.data?.length || 0} entries`);
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      console.log(`[DEBUG] Returning error response:`, response.error);
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[DEBUG] Error in timeline API route:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, action, details } = body;

    if (!taskId || !action) {
      return NextResponse.json(
        { success: false, error: 'Task ID and action are required' },
        { status: 400 }
      );
    }

    const response = await createTaskTimeline(taskId, currentUser.email, action, details);
    
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
    console.error('Error creating task timeline entry:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
