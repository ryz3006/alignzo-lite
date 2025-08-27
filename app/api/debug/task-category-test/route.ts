import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// POST: Test task category creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, categoryId, optionId } = body;

    if (!taskId || !categoryId) {
      return NextResponse.json(
        { error: 'Task ID and Category ID are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing task category creation:', { taskId, categoryId, optionId });

    // First, check if the task exists
    const { data: taskData, error: taskError } = await supabaseClient.get('kanban_tasks', {
      select: 'id, title, project_id',
      filters: { id: taskId }
    });

    if (taskError || !taskData || taskData.length === 0) {
      console.error('❌ Task not found:', taskError);
      return NextResponse.json(
        { error: 'Task not found', details: taskError || 'Task not found' },
        { status: 404 }
      );
    }

    console.log('✅ Task found:', taskData[0]);

    // Test the update_task_categories function
    const testCategories = [
      {
        category_id: categoryId,
        category_option_id: optionId || null,
        is_primary: false,
        sort_order: 0
      }
    ];

    console.log('📝 Testing with categories:', JSON.stringify(testCategories, null, 2));

    const { data, error } = await supabaseClient.rpc('update_task_categories', {
      p_task_id: taskId,
      p_categories: JSON.stringify(testCategories),
      p_user_email: 'debug@test.com'
    });

    console.log('📝 RPC result:', { data, error });

    if (error) {
      console.error('❌ RPC failed:', error);
      return NextResponse.json(
        { error: 'Failed to create task categories', details: error },
        { status: 500 }
      );
    }

    // Check if the mappings were created
    const { data: mappingsData, error: mappingsError } = await supabaseClient.get('task_category_mappings', {
      select: '*',
      filters: { task_id: taskId }
    });

    console.log('📊 Mappings check:', { mappingsData, mappingsError });

    return NextResponse.json({
      success: true,
      message: 'Task category creation test completed',
      rpcResult: data,
      mappingsCreated: mappingsData || [],
      mappingsCount: mappingsData?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in task category test:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
