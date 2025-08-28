require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies and table structure...');
    
    // Check if we can read the project_categories table
    console.log('\n📋 Step 1: Testing read access to project_categories...');
    const { data: readTest, error: readError } = await supabase
      .from('project_categories')
      .select('*')
      .limit(1);
    
    if (readError) {
      console.error('❌ Read error:', readError);
    } else {
      console.log('✅ Read access works, found:', readTest?.length || 0, 'records');
    }
    
    // Check if we can read the categories table (without project_id)
    console.log('\n📋 Step 2: Testing read access to categories table...');
    const { data: categoriesTest, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    if (categoriesError) {
      console.error('❌ Categories read error:', categoriesError);
    } else {
      console.log('✅ Categories read access works, found:', categoriesTest?.length || 0, 'records');
      if (categoriesTest && categoriesTest.length > 0) {
        console.log('Sample categories:');
        categoriesTest.forEach(cat => {
          console.log(`  - ${cat.name} (${cat.id})`);
        });
      }
    }
    
    // Check if we can read the category_options table
    console.log('\n📋 Step 3: Testing read access to category_options...');
    const { data: optionsTest, error: optionsError } = await supabase
      .from('category_options')
      .select('*')
      .limit(5);
    
    if (optionsError) {
      console.error('❌ Options read error:', optionsError);
    } else {
      console.log('✅ Options read access works, found:', optionsTest?.length || 0, 'records');
    }
    
    // Try to understand the table structure by checking what columns exist
    console.log('\n📋 Step 4: Checking table structure...');
    const { data: structureTest, error: structureError } = await supabase
      .from('project_categories')
      .select('id, name, project_id, is_active, created_at, updated_at')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Structure test error:', structureError);
    } else {
      console.log('✅ Table structure test passed');
    }
    
    // Check if there's a way to get categories without inserting into project_categories
    console.log('\n📋 Step 5: Testing alternative approach - using categories table...');
    const { data: allCategories, error: allCategoriesError } = await supabase
      .from('categories')
      .select(`
        *,
        category_options(*)
      `)
      .eq('is_active', true);
    
    if (allCategoriesError) {
      console.error('❌ All categories error:', allCategoriesError);
    } else {
      console.log(`✅ Found ${allCategories?.length || 0} categories with options`);
      if (allCategories && allCategories.length > 0) {
        allCategories.forEach(cat => {
          console.log(`  - ${cat.name} (${cat.id}) with ${cat.category_options?.length || 0} options`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error);
  }
}

checkRLSPolicies();
