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

    // Use direct database queries (more reliable than RPC functions)
    let categoriesData = [];
    let subcategoriesData = [];

    // Add detailed logging for debugging
    console.log('🔍 Starting category fetch process...');

    // Test if the API-specific RPC function exists
    console.log('🔍 Testing API RPC function availability...');
    try {
      const { data: rpcTest, error: rpcError } = await supabase
        .rpc('get_project_categories_with_options_api', { project_uuid: projectId });
      
      if (rpcError) {
        console.log('⚠️ API RPC function not available, trying direct function...');
        // Try the direct function as fallback
        const { data: directTest, error: directError } = await supabase
          .rpc('get_project_categories_direct', { project_uuid: projectId });
        
        if (directError) {
          console.log('⚠️ Direct function also failed:', directError.message);
        } else {
          console.log('✅ Direct function available, result:', directTest ? 'has data' : 'empty');
          // Use the direct function result
          if (directTest && Array.isArray(directTest) && directTest.length > 0) {
            console.log('✅ Using direct function result with', directTest.length, 'categories');
            return NextResponse.json({
              categories: directTest,
              subcategories: []
            });
          }
        }
      } else {
        console.log('✅ API RPC function available, result:', rpcTest ? 'has data' : 'empty');
        // Use the API function result
        if (rpcTest && Array.isArray(rpcTest) && rpcTest.length > 0) {
          console.log('✅ Using API function result with', rpcTest.length, 'categories');
          return NextResponse.json({
            categories: rpcTest,
            subcategories: []
          });
        }
      }
    } catch (rpcTestError) {
      const errorMessage = rpcTestError instanceof Error ? rpcTestError.message : String(rpcTestError);
      console.log('⚠️ RPC function test failed:', errorMessage);
    }

    try {
      // Get categories directly
      console.log('🔍 Querying project_categories table...');
      const { data: categories, error: categoriesError } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
      }

      console.log('✅ Found categories:', categories?.length || 0);
      if (categories && categories.length > 0) {
        console.log('   Category details:', categories.map(c => ({ id: c.id, name: c.name, is_active: c.is_active })));
      }

      // Get options for each category
      if (categories && categories.length > 0) {
        const categoryIds = categories.map(cat => cat.id);
        
        console.log('🔍 Querying category_options table for category IDs:', categoryIds);
        const { data: options, error: optionsError } = await supabase
          .from('category_options')
          .select('*')
          .in('category_id', categoryIds)
          .eq('is_active', true)
          .order('sort_order');

        if (optionsError) {
          console.error('❌ Error fetching category options:', optionsError);
        } else {
          console.log('✅ Found category options:', options?.length || 0);
          if (options && options.length > 0) {
            console.log('   Option details:', options.map(o => ({ id: o.id, option_name: o.option_name, category_id: o.category_id })));
          }
          
          // Attach options to categories
          categoriesData = categories.map(category => ({
            ...category,
            options: options?.filter(option => option.category_id === category.id) || []
          }));
        }
      } else {
        categoriesData = categories || [];
      }
    } catch (error) {
      console.error('Error in categories query:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Get subcategories (if they exist)
    try {
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
        subcategoriesData = [];
      } else {
        // Get options for each subcategory
        if (subcategories && subcategories.length > 0) {
          const subcategoryIds = subcategories.map(sub => sub.id);
          
          const { data: subOptions, error: subOptionsError } = await supabase
            .from('subcategory_options')
            .select('*')
            .in('subcategory_id', subcategoryIds)
            .order('sort_order');

          if (!subOptionsError && subOptions) {
            subcategoriesData = subcategories.map(subcategory => ({
              ...subcategory,
              options: subOptions.filter(option => option.subcategory_id === subcategory.id)
            }));
          } else {
            subcategoriesData = subcategories || [];
          }
        } else {
          subcategoriesData = subcategories || [];
        }
      }
    } catch (error) {
      console.error('Error in subcategories query:', error);
      subcategoriesData = [];
    }

    console.log('📊 Final data summary:', {
      categoriesCount: categoriesData.length,
      subcategoriesCount: subcategoriesData.length,
      categoriesWithOptions: categoriesData.filter(cat => cat.options && cat.options.length > 0).length
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
