const fetch = require('node-fetch');

async function debugUserLookup() {
  try {
    console.log('🔍 Debugging user lookup step by step...');
    
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    // Step 1: Test if the user exists
    console.log('\n📋 Step 1: Testing user existence...');
    const userUrl = `https://alignzo-lite.vercel.app/api/debug/test-connection?userEmail=${encodeURIComponent(userEmail)}`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();
    console.log(`✅ User test response:`, JSON.stringify(userData, null, 2));
    
    // Step 2: Test project categories directly
    console.log('\n📋 Step 2: Testing project categories directly...');
    const categoriesUrl = `https://alignzo-lite.vercel.app/api/kanban/project-categories?projectId=${projectId}`;
    const categoriesResponse = await fetch(categoriesUrl);
    const categoriesData = await categoriesResponse.json();
    console.log(`✅ Categories response:`, JSON.stringify(categoriesData, null, 2));
    
    // Step 3: Test project options directly
    console.log('\n📋 Step 3: Testing project options directly...');
    const optionsUrl = `https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`;
    const optionsResponse = await fetch(optionsUrl);
    const optionsData = await optionsResponse.json();
    console.log(`✅ Options response:`, JSON.stringify(optionsData, null, 2));
    
    // Step 4: Test the main API again
    console.log('\n📋 Step 4: Testing main API...');
    const mainUrl = `https://alignzo-lite.vercel.app/api/kanban/user-projects-with-cache?userEmail=${encodeURIComponent(userEmail)}`;
    const mainResponse = await fetch(mainUrl);
    const mainData = await mainResponse.json();
    console.log(`✅ Main API response:`, JSON.stringify(mainData, null, 2));
    
    // Step 5: Test with a different approach - direct project lookup
    console.log('\n📋 Step 5: Testing direct project lookup...');
    const directUrl = `https://alignzo-lite.vercel.app/api/test-db`;
    const directResponse = await fetch(directUrl);
    const directData = await directResponse.json();
    console.log(`✅ Direct DB test response:`, JSON.stringify(directData, null, 2));
    
  } catch (error) {
    console.error('❌ Error in debug:', error);
  }
}

debugUserLookup();
