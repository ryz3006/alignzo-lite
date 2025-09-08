const fetch = require('node-fetch');

async function testPaginationDebug() {
  console.log('🧪 Testing Pagination API Debug...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/my-tickets';
  
  // Test pagination with detailed error logging
  console.log('📄 Testing pagination...');
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 1,
      pageSize: 5
    })
  });
  
  console.log(`📊 Response Status: ${response.status}`);
  console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
  
  const data = await response.json();
  console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.log(`❌ Error: ${response.status} - ${data.error || 'Unknown error'}`);
    if (data.details) {
      console.log(`📋 Error Details:`, data.details);
    }
  }
}

testPaginationDebug().catch(console.error);
