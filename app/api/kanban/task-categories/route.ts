import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
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

    // Get current categories for comparison BEFORE updating
    let currentCategories = [];
    try {
      const currentCategoriesResponse = await supabaseClient.rpc('get_task_categories_with_options_json', {
        p_task_id: taskId
      });
      currentCategories = currentCategoriesResponse.data || [];
    } catch (error) {
      console.warn('Failed to get current categories for comparison:', error);
      // Continue with the update even if we can't get current categories
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

    // Compare current and new categories to determine if there are actual changes
    const hasChanges = compareCategories(currentCategories, categories);

    // Only create timeline entry if there are actual changes
    if (hasChanges) {
      try {
        // Get category and option names for better timeline display
        const categoryDetails = [];
        
        // Get category names directly from the database
        for (const cat of categories) {
          try {
            console.log(`[DEBUG] Processing category for timeline: category_id=${cat.category_id}, option_id=${cat.category_option_id}`);
            
            // Use direct Supabase client for better reliability
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            console.log(`[DEBUG] Supabase environment check - URL: ${!!supabaseUrl}, Service Key: ${!!supabaseServiceKey}`);
            
            if (!supabaseUrl || !supabaseServiceKey) {
              console.warn(`[DEBUG] Supabase environment variables not available for category resolution`);
              categoryDetails.push({
                categoryName: cat.category_id,
                optionName: cat.category_option_id,
                displayText: cat.category_option_id ? `${cat.category_id}: ${cat.category_option_id}` : cat.category_id
              });
              continue;
            }
            
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // Get category name
            console.log(`[DEBUG] Fetching category name from project_categories for ID: ${cat.category_id}`);
            const { data: categoryData, error: categoryError } = await supabase
              .from('project_categories')
              .select('name')
              .eq('id', cat.category_id)
              .single();
            
            if (categoryError) {
              console.warn(`[DEBUG] Error fetching category name for ${cat.category_id}:`, categoryError);
            } else {
              console.log(`[DEBUG] Category name fetched successfully: ${categoryData?.name || 'NOT_FOUND'}`);
            }
            
            const categoryName = categoryData?.name || cat.category_id;
            
            // Get option name if category_option_id is provided
            let optionName = null;
            if (cat.category_option_id) {
              console.log(`[DEBUG] Fetching option name from category_options for ID: ${cat.category_option_id}`);
              const { data: optionData, error: optionError } = await supabase
                .from('category_options')
                .select('option_name')
                .eq('id', cat.category_option_id)
                .single();
              
              if (optionError) {
                console.warn(`[DEBUG] Error fetching option name for ${cat.category_option_id}:`, optionError);
              } else {
                console.log(`[DEBUG] Option name fetched successfully: ${optionData?.option_name || 'NOT_FOUND'}`);
              }
              
              optionName = optionData?.option_name || cat.category_option_id;
            }
            
            const categoryDetail = {
              categoryName,
              optionName,
              displayText: optionName ? `${categoryName}: ${optionName}` : categoryName
            };
            
            console.log(`[DEBUG] Final category detail for timeline:`, {
              originalCategoryId: cat.category_id,
              resolvedCategoryName: categoryDetail.categoryName,
              originalOptionId: cat.category_option_id,
              resolvedOptionName: categoryDetail.optionName,
              displayText: categoryDetail.displayText
            });
            
            categoryDetails.push(categoryDetail);
          } catch (error) {
            console.warn(`[DEBUG] Error getting names for category ${cat.category_id}:`, error);
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
          'categories_updated',
          JSON.stringify({
            categories: categoryNames,
            count: categories.length,
            previous_count: currentCategories.length,
            category_details: categoryDetails
          }),
          userEmail || 'system'
        );
      } catch (timelineError) {
        console.warn('Failed to create timeline entry for category changes:', timelineError);
        // Don't fail the operation if timeline creation fails
      }
    } else {
      console.log('[DEBUG] No actual category changes detected, skipping timeline entry');
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
        'categories_removed',
        JSON.stringify({
          action: 'All categories removed from task'
        }),
        userEmail || 'system'
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

// Helper function to compare categories and determine if there are actual changes
function compareCategories(currentCategories: any[], newCategories: any[]): boolean {
  // If the number of categories is different, there's a change
  if (currentCategories.length !== newCategories.length) {
    return true;
  }

  // Create maps for easier comparison
  const currentMap = new Map();
  const newMap = new Map();

  // Build current categories map
  for (const cat of currentCategories) {
    const key = `${cat.category_id}-${cat.category_option_id || 'null'}`;
    currentMap.set(key, cat);
  }

  // Build new categories map and compare
  for (const cat of newCategories) {
    const key = `${cat.category_id}-${cat.category_option_id || 'null'}`;
    newMap.set(key, cat);

    // If this category doesn't exist in current, or has different option, there's a change
    if (!currentMap.has(key)) {
      return true;
    }

    const currentCat = currentMap.get(key);
    if (currentCat.category_option_id !== cat.category_option_id) {
      return true;
    }
  }

  // Check if any current categories are missing from new categories
  for (const [key] of currentMap) {
    if (!newMap.has(key)) {
      return true;
    }
  }

  // No changes detected
  return false;
}
