// Simple test script to verify API endpoints
const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

async function testAPI() {
  console.log('Testing API endpoints...');
  
  try {
    // Test 1: Project options API
    console.log('\n1. Testing /api/categories/project-options...');
    const response1 = await fetch(`https://alignzo-lite.vercel.app/api/categories/project-options?projectId=${projectId}`);
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    // Test 2: Debug API
    console.log('\n2. Testing /api/debug/categories...');
    const response2 = await fetch(`https://alignzo-lite.vercel.app/api/debug/categories?projectId=${projectId}`);
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    // Test 3: Test DB API
    console.log('\n3. Testing /api/test-db...');
    const response3 = await fetch(`https://alignzo-lite.vercel.app/api/test-db?projectId=${projectId}`);
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', JSON.stringify(data3, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
