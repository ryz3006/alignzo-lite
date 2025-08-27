import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// POST: Test task creation with categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userEmail, categories } = body;

    if (!projectId || !userEmail) {
      return NextResponse.json(
        { error: 'Project ID and User Email are required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing task creation with categories:', { projectId, userEmail, categories });

    // First, check if the project exists
    const { data: projectData, error: projectError } = await supabaseClient.get('projects', {
      select: 'id, name',
      filters: { id: projectId }
    });

    if (projectError || !projectData || projectData.length === 0) {
      console.error('❌ Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found', details: projectError },
        { status: 404 }
      );
    }

    console.log('✅ Project found:', projectData[0]);

    // Get a column for the project
    const { data: columnData, error: columnError } = await supabaseClient.get('kanban_columns', {
      select: 'id, name',
      filters: { project_id: projectId, is_active: true },
      order: { column: 'sort_order', ascending: true },
      limit: 1
    });

    if (columnError || !columnData || columnData.length === 0) {
      console.error('❌ No columns found for project:', columnError);
      return NextResponse.json(
        { error: 'No columns found for project', details: columnError },
        { status: 404 }
      );
    }

    console.log('✅ Column found:', columnData[0]);

    // Create a test task
    const testTaskData = {
      title: 'Test Task with Categories',
      description: 'This is a test task to verify category creation',
      project_id: projectId,
      column_id: columnData[0].id,
      priority: 'medium',
      scope: 'project',
      created_by: userEmail,
      status: 'active'
    };

    console.log('📝 Creating test task with data:', testTaskData);

    const { data: taskData, error: taskError } = await supabaseClient.insert('kanban_tasks', testTaskData);

    if (taskError) {
      console.error('❌ Failed to create task:', taskError);
      return NextResponse.json(
        { error: 'Failed to create task', details: taskError },
        { status: 500 }
      );
    }

    console.log('✅ Task created successfully:', taskData);

    const createdTask = taskData[0];
    console.log('📝 Created task ID:', createdTask.id);

    // Now test category creation if categories are provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log('📝 Testing category creation with:', categories);

      try {
        const categoriesJson = JSON.stringify(categories);
        console.log('📝 Categories JSON:', categoriesJson);

        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('update_task_categories', {
          p_task_id: createdTask.id,
          p_categories: categoriesJson,
          p_user_email: userEmail
        });

        console.log('📝 RPC response:', { rpcData, rpcError });

        if (rpcError) {
          console.error('❌ Failed to save categories:', rpcError);
          return NextResponse.json({
            success: false,
            taskCreated: true,
            taskId: createdTask.id,
            categoryError: rpcError
          });
        }

        console.log('✅ Categories saved successfully');

        // Verify the categories were actually saved
        const { data: verifyData, error: verifyError } = await supabaseClient.get('task_category_mappings', {
          select: '*',
          filters: { task_id: createdTask.id }
        });

        console.log('🔍 Verification - Categories in DB:', { verifyData, verifyError, count: verifyData?.length || 0 });

        return NextResponse.json({
          success: true,
          taskCreated: true,
          taskId: createdTask.id,
          categoriesSaved: true,
          categoriesCount: verifyData?.length || 0,
          categories: verifyData
        });

      } catch (error) {
        console.error('❌ Error saving categories:', error);
        return NextResponse.json({
          success: false,
          taskCreated: true,
          taskId: createdTask.id,
          categoryError: error
        });
      }
    } else {
      console.log('⚠️ No categories provided for testing');
      return NextResponse.json({
        success: true,
        taskCreated: true,
        taskId: createdTask.id,
        categoriesSaved: false,
        message: 'No categories provided for testing'
      });
    }

  } catch (error) {
    console.error('❌ Error in test task creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// GET: Get test results
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

    console.log('🧪 Getting test results for task:', taskId);

    // Get the task
    const { data: taskData, error: taskError } = await supabaseClient.get('kanban_tasks', {
      select: '*',
      filters: { id: taskId }
    });

    if (taskError || !taskData || taskData.length === 0) {
      console.error('❌ Task not found:', taskError);
      return NextResponse.json(
        { error: 'Task not found', details: taskError },
        { status: 404 }
      );
    }

    // Get the categories
    const { data: categoriesData, error: categoriesError } = await supabaseClient.get('task_category_mappings', {
      select: '*',
      filters: { task_id: taskId }
    });

    if (categoriesError) {
      console.error('❌ Failed to get categories:', categoriesError);
    }

    console.log('✅ Test results retrieved:', { taskData: taskData[0], categoriesData });

    return NextResponse.json({
      success: true,
      task: taskData[0],
      categories: categoriesData || [],
      categoriesCount: categoriesData?.length || 0
    });

  } catch (error) {
    console.error('❌ Error getting test results:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
