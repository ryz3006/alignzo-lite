import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // First, let's get all projects to see what we're working with
    const projectsResponse = await supabaseClient.get('projects', {
      select: 'id, name, product, country',
      order: { column: 'name', ascending: true }
    });

    if (projectsResponse.error) {
      throw new Error(projectsResponse.error);
    }

    // Get ALL categories without any filters to see what's in the table
    const allCategoriesResponse = await supabaseClient.get('project_categories', {
      select: '*',
      order: { column: 'sort_order', ascending: true }
    });

    if (allCategoriesResponse.error) {
      throw new Error(allCategoriesResponse.error);
    }

    // Get categories for specific project if provided
    let projectCategoriesResponse: any = { data: [], error: null };
    if (projectId) {
      projectCategoriesResponse = await supabaseClient.get('project_categories', {
        select: '*',
        filters: { project_id: projectId },
        order: { column: 'sort_order', ascending: true }
      });
    }

    if (projectCategoriesResponse.error) {
      throw new Error(projectCategoriesResponse.error);
    }

    // Get ALL subcategories to see what's in the table
    const allSubcategoriesResponse = await supabaseClient.get('project_subcategories', {
      select: '*',
      order: { column: 'sort_order', ascending: true }
    });

    if (allSubcategoriesResponse.error) {
      throw new Error(allSubcategoriesResponse.error);
    }

    // Get subcategories for the project's categories
    const categoryIds = projectCategoriesResponse.data?.map((cat: any) => cat.id) || [];
    
    let projectSubcategoriesResponse: any = { data: [], error: null };
    if (categoryIds.length > 0) {
      projectSubcategoriesResponse = await supabaseClient.get('project_subcategories', {
        select: '*',
        filters: { category_id: categoryIds },
        order: { column: 'sort_order', ascending: true }
      });
    }

    if (projectSubcategoriesResponse.error) {
      throw new Error(projectSubcategoriesResponse.error);
    }

    // Let's also check if there are any category_options
    const categoryOptionsResponse = await supabaseClient.get('category_options', {
      select: '*',
      order: { column: 'sort_order', ascending: true }
    });

    if (categoryOptionsResponse.error) {
      // If this table doesn't exist, that's okay
      console.log('category_options table might not exist:', categoryOptionsResponse.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsResponse.data || [],
        allCategories: allCategoriesResponse.data || [],
        projectCategories: projectCategoriesResponse.data || [],
        allSubcategories: allSubcategoriesResponse.data || [],
        projectSubcategories: projectSubcategoriesResponse.data || [],
        categoryOptions: categoryOptionsResponse.data || [],
        totalCategories: allCategoriesResponse.data?.length || 0,
        totalSubcategories: allSubcategoriesResponse.data?.length || 0,
        projectTotalCategories: projectCategoriesResponse.data?.length || 0,
        projectTotalSubcategories: projectSubcategoriesResponse.data?.length || 0,
        debug: {
          requestedProjectId: projectId,
          foundCategoryIds: categoryIds,
          allCategoryIds: allCategoriesResponse.data?.map((cat: any) => ({ id: cat.id, project_id: cat.project_id, name: cat.name })) || [],
          allSubcategoryIds: allSubcategoriesResponse.data?.map((sub: any) => ({ id: sub.id, category_id: sub.category_id, name: sub.name })) || []
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
