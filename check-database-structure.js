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

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure and available tables...');
    
    // Try to get information about all tables
    console.log('\n📋 Step 1: Checking all available tables...');
    
    // Test different table names that might exist
    const tableNames = [
      'project_categories',
      'category_options', 
      'categories',
      'projects',
      'team_members',
      'team_project_assignments',
      'users'
    ];
    
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${tableName}': ${error.message}`);
        } else {
          console.log(`✅ Table '${tableName}': accessible, ${data?.length || 0} records`);
        }
      } catch (err) {
        console.log(`❌ Table '${tableName}': ${err.message}`);
      }
    }
    
    // Check if we can access the project_categories table with different approaches
    console.log('\n📋 Step 2: Testing project_categories with different filters...');
    
    // Try without any filters
    const { data: allCategories, error: allError } = await supabase
      .from('project_categories')
      .select('*');
    
    console.log(`All project_categories: ${allCategories?.length || 0} records`);
    if (allError) console.log('Error:', allError.message);
    
    // Try with is_active filter
    const { data: activeCategories, error: activeError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('is_active', true);
    
    console.log(`Active project_categories: ${activeCategories?.length || 0} records`);
    if (activeError) console.log('Error:', activeError.message);
    
    // Try with specific project_id
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    const { data: projectCategories, error: projectError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId);
    
    console.log(`Project categories for ${projectId}: ${projectCategories?.length || 0} records`);
    if (projectError) console.log('Error:', projectError.message);
    
    // Check category_options table
    console.log('\n📋 Step 3: Testing category_options table...');
    const { data: allOptions, error: optionsError } = await supabase
      .from('category_options')
      .select('*');
    
    console.log(`All category_options: ${allOptions?.length || 0} records`);
    if (optionsError) console.log('Error:', optionsError.message);
    
    // Try to get options with is_active filter
    const { data: activeOptions, error: activeOptionsError } = await supabase
      .from('category_options')
      .select('*')
      .eq('is_active', true);
    
    console.log(`Active category_options: ${activeOptions?.length || 0} records`);
    if (activeOptionsError) console.log('Error:', activeOptionsError.message);
    
    // Check if there are any RPC functions available
    console.log('\n📋 Step 4: Testing RPC functions...');
    
    // Try the RPC function that the API uses
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_project_categories_with_options_api', { 
          project_uuid: projectId 
        });
      
      if (rpcError) {
        console.log(`RPC function error: ${rpcError.message}`);
      } else {
        console.log(`RPC function result: ${rpcData?.length || 0} categories`);
        if (rpcData && rpcData.length > 0) {
          rpcData.forEach((cat, index) => {
            console.log(`  ${index + 1}. ${cat.name} with ${cat.options?.length || 0} options`);
          });
        }
      }
    } catch (rpcErr) {
      console.log(`RPC function not available: ${rpcErr.message}`);
    }
    
    // Try the direct RPC function
    try {
      const { data: directRpcData, error: directRpcError } = await supabase
        .rpc('get_project_categories_direct', { 
          project_uuid: projectId 
        });
      
      if (directRpcError) {
        console.log(`Direct RPC function error: ${directRpcError.message}`);
      } else {
        console.log(`Direct RPC function result: ${directRpcData?.length || 0} categories`);
      }
    } catch (directRpcErr) {
      console.log(`Direct RPC function not available: ${directRpcErr.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
}

checkDatabaseStructure();
