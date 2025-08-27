import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    console.log('Test DB: Testing with project ID:', projectId);

    // Test 1: Basic connection test
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .limit(1);

    if (testError) {
      console.error('Test DB: Connection test failed:', testError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: testError
      }, { status: 500 });
    }

    console.log('Test DB: Connection test passed, found project:', testData);

    // Test 2: Direct categories query
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (categoriesError) {
      console.error('Test DB: Categories query failed:', categoriesError);
      return NextResponse.json({ 
        error: 'Categories query failed',
        details: categoriesError
      }, { status: 500 });
    }

    console.log('Test DB: Found categories:', categories?.length || 0);

    // Test 3: Direct options query
    let options = [];
    if (categories && categories.length > 0) {
      const categoryIds = categories.map(cat => cat.id);
      const { data: optionsData, error: optionsError } = await supabase
        .from('category_options')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_active', true);

      if (optionsError) {
        console.error('Test DB: Options query failed:', optionsError);
      } else {
        options = optionsData || [];
        console.log('Test DB: Found options:', options.length);
      }
    }

    // Test 4: Manual join query
    const { data: joinData, error: joinError } = await supabase
      .from('project_categories')
      .select(`
        *,
        category_options(*)
      `)
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (joinError) {
      console.error('Test DB: Join query failed:', joinError);
    } else {
      console.log('Test DB: Join query result:', joinData?.length || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        project: testData?.[0] || null,
        categories: categories || [],
        options: options,
        joinResult: joinData || [],
        summary: {
          projectFound: testData?.length > 0,
          categoriesCount: categories?.length || 0,
          optionsCount: options.length,
          joinCount: joinData?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Test DB: Error in test endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
