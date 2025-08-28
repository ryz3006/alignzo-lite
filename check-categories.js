const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCategories() {
  try {
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    console.log('🔍 Checking categories for project:', projectId);
    
    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('❌ Project not found:', projectError.message);
      return;
    }
    
    console.log('✅ Project found:', project.name);
    
    // Check categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError.message);
      return;
    }
    
    console.log(`📂 Found ${categories?.length || 0} categories`);
    
    if (categories && categories.length > 0) {
      for (const category of categories) {
        console.log(`  - Category: ${category.name} (ID: ${category.id})`);
        
        // Check options for this category
        const { data: options, error: optionsError } = await supabase
          .from('category_options')
          .select('*')
          .eq('category_id', category.id)
          .eq('is_active', true);
        
        if (optionsError) {
          console.error(`    ❌ Error fetching options:`, optionsError.message);
        } else {
          console.log(`    📋 Options: ${options?.length || 0}`);
          if (options && options.length > 0) {
            options.forEach(option => {
              console.log(`      • ${option.option_name}: ${option.option_value}`);
            });
          }
        }
      }
    } else {
      console.log('⚠️  No categories found for this project');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCategories();
