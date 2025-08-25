import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_URL not configured'
      }, { status: 500 });
    }
    
    // Try to use service role key first (bypasses RLS), fall back to anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    if (!supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'No Supabase key configured (neither service role nor anon key)'
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // First, let's get all projects to see what we're working with
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, product, country')
      .order('name', { ascending: true });

    if (projectsError) {
      throw new Error(`Projects error: ${projectsError.message}`);
    }

    // Get ALL categories without any filters to see what's in the table
    const { data: allCategories, error: allCategoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (allCategoriesError) {
      throw new Error(`All categories error: ${allCategoriesError.message}`);
    }

    // Get categories for specific project if provided
    let projectCategories: any[] = [];
    if (projectId) {
      const { data: projectCategoriesData, error: projectCategoriesError } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (projectCategoriesError) {
        throw new Error(`Project categories error: ${projectCategoriesError.message}`);
      }
      projectCategories = projectCategoriesData || [];
    }

    // Get ALL subcategories to see what's in the table
    const { data: allSubcategories, error: allSubcategoriesError } = await supabase
      .from('project_subcategories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (allSubcategoriesError) {
      throw new Error(`All subcategories error: ${allSubcategoriesError.message}`);
    }

    // Get subcategories for the project's categories
    const categoryIds = projectCategories.map((cat: any) => cat.id);
    
    let projectSubcategories: any[] = [];
    if (categoryIds.length > 0) {
      const { data: projectSubcategoriesData, error: projectSubcategoriesError } = await supabase
        .from('project_subcategories')
        .select('*')
        .in('category_id', categoryIds)
        .order('sort_order', { ascending: true });

      if (projectSubcategoriesError) {
        throw new Error(`Project subcategories error: ${projectSubcategoriesError.message}`);
      }
      projectSubcategories = projectSubcategoriesData || [];
    }

    // Let's also check if there are any category_options
    let categoryOptions: any[] = [];
    try {
      const { data: categoryOptionsData, error: categoryOptionsError } = await supabase
        .from('category_options')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!categoryOptionsError) {
        categoryOptions = categoryOptionsData || [];
      }
    } catch (error) {
      console.log('category_options table might not exist or have access issues');
    }

    return NextResponse.json({
      success: true,
      connection: {
        url: supabaseUrl ? 'Configured' : 'Missing',
        serviceKey: supabaseServiceKey ? 'Available' : 'Missing',
        anonKey: supabaseAnonKey ? 'Available' : 'Missing',
        usedKey: supabaseServiceKey ? 'Service Role' : 'Anon'
      },
      data: {
        projects: projects || [],
        allCategories: allCategories || [],
        projectCategories: projectCategories || [],
        allSubcategories: allSubcategories || [],
        projectSubcategories: projectSubcategories || [],
        categoryOptions: categoryOptions || [],
        totalCategories: allCategories?.length || 0,
        totalSubcategories: allSubcategories?.length || 0,
        projectTotalCategories: projectCategories?.length || 0,
        projectTotalSubcategories: projectSubcategories?.length || 0,
        debug: {
          requestedProjectId: projectId,
          foundCategoryIds: categoryIds,
          allCategoryIds: allCategories?.map((cat: any) => ({ id: cat.id, project_id: cat.project_id, name: cat.name })) || [],
          allSubcategoryIds: allSubcategories?.map((sub: any) => ({ id: sub.id, category_id: sub.category_id, name: sub.name })) || []
        }
      }
    });
  } catch (error) {
    console.error('Error fetching debug data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch debug data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
