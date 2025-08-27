const fetch = require('node-fetch');

async function checkDatabaseCategories() {
  try {
    console.log('🔍 Checking database categories...');
    
    const url = 'https://alignzo-lite.vercel.app/api/debug/categories';
    
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ Database Categories Check:');
      console.log(`Total categories in database: ${data.data.totalCategories}`);
      console.log(`Total options in database: ${data.data.totalOptions}`);
      
      console.log('\n📋 Timeline Category IDs:');
      data.data.timelineCategoryIds.forEach(id => {
        const found = data.data.foundCategories.find(cat => cat.id === id);
        if (found) {
          console.log(`  ✅ ${id} -> ${found.name} (Project: ${found.project_id})`);
        } else {
          console.log(`  ❌ ${id} -> NOT FOUND`);
        }
      });
      
      console.log('\n📋 Timeline Option IDs:');
      data.data.timelineOptionIds.forEach(id => {
        const found = data.data.foundOptions.find(opt => opt.id === id);
        if (found) {
          console.log(`  ✅ ${id} -> ${found.option_name} (Category: ${found.category_id})`);
        } else {
          console.log(`  ❌ ${id} -> NOT FOUND`);
        }
      });
      
      console.log('\n📊 Summary:');
      console.log(`Found categories: ${data.data.foundCategories.length}/${data.data.timelineCategoryIds.length}`);
      console.log(`Found options: ${data.data.foundOptions.length}/${data.data.timelineOptionIds.length}`);
      
      if (data.data.allCategories.length > 0) {
        console.log('\n📋 Sample Categories in Database:');
        data.data.allCategories.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.name} (ID: ${cat.id}) - Project: ${cat.project_id}`);
        });
      }
      
      if (data.data.allOptions.length > 0) {
        console.log('\n📋 Sample Options in Database:');
        data.data.allOptions.forEach((opt, index) => {
          console.log(`  ${index + 1}. ${opt.option_name} (ID: ${opt.id}) - Category: ${opt.category_id}`);
        });
      }
      
    } else {
      console.log('\n❌ Error checking database:', data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
checkDatabaseCategories();
