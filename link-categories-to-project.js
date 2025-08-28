require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function linkCategoriesToProject() {
  try {
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    console.log('🔗 Linking categories to project:', projectId);
    
    // First, let's check what categories exist
    console.log('\n📋 Step 1: Checking existing categories...');
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*');
    
    if (categoriesError) {
      console.error('❌ Error fetching existing categories:', categoriesError);
      return;
    }
    
    console.log(`✅ Found ${existingCategories?.length || 0} existing categories`);
    
    // Check if categories are already linked to the project
    console.log('\n📋 Step 2: Checking project categories...');
    const { data: projectCategories, error: projectCategoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId);
    
    if (projectCategoriesError) {
      console.error('❌ Error fetching project categories:', projectCategoriesError);
      return;
    }
    
    console.log(`✅ Found ${projectCategories?.length || 0} categories linked to project`);
    
    if (projectCategories && projectCategories.length > 0) {
      console.log('✅ Categories are already linked to the project!');
      return;
    }
    
    // Get the categories from the project-options API to see what should be linked
    console.log('\n📋 Step 3: Getting categories from project-options API...');
    const response = await fetch(`https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`);
    const apiData = await response.json();
    
    if (apiData.categories && apiData.categories.length > 0) {
      console.log(`✅ API shows ${apiData.categories.length} categories should be linked`);
      
      // Link each category to the project
      console.log('\n📋 Step 4: Linking categories to project...');
      for (const category of apiData.categories) {
        console.log(`🔗 Linking category: ${category.name} (${category.id})`);
        
        const { data: linkResult, error: linkError } = await supabase
          .from('project_categories')
          .insert({
            id: category.id,
            project_id: projectId,
            name: category.name,
            description: category.description || '',
            color: category.color || '#3B82F6',
            sort_order: category.sort_order || 0,
            is_active: true
          });
        
        if (linkError) {
          if (linkError.code === '23505') { // Unique constraint violation
            console.log(`⚠️ Category ${category.name} already exists, updating...`);
            
            const { data: updateResult, error: updateError } = await supabase
              .from('project_categories')
              .update({
                project_id: projectId,
                is_active: true
              })
              .eq('id', category.id);
            
            if (updateError) {
              console.error(`❌ Error updating category ${category.name}:`, updateError);
            } else {
              console.log(`✅ Updated category ${category.name}`);
            }
          } else {
            console.error(`❌ Error linking category ${category.name}:`, linkError);
          }
        } else {
          console.log(`✅ Linked category ${category.name}`);
        }
      }
      
      console.log('\n✅ Category linking completed!');
      
      // Verify the linking worked
      console.log('\n📋 Step 5: Verifying the linking...');
      const { data: verifyCategories, error: verifyError } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (verifyError) {
        console.error('❌ Error verifying categories:', verifyError);
      } else {
        console.log(`✅ Verification: ${verifyCategories?.length || 0} categories now linked to project`);
        verifyCategories?.forEach(cat => {
          console.log(`  - ${cat.name} (${cat.id})`);
        });
      }
      
    } else {
      console.log('⚠️ No categories found in API response');
    }
    
  } catch (error) {
    console.error('❌ Error linking categories:', error);
  }
}

linkCategoriesToProject();
