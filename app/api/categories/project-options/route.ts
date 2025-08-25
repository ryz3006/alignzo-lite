import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  console.error('   Please configure these variables in your Vercel deployment.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please configure them in your Vercel deployment.',
          code: 'SUPABASE_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get categories with their options using the RPC function
    const { data: categoriesData, error: categoriesError } = await supabase
      .rpc('get_project_category_options', { project_uuid: projectId });

    if (categoriesError) {
      console.error('Error fetching categories with options:', categoriesError);
      return NextResponse.json({ error: 'Failed to fetch categories with options' }, { status: 500 });
    }

    // Get subcategories with their options using the RPC function
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .rpc('get_project_subcategory_options', { project_uuid: projectId });

    if (subcategoriesError) {
      console.error('Error fetching subcategories with options:', subcategoriesError);
      return NextResponse.json({ error: 'Failed to fetch subcategories with options' }, { status: 500 });
    }

    return NextResponse.json({
      categories: categoriesData || [],
      subcategories: subcategoriesData || []
    });

  } catch (error) {
    console.error('Error in project options API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
