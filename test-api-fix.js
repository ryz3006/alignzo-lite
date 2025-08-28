// Test script to verify the categories API fix
const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

async function testCategoriesAPI() {
  console.log('🧪 Testing categories API fix...');
  console.log('=====================================');
  
  try {
    // Test the categories-with-cache API
    console.log('\n1. Testing /api/kanban/categories-with-cache...');
    const response = await fetch(`https://alignzo-lite.vercel.app/api/kanban/categories-with-cache?projectId=${projectId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log(`📊 Found ${data.data.length} categories`);
        
        data.data.forEach((category, index) => {
          console.log(`   ${index + 1}. ${category.name} (${category.id})`);
          if (category.options && category.options.length > 0) {
            console.log(`      Options: ${category.options.length}`);
            category.options.forEach(option => {
              console.log(`        - ${option.option_name}: ${option.option_value}`);
            });
          } else {
            console.log(`      Options: None`);
          }
        });
      } else {
        console.log('⚠️ No categories found in response');
      }
    } else {
      console.error('❌ API request failed:', response.status, response.statusText);
    }
    
    // Also test the project-options API for comparison
    console.log('\n2. Testing /api/categories/project-options for comparison...');
    const projectOptionsResponse = await fetch(`https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`);
    
    if (projectOptionsResponse.ok) {
      const projectOptionsData = await projectOptionsResponse.json();
      console.log('✅ Project Options API Response:', JSON.stringify(projectOptionsData, null, 2));
      
      if (projectOptionsData.categories) {
        console.log(`📊 Found ${projectOptionsData.categories.length} categories in project-options API`);
      }
    } else {
      console.error('❌ Project Options API request failed:', projectOptionsResponse.status, projectOptionsResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCategoriesAPI().then(() => {
  console.log('\n🧪 Test complete');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
