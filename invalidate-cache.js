const fetch = require('node-fetch');

async function invalidateCache() {
  try {
    console.log('🔄 Invalidating user cache...');
    
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    
    // Invalidate user projects cache
    const invalidateUrl = `https://alignzo-lite.vercel.app/api/kanban/invalidate-user-projects-cache?userEmail=${encodeURIComponent(userEmail)}`;
    console.log(`📡 Invalidating cache: ${invalidateUrl}`);
    
    const response = await fetch(invalidateUrl, { method: 'POST' });
    
    if (response.ok) {
      console.log('✅ Cache invalidated successfully');
    } else {
      console.log(`❌ Failed to invalidate cache: ${response.status}`);
    }
    
    // Wait a moment for cache to clear
    console.log('⏳ Waiting for cache to clear...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the API again
    console.log('\n🔍 Testing API after cache invalidation...');
    const testUrl = `https://alignzo-lite.vercel.app/api/kanban/user-projects-with-cache?userEmail=${encodeURIComponent(userEmail)}`;
    
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
    
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
  }
}

invalidateCache();
