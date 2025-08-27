import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// POST: Test task category creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, categoryId, optionId, testMode } = body;

    if (!taskId || !categoryId) {
      return NextResponse.json(
        { error: 'Task ID and Category ID are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing task category creation:', { taskId, categoryId, optionId, testMode });

    // First, check if the task exists
    const { data: taskData, error: taskError } = await supabaseClient.get('kanban_tasks', {
      select: 'id, title, project_id',
      filters: { id: taskId }
    });

    if (taskError || !taskData || taskData.length === 0) {
      console.error('❌ Task not found:', taskError);
      return NextResponse.json(
        { error: 'Task not found', details: taskError },
        { status: 404 }
      );
    }

    console.log('✅ Task found:', taskData[0]);

    // Test different modes
    if (testMode === 'direct_insert') {
      // Test direct insertion into task_category_mappings
      console.log('🧪 Testing direct insertion...');
      const { data: insertData, error: insertError } = await supabaseClient.insert('task_category_mappings', {
        task_id: taskId,
        category_id: categoryId,
        category_option_id: optionId || null,
        is_primary: false,
        sort_order: 0,
        created_by: 'test@example.com',
        updated_by: 'test@example.com'
      });

      if (insertError) {
        console.error('❌ Direct insertion failed:', insertError);
        return NextResponse.json(
          { error: 'Direct insertion failed', details: insertError },
          { status: 500 }
        );
      }

      console.log('✅ Direct insertion successful:', insertData);
      return NextResponse.json({ success: true, data: insertData });
    }

    if (testMode === 'rpc_test') {
      // Test the RPC function
      console.log('🧪 Testing RPC function...');
      const testCategories = JSON.stringify([
        {
          category_id: categoryId,
          category_option_id: optionId || null,
          is_primary: false,
          sort_order: 0
        }
      ]);

      console.log('📝 Test categories JSON:', testCategories);

      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('update_task_categories', {
        p_task_id: taskId,
        p_categories: testCategories,
        p_user_email: 'test@example.com'
      });

      if (rpcError) {
        console.error('❌ RPC function failed:', rpcError);
        return NextResponse.json(
          { error: 'RPC function failed', details: rpcError },
          { status: 500 }
        );
      }

      console.log('✅ RPC function successful:', rpcData);
      return NextResponse.json({ success: true, data: rpcData });
    }

    if (testMode === 'debug_info') {
      // Get debug information
      console.log('🧪 Getting debug information...');
      
      // Check task existence
      const { data: debugData, error: debugError } = await supabaseClient.rpc('debug_task_categories', {
        p_task_id: taskId
      });

      if (debugError) {
        console.error('❌ Debug function failed:', debugError);
        return NextResponse.json(
          { error: 'Debug function failed', details: debugError },
          { status: 500 }
        );
      }

      console.log('✅ Debug information:', debugData);
      return NextResponse.json({ success: true, data: debugData });
    }

    // Default: test both direct insertion and RPC
    console.log('🧪 Testing both methods...');

    // Test direct insertion first
    const { data: insertData, error: insertError } = await supabaseClient.insert('task_category_mappings', {
      task_id: taskId,
      category_id: categoryId,
      category_option_id: optionId || null,
      is_primary: false,
      sort_order: 0,
      created_by: 'test@example.com',
      updated_by: 'test@example.com'
    });

    if (insertError) {
      console.error('❌ Direct insertion failed:', insertError);
      return NextResponse.json(
        { error: 'Direct insertion failed', details: insertError },
        { status: 500 }
      );
    }

    console.log('✅ Direct insertion successful:', insertData);

    // Test RPC function
    const testCategories = JSON.stringify([
      {
        category_id: categoryId,
        category_option_id: optionId || null,
        is_primary: false,
        sort_order: 0
      }
    ]);

    const { data: rpcData, error: rpcError } = await supabaseClient.rpc('update_task_categories', {
      p_task_id: taskId,
      p_categories: testCategories,
      p_user_email: 'test@example.com'
    });

    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError);
      return NextResponse.json(
        { error: 'RPC function failed', details: rpcError },
        { status: 500 }
      );
    }

    console.log('✅ RPC function successful:', rpcData);

    return NextResponse.json({
      success: true,
      directInsert: insertData,
      rpcResult: rpcData
    });

  } catch (error) {
    console.error('❌ Error in task category test:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// GET: Get debug information for a task
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

    console.log('🧪 Getting debug info for task:', taskId);

    // Get debug information
    const { data: debugData, error: debugError } = await supabaseClient.rpc('debug_task_categories', {
      p_task_id: taskId
    });

    if (debugError) {
      console.error('❌ Debug function failed:', debugError);
      return NextResponse.json(
        { error: 'Debug function failed', details: debugError },
        { status: 500 }
      );
    }

    // Also get the actual mappings
    const { data: mappingsData, error: mappingsError } = await supabaseClient.get('task_category_mappings', {
      select: '*',
      filters: { task_id: taskId }
    });

    if (mappingsError) {
      console.error('❌ Failed to get mappings:', mappingsError);
    }

    console.log('✅ Debug information retrieved:', { debugData, mappingsData });

    return NextResponse.json({
      success: true,
      debugInfo: debugData,
      mappings: mappingsData || []
    });

  } catch (error) {
    console.error('❌ Error getting debug info:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
