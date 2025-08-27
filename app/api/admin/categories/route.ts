import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

// Admin-only Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Admin Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  console.error('   Please configure these variables in your Vercel deployment.');
}

const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-key'
);

// POST - Create or update project categories
export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Admin database not configured',
          details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for admin operations.',
          code: 'ADMIN_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId, categories } = body;

    if (!projectId || !categories || !Array.isArray(categories)) {
      return NextResponse.json({ 
        error: 'Project ID and categories array are required' 
      }, { status: 400 });
    }

    console.log('Admin: Creating categories for project:', projectId);
    console.log('Admin: Categories to create:', categories);

    // Delete existing categories for this project
    const deleteResponse = await supabaseAdmin
      .from('project_categories')
      .delete()
      .eq('project_id', projectId);

    if (deleteResponse.error) {
      console.error('Admin: Error deleting existing categories:', deleteResponse.error);
      return NextResponse.json({ 
        error: 'Failed to delete existing categories',
        details: deleteResponse.error.message
      }, { status: 500 });
    }

    console.log('Admin: Deleted existing categories');

    // Create new categories
    const categoriesToInsert = categories.map((cat: any) => ({
      project_id: projectId,
      name: cat.name.trim(),
      description: cat.description || '',
      color: '#3B82F6', // Default blue color
      sort_order: 0,
      is_active: true
    }));

    const insertResponse = await supabaseAdmin
      .from('project_categories')
      .insert(categoriesToInsert)
      .select();

    if (insertResponse.error) {
      console.error('Admin: Error creating categories:', insertResponse.error);
      return NextResponse.json({ 
        error: 'Failed to create categories',
        details: insertResponse.error.message
      }, { status: 500 });
    }

    console.log('Admin: Created categories:', insertResponse.data);

    // Create category options for each category
    const createdCategories = insertResponse.data || [];
    for (let i = 0; i < createdCategories.length; i++) {
      const category = createdCategories[i];
      const categoryData = categories[i];
      
      if (categoryData.options && Array.isArray(categoryData.options)) {
        const optionsToInsert = categoryData.options.map((option: string, optionIndex: number) => ({
          category_id: category.id,
          option_name: option.trim(),
          option_value: option.trim(),
          sort_order: optionIndex
        }));

        const optionsResponse = await supabaseAdmin
          .from('category_options')
          .insert(optionsToInsert);

        if (optionsResponse.error) {
          console.error('Admin: Error creating options for category:', category.id, optionsResponse.error);
          // Continue with other categories even if one fails
        } else {
          console.log('Admin: Created options for category:', category.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Categories created successfully',
      data: createdCategories
    });

  } catch (error) {
    console.error('Admin: Error in categories API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get project categories
export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Admin database not configured',
          details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for admin operations.',
          code: 'ADMIN_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get categories with their options
    const categoriesResponse = await supabaseAdmin
      .from('project_categories')
      .select(`
        *,
        category_options (*)
      `)
      .eq('project_id', projectId)
      .order('created_at');

    if (categoriesResponse.error) {
      console.error('Admin: Error fetching categories:', categoriesResponse.error);
      return NextResponse.json({ 
        error: 'Failed to fetch categories',
        details: categoriesResponse.error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: categoriesResponse.data || []
    });

  } catch (error) {
    console.error('Admin: Error in categories GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
