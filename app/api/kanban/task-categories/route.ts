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

    // First, check if the task exists and user has access
    const { data: taskData, error: taskError } = await supabaseClient.get('kanban_tasks', {
      select: 'id, title, project_id',
      filters: { id: taskId }
    });

    if (taskError || !taskData || taskData.length === 0) {
      console.error('Error checking task access:', taskError);
      return NextResponse.json(
        { error: 'Task not found or access denied', details: taskError || 'Task not found' },
        { status: 404 }
      );
    }

    console.log('Task found:', taskData);

    // First, try the debug function to see what's happening
    console.log('Calling debug function with taskId:', taskId);
    const { data: debugData, error: debugError } = await supabaseClient.rpc('debug_task_categories', {
      p_task_id: taskId
    });
    
    console.log('Debug response:', { debugData, debugError });

    // Try the simple function first
    console.log('Calling simple RPC function with taskId:', taskId);
    const { data: simpleData, error: simpleError } = await supabaseClient.rpc('get_task_categories_simple', {
      p_task_id: taskId
    });
    
    console.log('Simple RPC response:', { simpleData, simpleError });

    // Use the database function to get task categories with options
    console.log('Calling RPC function with taskId:', taskId);
    
    let { data, error } = await supabaseClient.rpc('get_task_categories_with_options', {
      p_task_id: taskId
    });

    console.log('RPC response:', { data, error });

    // If the TABLE function fails, try the JSON function as fallback
    if (error) {
      console.log('TABLE function failed, trying JSON function...');
      const jsonResult = await supabaseClient.rpc('get_task_categories_with_options_json', {
        p_task_id: taskId
      });
      
      console.log('JSON function response:', jsonResult);
      
      if (jsonResult.error) {
        console.error('Both functions failed:', { tableError: error, jsonError: jsonResult.error });
        return NextResponse.json(
          { error: 'Failed to fetch task categories', details: `Table function: ${error}, JSON function: ${jsonResult.error}` },
          { status: 500 }
        );
      }
      
      // Use the JSON function result
      data = jsonResult.data;
      error = jsonResult.error;
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
        { error: 'Failed to update task categories', details: error },
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
        { error: 'Failed to delete task categories', details: error },
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
