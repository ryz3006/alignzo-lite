import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('Debug: Fetching categories for project:', projectId);

    // Test 1: Direct query to project_categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order');

    if (categoriesError) {
      console.error('Debug: Error fetching categories:', categoriesError);
      return NextResponse.json({ 
        error: 'Failed to fetch categories',
        details: categoriesError
      }, { status: 500 });
    }

    console.log('Debug: Found categories:', categories?.length || 0);
    console.log('Debug: Categories data:', categories);

    // Test 2: Check if category_options table exists and has data
    let categoryOptions = [];
    try {
      const { data: options, error: optionsError } = await supabase
        .from('category_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!optionsError && options) {
        categoryOptions = options;
        console.log('Debug: Found category options:', categoryOptions.length);
        console.log('Debug: Category options data:', categoryOptions);
      } else {
        console.log('Debug: No category options found or table doesn\'t exist');
        console.log('Debug: Options error:', optionsError);
      }
    } catch (error) {
      console.log('Debug: category_options table might not exist:', error);
    }

    // Test 3: Try the RPC function
    let rpcResult = null;
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_project_categories_with_options', { project_uuid: projectId });

      if (rpcError) {
        console.log('Debug: RPC function failed:', rpcError);
        console.log('Debug: RPC error details:', JSON.stringify(rpcError, null, 2));
      } else {
        console.log('Debug: RPC raw result:', rpcData);
        rpcResult = rpcData ? JSON.parse(rpcData) : [];
        console.log('Debug: RPC function returned:', rpcResult.length, 'categories');
        console.log('Debug: RPC parsed result:', JSON.stringify(rpcResult, null, 2));
      }
    } catch (error) {
      console.log('Debug: RPC function error:', error);
      console.log('Debug: RPC error details:', JSON.stringify(error, null, 2));
    }

    // Test 4: Check if RPC function exists
    let functionExists = false;
    try {
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_project_categories_with_options', { project_uuid: '00000000-0000-0000-0000-000000000000' });
      
      // If we get here, the function exists (even if it returns empty for invalid UUID)
      functionExists = true;
      console.log('Debug: RPC function exists and is callable');
    } catch (error) {
      console.log('Debug: RPC function does not exist or is not callable:', error);
    }

    // Test 5: Manual join to get categories with options
    let manualJoinResult = [];
    try {
      const { data: joinData, error: joinError } = await supabase
        .from('project_categories')
        .select(`
          *,
          category_options(*)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order');

      if (!joinError && joinData) {
        manualJoinResult = joinData;
        console.log('Debug: Manual join returned:', manualJoinResult.length, 'categories');
      } else {
        console.log('Debug: Manual join failed:', joinError);
      }
    } catch (error) {
      console.log('Debug: Manual join error:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        projectCategories: categories || [],
        categoryOptions: categoryOptions,
        rpcResult: rpcResult,
        manualJoinResult: manualJoinResult,
        summary: {
          categoriesCount: categories?.length || 0,
          optionsCount: categoryOptions.length,
          rpcCategoriesCount: rpcResult?.length || 0,
          manualJoinCount: manualJoinResult.length
        }
      }
    });

  } catch (error) {
    console.error('Debug: Error in categories debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
