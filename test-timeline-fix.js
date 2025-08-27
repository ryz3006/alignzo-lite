const fetch = require('node-fetch');

async function testTimelineAPI() {
  try {
    console.log('Testing Timeline API with category resolution...');
    
    // Test with the same task ID from the user's example
    const taskId = '2f1f6179-12e0-4472-9cd4-46eaadaba344';
    const url = `http://localhost:3000/api/kanban/task-timeline?taskId=${taskId}`;
    
    console.log(`Fetching timeline for task: ${taskId}`);
    console.log(`URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ Timeline API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Check for categories_updated entries
      const categoryEntries = data.data.filter(entry => entry.action === 'categories_updated');
      
      if (categoryEntries.length > 0) {
        console.log('\n📋 Category Update Entries Found:');
        categoryEntries.forEach((entry, index) => {
          console.log(`\nEntry ${index + 1}:`);
          console.log(`  Action: ${entry.action}`);
          console.log(`  User: ${entry.user_email}`);
          console.log(`  Created: ${entry.created_at}`);
          
          if (entry.details?.category_details) {
            console.log(`  Category Details:`);
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
          }
        });
      } else {
        console.log('\n⚠️  No category update entries found in timeline');
      }
    } else {
      console.log('\n❌ Timeline API Error:');
      console.log(data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testTimelineAPI();
