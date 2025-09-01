import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: Test direct Supabase client calls
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

    // Use direct Supabase client (bypassing the custom wrapper)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables not configured' },
        { status: 500 }
      );
    }
    
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Direct function call
    console.log('Testing direct function call...');
    const { data: functionData, error: functionError } = await supabase.rpc('get_task_categories_with_options_json', {
      p_task_id: taskId
    });

    console.log('Function result:', { data: functionData, error: functionError });

    // Test 2: Direct table query
    console.log('Testing direct table query...');
    const { data: tableData, error: tableError } = await supabase
      .from('task_category_mappings')
      .select(`
        id,
        task_id,
        category_id,
        category_option_id,
        is_primary,
        sort_order,
        project_categories!inner(name, description, color),
        category_options(option_name, option_value)
      `)
      .eq('task_id', taskId)
      .order('sort_order');

    console.log('Table query result:', { data: tableData, error: tableError });

    // Test 3: Simple JSON function
    console.log('Testing simple JSON function...');
    const { data: simpleData, error: simpleError } = await supabase.rpc('get_task_categories_simple_json', {
      p_task_id: taskId
    });

    console.log('Simple function result:', { data: simpleData, error: simpleError });

    return NextResponse.json({
      success: true,
      results: {
        function_call: {
          data: functionData,
          error: functionError
        },
        table_query: {
          data: tableData,
          error: tableError
        },
        simple_function: {
          data: simpleData,
          error: simpleError
        }
      }
    });

  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
