const fetch = require('node-fetch');

async function linkCategories() {
  try {
    console.log('🔗 Linking categories to project via API...');
    
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    const linkUrl = `https://alignzo-lite.vercel.app/api/admin/link-categories?projectId=${projectId}`;
    console.log(`📡 Calling link API: ${linkUrl}`);
    
    const response = await fetch(linkUrl, { method: 'POST' });
    const data = await response.json();
    
    console.log(`✅ Response status: ${response.status}`);
    console.log(`📊 Response data:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Categories linked successfully!');
      
      // Wait a moment for the database to update
      console.log('⏳ Waiting for database to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test the main API again
      console.log('\n🔍 Testing main API after linking...');
      const testUrl = `https://alignzo-lite.vercel.app/api/kanban/user-projects-with-cache?userEmail=riyas.siddikk%406dtech.co.in`;
      
      const testResponse = await fetch(testUrl);
      const testData = await testResponse.json();
      
      console.log(`✅ Test response status: ${testResponse.status}`);
      console.log(`📊 Test response data:`, JSON.stringify(testData, null, 2));
      
      if (Array.isArray(testData) && testData.length > 0) {
        const project = testData[0];
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
          console.log('⚠️  Still no categories found for this project');
        }
      }
    } else {
      console.log('❌ Failed to link categories');
    }
    
  } catch (error) {
    console.error('❌ Error linking categories:', error);
  }
}

linkCategories();
