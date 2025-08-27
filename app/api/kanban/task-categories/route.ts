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

    // Use the database function to get task categories with options
    let { data, error } = await supabaseClient.rpc('get_task_categories_with_options', {
      p_task_id: taskId
    });

    // If the TABLE function fails, try the JSON function as fallback
    if (error) {
      const jsonResult = await supabaseClient.rpc('get_task_categories_with_options_json', {
        p_task_id: taskId
      });
      
      if (jsonResult.error) {
        const simpleJsonResult = await supabaseClient.rpc('get_task_categories_simple_json', {
          p_task_id: taskId
        });
        
        if (simpleJsonResult.error) {
          console.error('All functions failed:', { tableError: error, jsonError: jsonResult.error, simpleJsonError: simpleJsonResult.error });
          return NextResponse.json(
            { error: 'Failed to fetch task categories', details: `Table function: ${error}, JSON function: ${jsonResult.error}, Simple JSON function: ${simpleJsonResult.error}` },
            { status: 500 }
          );
        }
        data = simpleJsonResult.data;
        error = simpleJsonResult.error;
      } else {
        // Use the JSON function result
        data = jsonResult.data;
        error = jsonResult.error;
      }
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

    // Create timeline entry for category changes
    try {
      // Get current categories for comparison
      const currentCategoriesResponse = await supabaseClient.rpc('get_task_categories_with_options_json', {
        p_task_id: taskId
      });
      
      const currentCategories = currentCategoriesResponse.data || [];
      const newCategories = categories;
      
      // Get category and option names for better timeline display
      const categoryDetails = [];
      
      for (const cat of newCategories) {
        try {
          // Get category name
          const categoryResponse = await supabaseClient.get('project_categories', {
            select: 'name',
            filters: { id: cat.category_id }
          });
          
          const categoryName = categoryResponse.data?.[0]?.name || cat.category_id;
          
          // Get option name if category_option_id is provided
          let optionName = null;
          if (cat.category_option_id) {
            const optionResponse = await supabaseClient.get('category_options', {
              select: 'option_name',
              filters: { id: cat.category_option_id }
            });
            optionName = optionResponse.data?.[0]?.option_name || cat.category_option_id;
          }
          
          categoryDetails.push({
            categoryName,
            optionName,
            displayText: optionName ? `${categoryName}: ${optionName}` : categoryName
          });
        } catch (error) {
          // Fallback to ID if name lookup fails
          categoryDetails.push({
            categoryName: cat.category_id,
            optionName: cat.category_option_id,
            displayText: cat.category_option_id ? `${cat.category_id}: ${cat.category_option_id}` : cat.category_id
          });
        }
      }
      
      const categoryNames = categoryDetails.map(cat => cat.displayText).join(', ');
      
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('@/lib/kanban-api');
      
      await createTaskTimeline(
        taskId,
        userEmail || 'system',
        'categories_updated',
        {
          categories: categoryNames,
          count: newCategories.length,
          previous_count: currentCategories.length,
          category_details: categoryDetails
        }
      );
    } catch (timelineError) {
      console.warn('Failed to create timeline entry for category changes:', timelineError);
      // Don't fail the operation if timeline creation fails
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
    const userEmail = searchParams.get('userEmail');

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
      p_user_email: userEmail || 'system'
    });

    if (error) {
      console.error('Error deleting task categories:', error);
      return NextResponse.json(
        { error: 'Failed to delete task categories', details: error },
        { status: 500 }
      );
    }

    // Create timeline entry for category removal
    try {
      // Import the createTaskTimeline function
      const { createTaskTimeline } = await import('@/lib/kanban-api');
      
      await createTaskTimeline(
        taskId,
        userEmail || 'system',
        'categories_removed',
        {
          action: 'All categories removed from task'
        }
      );
    } catch (timelineError) {
      console.warn('Failed to create timeline entry for category removal:', timelineError);
      // Don't fail the operation if timeline creation fails
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
