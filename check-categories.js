const fetch = require('node-fetch');

async function checkCategoriesInDatabase() {
  try {
    console.log('🔍 Checking categories in database...');
    
    // Test the production API to see what categories exist
    const url = 'https://alignzo-lite.vercel.app/api/categories/project-options?projectId=your-project-id';
    
    console.log(`Fetching categories from: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.categories) {
      console.log('\n✅ Categories found in database:');
      data.categories.forEach((cat, index) => {
        console.log(`\n${index + 1}. Category: ${cat.name} (ID: ${cat.id})`);
        if (cat.options && cat.options.length > 0) {
          console.log(`   Options:`);
          cat.options.forEach((opt, optIndex) => {
            console.log(`     ${optIndex + 1}. ${opt.option_name} (ID: ${opt.id})`);
          });
        } else {
          console.log(`   No options found`);
        }
      });
    } else {
      console.log('\n❌ No categories found in database');
    }
    
    // Also check the specific category IDs from the timeline
    const timelineCategoryIds = [
      '1353a294-12fd-49b6-8676-cc273130ca37',
      'bcdd4397-4939-4591-b2c4-347ab45e9c1c', 
      'fe9d976a-f33b-4221-9ee8-6edd4205bad7',
      '3ed6517f-c532-492d-9d7c-e7badfe307d7'
    ];
    
    const timelineOptionIds = [
      'd3e90e79-05ee-42c5-adb3-e0e90c16adcd',
      'bf11fc52-bd59-4b07-94f9-3a3817042eec',
      '1a7a55c3-3eac-410e-9290-4d50e7095ddd',
      'e377b73b-d150-4e0b-9576-09e7cc3ea50a',
      '7a052cb5-716c-4b43-9488-c6c5fbf6e273'
    ];
    
    console.log('\n🔍 Timeline Category IDs to check:');
    timelineCategoryIds.forEach(id => {
      console.log(`  - ${id}`);
    });
    
    console.log('\n🔍 Timeline Option IDs to check:');
    timelineOptionIds.forEach(id => {
      console.log(`  - ${id}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error checking categories:', error.message);
  }
}

// Run the check
checkCategoriesInDatabase();
