import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let categoriesQuery = supabaseClient.get('project_categories', {
      select: '*',
      order: { column: 'sort_order', ascending: true }
    });

    if (projectId) {
      categoriesQuery = supabaseClient.get('project_categories', {
        select: '*',
        filters: { project_id: projectId },
        order: { column: 'sort_order', ascending: true }
      });
    }

    const categoriesResponse = await categoriesQuery;

    if (categoriesResponse.error) {
      throw new Error(categoriesResponse.error);
    }

    // Get subcategories for all categories
    const categoryIds = categoriesResponse.data?.map((cat: any) => cat.id) || [];
    
    let subcategoriesResponse = { data: [] };
    if (categoryIds.length > 0) {
      subcategoriesResponse = await supabaseClient.get('project_subcategories', {
        select: '*',
        filters: { category_id: categoryIds },
        order: { column: 'sort_order', ascending: true }
      });
    }

    if (subcategoriesResponse.error) {
      throw new Error(subcategoriesResponse.error);
    }

    // Get projects for reference
    const projectsResponse = await supabaseClient.get('projects', {
      select: 'id, name, product, country',
      order: { column: 'name', ascending: true }
    });

    if (projectsResponse.error) {
      throw new Error(projectsResponse.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsResponse.data || [],
        categories: categoriesResponse.data || [],
        subcategories: subcategoriesResponse.data || [],
        totalCategories: categoriesResponse.data?.length || 0,
        totalSubcategories: subcategoriesResponse.data?.length || 0
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
