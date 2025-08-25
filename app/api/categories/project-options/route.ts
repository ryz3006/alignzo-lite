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

    console.log('Fetching categories for project:', projectId);

    // Try to use RPC functions first, fallback to direct queries
    let categoriesData = [];
    let subcategoriesData = [];

    try {
      // Get categories with their options using the optimized RPC function
      const { data: categoriesRPC, error: categoriesError } = await supabase
        .rpc('get_project_categories_with_options', { project_uuid: projectId });

      if (categoriesError) {
        console.warn('RPC function failed, falling back to direct query:', categoriesError);
        throw new Error('RPC function not available');
      }

      // Parse the JSON result
      const parsedCategories = categoriesRPC ? JSON.parse(categoriesRPC) : [];
      categoriesData = parsedCategories || [];
      console.log('Categories fetched via RPC:', categoriesData.length);

    } catch (rpcError) {
      console.log('Using fallback method for categories');
      
      // Fallback: Get categories directly
      const { data: categories, error: categoriesError } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
      }

      // Get options for each category
      for (const category of categories || []) {
        try {
          const { data: options, error: optionsError } = await supabase
            .from('category_options')
            .select('*')
            .eq('category_id', category.id)
            .order('sort_order');

          if (!optionsError && options) {
            category.options = options;
          } else {
            // Fallback: parse options from description if category_options table doesn't exist
            if (category.description && category.description.includes('Category with options:')) {
              const optionsMatch = category.description.match(/Category with options: (.+)/);
              if (optionsMatch) {
                const optionsList = optionsMatch[1].split(', ').map((opt: string) => opt.trim());
                category.options = optionsList.map((option: string, index: number) => ({
                  id: `temp_${index}`,
                  category_id: category.id,
                  option_name: option,
                  option_value: option,
                  sort_order: index
                }));
              }
            } else {
              category.options = [];
            }
          }
        } catch (error) {
          console.warn('Error fetching options for category:', category.id, error);
          category.options = [];
        }
      }

      categoriesData = categories || [];
    }

    try {
      // Get subcategories with their options using the RPC function
      const { data: subcategoriesRPC, error: subcategoriesError } = await supabase
        .rpc('get_project_subcategory_options', { project_uuid: projectId });

      if (subcategoriesError) {
        console.warn('RPC function failed, falling back to direct query:', subcategoriesError);
        throw new Error('RPC function not available');
      }

      subcategoriesData = subcategoriesRPC || [];
      console.log('Subcategories fetched via RPC:', subcategoriesData.length);

    } catch (rpcError) {
      console.log('Using fallback method for subcategories');
      
      // Fallback: Get subcategories directly
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from('project_subcategories')
        .select(`
          *,
          project_categories!inner(*)
        `)
        .eq('project_categories.project_id', projectId)
        .order('created_at');

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        // Don't fail the entire request if subcategories fail
        subcategoriesData = [];
      } else {
        // Get options for each subcategory
        for (const subcategory of subcategories || []) {
          try {
            const { data: options, error: optionsError } = await supabase
              .from('subcategory_options')
              .select('*')
              .eq('subcategory_id', subcategory.id)
              .order('sort_order');

            if (!optionsError && options) {
              subcategory.options = options;
            } else {
              subcategory.options = [];
            }
          } catch (error) {
            console.warn('Error fetching options for subcategory:', subcategory.id, error);
            subcategory.options = [];
          }
        }

        subcategoriesData = subcategories || [];
      }
    }

    console.log('Returning data:', {
      categoriesCount: categoriesData.length,
      subcategoriesCount: subcategoriesData.length
    });

    return NextResponse.json({
      categories: categoriesData,
      subcategories: subcategoriesData
    });

  } catch (error) {
    console.error('Error in project options API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
