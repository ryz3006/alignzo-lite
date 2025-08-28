const fetch = require('node-fetch');

async function testCategoryFix() {
  try {
    console.log('🔍 Testing category fix for user-projects-with-cache API...');
    
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    const url = `https://alignzo-lite.vercel.app/api/kanban/user-projects-with-cache?userEmail=${encodeURIComponent(userEmail)}`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ Response status: ${response.status}`);
    console.log(`📊 Response data:`, JSON.stringify(data, null, 2));
    
    if (Array.isArray(data) && data.length > 0) {
      const project = data[0];
      console.log(`\n📋 Project: ${project.name}`);
      console.log(`🏷️  Categories count: ${project.categories?.length || 0}`);
      
      if (project.categories && project.categories.length > 0) {
        project.categories.forEach((category, index) => {
          console.log(`  📂 Category ${index + 1}: ${category.name}`);
          console.log(`    Options count: ${category.options?.length || 0}`);
          if (category.options && category.options.length > 0) {
            category.options.forEach((option, optIndex) => {
              console.log(`      • Option ${optIndex + 1}: ${option.option_value}`);
            });
          }
        });
      } else {
        console.log('⚠️  No categories found for this project');
      }
    } else {
      console.log('⚠️  No projects found for this user');
    }
    
  } catch (error) {
    console.error('❌ Error testing category fix:', error);
  }
}

testCategoryFix();
