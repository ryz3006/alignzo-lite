const fetch = require('node-fetch');

async function testPagination() {
  console.log('🧪 Testing JIRA Tickets Pagination...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/my-tickets';
  const requestBody = {
    userEmail: 'riyas.siddikk@6dtech.co.in',
    projectKey: 'CMPOPS',
    pageSize: 10
  };

  // Test page 1
  console.log('📄 Testing Page 1...');
  const response1 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requestBody, page: 1 })
  });
  
  const data1 = await response1.json();
  console.log(`📊 Page 1 - Total Items: ${data1.pagination.totalItems}, Tickets: ${data1.tickets.length}`);
  console.log(`📊 Page 1 - First ticket: ${data1.tickets[0]?.key}`);
  console.log(`📊 Page 1 - Last ticket: ${data1.tickets[data1.tickets.length - 1]?.key}\n`);

  // Test page 2
  console.log('📄 Testing Page 2...');
  const response2 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requestBody, page: 2 })
  });
  
  const data2 = await response2.json();
  console.log(`📊 Page 2 - Total Items: ${data2.pagination.totalItems}, Tickets: ${data2.tickets.length}`);
  console.log(`📊 Page 2 - First ticket: ${data2.tickets[0]?.key}`);
  console.log(`📊 Page 2 - Last ticket: ${data2.tickets[data2.tickets.length - 1]?.key}\n`);

  // Test page 3
  console.log('📄 Testing Page 3...');
  const response3 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requestBody, page: 3 })
  });
  
  const data3 = await response3.json();
  console.log(`📊 Page 3 - Total Items: ${data3.pagination.totalItems}, Tickets: ${data3.tickets.length}`);
  console.log(`📊 Page 3 - First ticket: ${data3.tickets[0]?.key}`);
  console.log(`📊 Page 3 - Last ticket: ${data3.tickets[data3.tickets.length - 1]?.key}\n`);

  // Compare results
  console.log('🔍 Comparison:');
  console.log(`Page 1 first ticket: ${data1.tickets[0]?.key}`);
  console.log(`Page 2 first ticket: ${data2.tickets[0]?.key}`);
  console.log(`Page 3 first ticket: ${data3.tickets[0]?.key}`);
  
  const isSame = data1.tickets[0]?.key === data2.tickets[0]?.key && data2.tickets[0]?.key === data3.tickets[0]?.key;
  console.log(`\n❌ Same data on all pages: ${isSame}`);
}

testPagination().catch(console.error);
