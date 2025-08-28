const fetch = require('node-fetch');

async function testCategoriesAPI() {
  try {
    console.log('🔍 Testing categories API endpoints...');
    
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    // Test the project categories API
    const categoriesUrl = `https://alignzo-lite.vercel.app/api/kanban/project-categories?projectId=${projectId}`;
    console.log(`📡 Testing categories API: ${categoriesUrl}`);
    
    const categoriesResponse = await fetch(categoriesUrl);
    const categoriesData = await categoriesResponse.json();
    
    console.log(`✅ Categories API status: ${categoriesResponse.status}`);
    console.log(`📊 Categories data:`, JSON.stringify(categoriesData, null, 2));
    
    // Test the project options API
    const optionsUrl = `https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`;
    console.log(`\n📡 Testing project options API: ${optionsUrl}`);
    
    const optionsResponse = await fetch(optionsUrl);
    const optionsData = await optionsResponse.json();
    
    console.log(`✅ Project options API status: ${optionsResponse.status}`);
    console.log(`📊 Project options data:`, JSON.stringify(optionsData, null, 2));
    
    // Test the admin categories API
    const adminUrl = 'https://alignzo-lite.vercel.app/api/admin/categories';
    console.log(`\n📡 Testing admin categories API: ${adminUrl}`);
    
    const adminResponse = await fetch(adminUrl);
    const adminData = await adminResponse.json();
    
    console.log(`✅ Admin categories API status: ${adminResponse.status}`);
    console.log(`📊 Admin categories data:`, JSON.stringify(adminData, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing categories API:', error);
  }
}

testCategoriesAPI();
