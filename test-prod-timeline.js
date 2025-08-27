const fetch = require('node-fetch');

async function testProductionTimelineAPI() {
  try {
    console.log('Testing Production Timeline API with category resolution...');
    
    // Test with the same task ID from the user's example
    const taskId = '2f1f6179-12e0-4472-9cd4-46eaadaba344';
    const url = `https://alignzo-lite.vercel.app/api/kanban/task-timeline?taskId=${taskId}`;
    
    console.log(`Fetching timeline for task: ${taskId}`);
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response time: ${endTime - startTime}ms`);
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ Production Timeline API Response:');
      console.log(`Total entries: ${data.data?.length || 0}`);
      
      // Check for categories_updated entries
      const categoryEntries = data.data.filter(entry => entry.action === 'categories_updated');
      
      console.log(`\n📋 Category Update Entries Found: ${categoryEntries.length}`);
      
      if (categoryEntries.length > 0) {
        categoryEntries.forEach((entry, index) => {
          console.log(`\nEntry ${index + 1}:`);
          console.log(`  Action: ${entry.action}`);
          console.log(`  User: ${entry.user_email}`);
          console.log(`  Created: ${entry.created_at}`);
          
          if (entry.details?.category_details) {
            console.log(`  Category Details (${entry.details.category_details.length}):`);
            entry.details.category_details.forEach((cat, catIndex) => {
              console.log(`    ${catIndex + 1}. Category: ${cat.categoryName}`);
              console.log(`       Option: ${cat.optionName || 'N/A'}`);
              console.log(`       Display: ${cat.displayText}`);
              
              // Check if names are resolved (not UUIDs)
              const isCategoryResolved = !cat.categoryName.includes('-') || cat.categoryName.length < 36;
              const isOptionResolved = !cat.optionName || !cat.optionName.includes('-') || cat.optionName.length < 36;
              
              console.log(`       Category Resolved: ${isCategoryResolved ? '✅' : '❌'}`);
              console.log(`       Option Resolved: ${isOptionResolved ? '✅' : '❌'}`);
            });
          } else {
            console.log(`  No category_details found in this entry`);
          }
        });
        
        // Summary
        const totalCategories = categoryEntries.reduce((sum, entry) => 
          sum + (entry.details?.category_details?.length || 0), 0);
        const resolvedCategories = categoryEntries.reduce((sum, entry) => 
          sum + (entry.details?.category_details?.filter(cat => 
            !cat.categoryName.includes('-') || cat.categoryName.length < 36
          ).length || 0), 0);
        
        console.log(`\n📊 Summary:`);
        console.log(`  Total category entries: ${categoryEntries.length}`);
        console.log(`  Total category details: ${totalCategories}`);
        console.log(`  Resolved categories: ${resolvedCategories}`);
        console.log(`  Resolution rate: ${totalCategories > 0 ? Math.round((resolvedCategories / totalCategories) * 100) : 0}%`);
        
      } else {
        console.log('\n⚠️  No category update entries found in timeline');
      }
    } else {
      console.log('\n❌ Production Timeline API Error:');
      console.log(data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testProductionTimelineAPI();
