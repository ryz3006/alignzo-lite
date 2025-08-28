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

async function testRPCFunctions() {
  try {
    console.log('🔍 Testing RPC functions directly...');
    
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    // Test the first RPC function
    console.log('\n📋 Step 1: Testing get_project_categories_with_options_api...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_project_categories_with_options_api', { 
        project_uuid: projectId 
      });
    
    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
    } else {
      console.log(`✅ RPC function result: ${rpcData?.length || 0} categories`);
      if (rpcData && rpcData.length > 0) {
        rpcData.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.name} with ${cat.options?.length || 0} options`);
          if (cat.options && cat.options.length > 0) {
            cat.options.forEach((option, optIndex) => {
              console.log(`      • ${option.option_value}`);
            });
          }
        });
      }
    }
    
    // Test the second RPC function
    console.log('\n📋 Step 2: Testing get_project_categories_direct...');
    const { data: directData, error: directError } = await supabase
      .rpc('get_project_categories_direct', { 
        project_uuid: projectId 
      });
    
    if (directError) {
      console.error('❌ Direct RPC function error:', directError);
    } else {
      console.log(`✅ Direct RPC function result: ${directData?.length || 0} categories`);
      if (directData && directData.length > 0) {
        directData.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.name} with ${cat.options?.length || 0} options`);
        });
      }
    }
    
    // Test the getUserAccessibleProjects function locally
    console.log('\n📋 Step 3: Testing getUserAccessibleProjects function locally...');
    
    // Import the function
    const { getUserAccessibleProjects } = require('./lib/kanban-api');
    
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    const result = await getUserAccessibleProjects(userEmail);
    
    console.log(`✅ getUserAccessibleProjects result:`, result.success ? 'Success' : 'Failed');
    if (result.success && result.data) {
      console.log(`📊 Found ${result.data.length} projects`);
      result.data.forEach((project, index) => {
        console.log(`  Project ${index + 1}: ${project.name}`);
        console.log(`    Categories: ${project.categories?.length || 0}`);
        if (project.categories && project.categories.length > 0) {
          project.categories.forEach((cat, catIndex) => {
            console.log(`      Category ${catIndex + 1}: ${cat.name} with ${cat.options?.length || 0} options`);
          });
        }
      });
    } else {
      console.log('❌ Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing RPC functions:', error);
  }
}

testRPCFunctions();
