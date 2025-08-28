const fetch = require('node-fetch');

async function testEnhancedTimerCategories() {
  try {
    console.log('🔍 Testing categories API for Enhanced Timer Modal...');
    
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    // Test the categories-with-cache API that the Enhanced Timer Modal uses
    console.log('\n📋 Step 1: Testing /api/kanban/categories-with-cache...');
    const categoriesUrl = `https://alignzo-lite.vercel.app/api/kanban/categories-with-cache?projectId=${projectId}`;
    console.log(`📡 Making request to: ${categoriesUrl}`);
    
    const categoriesResponse = await fetch(categoriesUrl);
    const categoriesData = await categoriesResponse.json();
    
    console.log(`✅ Categories API Response status: ${categoriesResponse.status}`);
    console.log(`📊 Categories API Response:`, JSON.stringify(categoriesData, null, 2));
    
    if (categoriesData.success && categoriesData.data) {
      console.log(`\n📋 Categories found: ${categoriesData.data.length}`);
      categoriesData.data.forEach((category, index) => {
        console.log(`  📂 Category ${index + 1}: ${category.name}`);
        console.log(`    Options count: ${category.options?.length || 0}`);
        if (category.options && category.options.length > 0) {
          category.options.forEach((option, optIndex) => {
            console.log(`      • Option ${optIndex + 1}: ${option.option_name}`);
          });
        }
      });
    } else {
      console.log('❌ Categories API failed or returned no data');
    }
    
    // Test the project-options API as a comparison
    console.log('\n📋 Step 2: Testing /api/categories/project-options for comparison...');
    const projectOptionsUrl = `https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`;
    console.log(`📡 Making request to: ${projectOptionsUrl}`);
    
    const projectOptionsResponse = await fetch(projectOptionsUrl);
    const projectOptionsData = await projectOptionsResponse.json();
    
    console.log(`✅ Project Options API Response status: ${projectOptionsResponse.status}`);
    console.log(`📊 Project Options API Response:`, JSON.stringify(projectOptionsData, null, 2));
    
    if (projectOptionsData.categories) {
      console.log(`\n📋 Project Options Categories found: ${projectOptionsData.categories.length}`);
      projectOptionsData.categories.forEach((category, index) => {
        console.log(`  📂 Category ${index + 1}: ${category.name}`);
        console.log(`    Options count: ${category.options?.length || 0}`);
        if (category.options && category.options.length > 0) {
          category.options.forEach((option, optIndex) => {
            console.log(`      • Option ${optIndex + 1}: ${option.option_name}`);
          });
        }
      });
    } else {
      console.log('❌ Project Options API failed or returned no data');
    }
    
  } catch (error) {
    console.error('❌ Error testing Enhanced Timer categories:', error);
  }
}

testEnhancedTimerCategories();
