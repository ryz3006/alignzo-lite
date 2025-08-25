import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase environment variables not configured',
        env: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        }
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test basic connection
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
    
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('id, name, project_id')
      .limit(5);
    
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('project_subcategories')
      .select('id, name, category_id')
      .limit(5);
    
    // Test RLS by checking if we can access the tables
    const { data: rlsTest, error: rlsError } = await supabase
      .from('project_categories')
      .select('count')
      .limit(1);
    
    return NextResponse.json({
      success: true,
      connection: {
        url: supabaseUrl ? 'Configured' : 'Missing',
        key: supabaseAnonKey ? 'Configured' : 'Missing'
      },
      tables: {
        projects: {
          success: !projectsError,
          count: projects?.length || 0,
          error: projectsError?.message,
          sample: projects?.slice(0, 2)
        },
        project_categories: {
          success: !categoriesError,
          count: categories?.length || 0,
          error: categoriesError?.message,
          sample: categories?.slice(0, 2)
        },
        project_subcategories: {
          success: !subcategoriesError,
          count: subcategories?.length || 0,
          error: subcategoriesError?.message,
          sample: subcategories?.slice(0, 2)
        }
      },
      rls: {
        test: !rlsError,
        error: rlsError?.message
      }
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
