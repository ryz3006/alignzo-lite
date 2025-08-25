import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get category options using the new function
    const { data: categoryOptions, error: categoryError } = await supabase
      .rpc('get_project_category_options', { project_uuid: projectId });

    if (categoryError) {
      console.error('Error fetching category options:', categoryError);
      return NextResponse.json({ error: 'Failed to fetch category options' }, { status: 500 });
    }

    // Get subcategory options using the new function
    const { data: subcategoryOptions, error: subcategoryError } = await supabase
      .rpc('get_project_subcategory_options', { project_uuid: projectId });

    if (subcategoryError) {
      console.error('Error fetching subcategory options:', subcategoryError);
      return NextResponse.json({ error: 'Failed to fetch subcategory options' }, { status: 500 });
    }

    // Group category options by category
    const categoriesWithOptions = categoryOptions.reduce((acc: any, row: any) => {
      if (!acc[row.category_id]) {
        acc[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          options: []
        };
      }
      
      if (row.option_id) {
        acc[row.category_id].options.push({
          id: row.option_id,
          name: row.option_name,
          value: row.option_value,
          sort_order: row.option_sort_order
        });
      }
      
      return acc;
    }, {});

    // Group subcategory options by subcategory
    const subcategoriesWithOptions = subcategoryOptions.reduce((acc: any, row: any) => {
      if (!acc[row.subcategory_id]) {
        acc[row.subcategory_id] = {
          id: row.subcategory_id,
          name: row.subcategory_name,
          description: row.subcategory_description,
          category_id: row.category_id,
          category_name: row.category_name,
          options: []
        };
      }
      
      if (row.option_id) {
        acc[row.subcategory_id].options.push({
          id: row.option_id,
          name: row.option_name,
          value: row.option_value,
          sort_order: row.option_sort_order
        });
      }
      
      return acc;
    }, {});

    return NextResponse.json({
      categories: Object.values(categoriesWithOptions),
      subcategories: Object.values(subcategoriesWithOptions)
    });

  } catch (error) {
    console.error('Error in project options API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
