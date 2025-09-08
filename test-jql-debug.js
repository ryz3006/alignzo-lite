const fetch = require('node-fetch');

async function testJQLDebug() {
  console.log('🧪 Testing JQL Query Debug...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/my-tickets';
  
  // Test with minimal parameters
  console.log('📄 Testing with minimal parameters...');
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
  const data = await response.json();
  console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.log(`❌ Error: ${response.status} - ${data.error || 'Unknown error'}`);
    if (data.details) {
      console.log(`📋 Error Details:`, data.details);
    }
  }
}

testJQLDebug().catch(console.error);
