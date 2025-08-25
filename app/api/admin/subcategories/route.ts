import { NextRequest, NextResponse } from 'next/server';
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

// POST - Create or update project subcategories
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
    const { projectId, subcategories } = body;

    if (!projectId || !subcategories || !Array.isArray(subcategories)) {
      return NextResponse.json({ 
        error: 'Project ID and subcategories array are required' 
      }, { status: 400 });
    }

    console.log('Admin: Creating subcategories for project:', projectId);
    console.log('Admin: Subcategories to create:', subcategories);

    // Get all categories for this project to validate category_id references
    const categoriesResponse = await supabaseAdmin
      .from('project_categories')
      .select('id')
      .eq('project_id', projectId);

    if (categoriesResponse.error) {
      console.error('Admin: Error fetching project categories:', categoriesResponse.error);
      return NextResponse.json({ 
        error: 'Failed to fetch project categories',
        details: categoriesResponse.error.message
      }, { status: 500 });
    }

    const validCategoryIds = (categoriesResponse.data || []).map(cat => cat.id);
    console.log('Admin: Valid category IDs for project:', validCategoryIds);

    // Delete existing subcategories for this project
    // We need to delete subcategories that belong to categories of this project
    const deleteResponse = await supabaseAdmin
      .from('project_subcategories')
      .delete()
      .in('category_id', validCategoryIds);

    if (deleteResponse.error) {
      console.error('Admin: Error deleting existing subcategories:', deleteResponse.error);
      return NextResponse.json({ 
        error: 'Failed to delete existing subcategories',
        details: deleteResponse.error.message
      }, { status: 500 });
    }

    console.log('Admin: Deleted existing subcategories');

    // Filter subcategories to only include those with valid category_id
    const validSubcategories = subcategories.filter(sub => 
      sub.name && sub.name.trim() !== '' && 
      sub.category_id && validCategoryIds.includes(sub.category_id)
    );

    if (validSubcategories.length === 0) {
      return NextResponse.json({ 
        error: 'No valid subcategories to create',
        details: 'All subcategories must have a valid name and category_id'
      }, { status: 400 });
    }

    // Create new subcategories
    const subcategoriesToInsert = validSubcategories.map((sub: any) => ({
      category_id: sub.category_id,
      name: sub.name.trim(),
      description: sub.description?.trim() || '',
      sort_order: 0,
      is_active: true
    }));

    const insertResponse = await supabaseAdmin
      .from('project_subcategories')
      .insert(subcategoriesToInsert)
      .select();

    if (insertResponse.error) {
      console.error('Admin: Error creating subcategories:', insertResponse.error);
      return NextResponse.json({ 
        error: 'Failed to create subcategories',
        details: insertResponse.error.message
      }, { status: 500 });
    }

    console.log('Admin: Created subcategories:', insertResponse.data);

    return NextResponse.json({
      success: true,
      message: 'Subcategories created successfully',
      data: insertResponse.data
    });

  } catch (error) {
    console.error('Admin: Error in subcategories API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get project subcategories
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

    // Get subcategories for this project by joining with project_categories
    const subcategoriesResponse = await supabaseAdmin
      .from('project_subcategories')
      .select(`
        *,
        project_categories!inner(*)
      `)
      .eq('project_categories.project_id', projectId)
      .order('created_at');

    if (subcategoriesResponse.error) {
      console.error('Admin: Error fetching subcategories:', subcategoriesResponse.error);
      return NextResponse.json({ 
        error: 'Failed to fetch subcategories',
        details: subcategoriesResponse.error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: subcategoriesResponse.data || []
    });

  } catch (error) {
    console.error('Admin: Error in subcategories GET API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
