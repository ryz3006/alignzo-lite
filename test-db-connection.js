const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  console.log('\n=== Testing Database Connection ===');
  
  try {
    // Test 1: Check if we can connect to the database
    console.log('1. Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError);
      return;
    }
    console.log('✅ Connection successful');

    // Test 2: Check the specific project
    console.log('\n2. Checking specific project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', '992bb505-f93b-4a9e-88ba-f4aede14c9e0')
      .single();

    if (projectError) {
      console.error('❌ Project query failed:', projectError);
    } else {
      console.log('✅ Project found:', project?.name);
    }

    // Test 3: Check project categories
    console.log('\n3. Checking project categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', '992bb505-f93b-4a9e-88ba-f4aede14c9e0')
      .eq('is_active', true);

    if (categoriesError) {
      console.error('❌ Categories query failed:', categoriesError);
    } else {
      console.log('✅ Categories found:', categories?.length || 0);
      if (categories && categories.length > 0) {
        console.log('   Category names:', categories.map(c => c.name));
      }
    }

    // Test 4: Check category options
    console.log('\n4. Checking category options...');
    const { data: options, error: optionsError } = await supabase
      .from('category_options')
      .select('*')
      .eq('is_active', true);

    if (optionsError) {
      console.error('❌ Options query failed:', optionsError);
    } else {
      console.log('✅ Options found:', options?.length || 0);
      if (options && options.length > 0) {
        console.log('   Option names:', options.map(o => o.option_name));
      }
    }

    // Test 5: Check the join between categories and options
    console.log('\n5. Checking category-options join...');
    const { data: joinResult, error: joinError } = await supabase
      .from('project_categories')
      .select(`
        *,
        category_options(*)
      `)
      .eq('project_id', '992bb505-f93b-4a9e-88ba-f4aede14c9e0')
      .eq('is_active', true);

    if (joinError) {
      console.error('❌ Join query failed:', joinError);
    } else {
      console.log('✅ Join result found:', joinResult?.length || 0);
      if (joinResult && joinResult.length > 0) {
        joinResult.forEach(cat => {
          console.log(`   Category: ${cat.name}, Options: ${cat.category_options?.length || 0}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseConnection();
