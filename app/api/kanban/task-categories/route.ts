import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// GET: Retrieve categories for a specific task
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Use the database function to get task categories with options
    const { data, error } = await supabaseClient.rpc('get_task_categories_with_options', {
      p_task_id: taskId
    });

    if (error) {
      console.error('Error fetching task categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: data || []
    });

  } catch (error) {
    console.error('Error in task categories API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create or update task categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, categories, userEmail } = body;

    if (!taskId || !categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Task ID and categories array are required' },
        { status: 400 }
      );
    }

    // Validate categories structure
    for (const category of categories) {
      if (!category.category_id) {
        return NextResponse.json(
          { error: 'Each category must have a category_id' },
          { status: 400 }
        );
      }
    }

    // Use the database function to update task categories
    const { data, error } = await supabaseClient.rpc('update_task_categories', {
      p_task_id: taskId,
      p_categories: JSON.stringify(categories),
      p_user_email: userEmail || 'system'
    });

    if (error) {
      console.error('Error updating task categories:', error);
      return NextResponse.json(
        { error: 'Failed to update task categories' },
        { status: 500 }
      );
    }

    if (data && !data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to update task categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task categories updated successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in task categories API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove all categories for a task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Delete all category mappings for the task
    // Since we can't delete by filters directly, we'll use the database function
    // which handles the deletion in the transaction
    const { error } = await supabaseClient.rpc('update_task_categories', {
      p_task_id: taskId,
      p_categories: '[]', // Empty array to clear all categories
      p_user_email: 'system'
    });

    if (error) {
      console.error('Error deleting task categories:', error);
      return NextResponse.json(
        { error: 'Failed to delete task categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task categories deleted successfully'
    });

  } catch (error) {
    console.error('Error in task categories API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
