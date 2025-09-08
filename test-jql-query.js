const fetch = require('node-fetch');

async function testJQLQuery() {
  console.log('🧪 Testing JQL Query...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/my-tickets';
  
  // Test with different page sizes to see if pagination works
  console.log('📄 Testing with pageSize=5...');
  const response1 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 1,
      pageSize: 5
    })
  });
  
  const data1 = await response1.json();
  console.log(`📊 PageSize=5 - Total Items: ${data1.pagination.totalItems}, Tickets: ${data1.tickets.length}`);
  console.log(`📊 PageSize=5 - First ticket: ${data1.tickets[0]?.key}`);
  console.log(`📊 PageSize=5 - Last ticket: ${data1.tickets[data1.tickets.length - 1]?.key}\n`);

  // Test with pageSize=3
  console.log('📄 Testing with pageSize=3...');
  const response2 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 1,
      pageSize: 3
    })
  });
  
  const data2 = await response2.json();
  console.log(`📊 PageSize=3 - Total Items: ${data2.pagination.totalItems}, Tickets: ${data2.tickets.length}`);
  console.log(`📊 PageSize=3 - First ticket: ${data2.tickets[0]?.key}`);
  console.log(`📊 PageSize=3 - Last ticket: ${data2.tickets[data2.tickets.length - 1]?.key}\n`);

  // Test page 2 with pageSize=3
  console.log('📄 Testing page 2 with pageSize=3...');
  const response3 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 2,
      pageSize: 3
    })
  });
  
  const data3 = await response3.json();
  console.log(`📊 Page 2, PageSize=3 - Total Items: ${data3.pagination.totalItems}, Tickets: ${data3.tickets.length}`);
  console.log(`📊 Page 2, PageSize=3 - First ticket: ${data3.tickets[0]?.key}`);
  console.log(`📊 Page 2, PageSize=3 - Last ticket: ${data3.tickets[data3.tickets.length - 1]?.key}\n`);

  // Compare results
  console.log('🔍 Comparison:');
  console.log(`PageSize=5 first ticket: ${data1.tickets[0]?.key}`);
  console.log(`PageSize=3 first ticket: ${data2.tickets[0]?.key}`);
  console.log(`Page 2, PageSize=3 first ticket: ${data3.tickets[0]?.key}`);
  
  const isSame = data1.tickets[0]?.key === data2.tickets[0]?.key && data2.tickets[0]?.key === data3.tickets[0]?.key;
  console.log(`\n❌ Same data on all pages: ${isSame}`);
}

testJQLQuery().catch(console.error);
