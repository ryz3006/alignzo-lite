const fetch = require('node-fetch');

async function testFinalFix() {
  console.log('🧪 Testing Final Fix (After Deployment)...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/my-tickets';
  
  // Test pagination
  console.log('📄 Testing pagination (page 1)...');
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
  
  console.log(`📊 Page 1 Status: ${response1.status}`);
  const data1 = await response1.json();
  
  if (response1.ok) {
    console.log(`✅ Page 1 Success!`);
    console.log(`📊 Total Items: ${data1.pagination?.totalItems || 'undefined'}`);
    console.log(`📊 Tickets: ${data1.tickets?.length || 0}`);
    if (data1.tickets && data1.tickets.length > 0) {
      console.log(`📊 First ticket: ${data1.tickets[0].key}`);
    }
  } else {
    console.log(`❌ Page 1 Error: ${data1.error}`);
    if (data1.jql) {
      console.log(`📋 JQL Query: ${data1.jql}`);
    }
  }
  
  // Test page 2
  console.log('\n📄 Testing pagination (page 2)...');
  const response2 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 2,
      pageSize: 5
    })
  });
  
  console.log(`📊 Page 2 Status: ${response2.status}`);
  const data2 = await response2.json();
  
  if (response2.ok) {
    console.log(`✅ Page 2 Success!`);
    console.log(`📊 Total Items: ${data2.pagination?.totalItems || 'undefined'}`);
    console.log(`📊 Tickets: ${data2.tickets?.length || 0}`);
    if (data2.tickets && data2.tickets.length > 0) {
      console.log(`📊 First ticket: ${data2.tickets[0].key}`);
    }
    
    // Compare with page 1
    if (data1.tickets && data2.tickets && data1.tickets.length > 0 && data2.tickets.length > 0) {
      const sameData = data1.tickets[0].key === data2.tickets[0].key;
      console.log(`\n🔍 Pagination Test: ${sameData ? '❌ Same data (pagination not working)' : '✅ Different data (pagination working)'}`);
    }
  } else {
    console.log(`❌ Page 2 Error: ${data2.error}`);
  }
  
  // Test search API
  console.log('\n📄 Testing search API...');
  const searchResponse = await fetch('https://alignzo-lite.vercel.app/api/jira/search-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      searchTerm: '6934',
      maxResults: 5
    })
  });
  
  console.log(`📊 Search Status: ${searchResponse.status}`);
  const searchData = await searchResponse.json();
  
  if (searchResponse.ok) {
    console.log(`✅ Search Success!`);
    console.log(`📊 Tickets Found: ${searchData.tickets?.length || 0}`);
    if (searchData.tickets && searchData.tickets.length > 0) {
      const ticket = searchData.tickets[0];
      console.log(`📊 Sample Ticket:`);
      console.log(`  Key: ${ticket.key}`);
      console.log(`  Summary: ${ticket.summary}`);
      console.log(`  Status: ${ticket.status}`);
      console.log(`  Priority: ${ticket.priority}`);
      console.log(`  Assignee: ${ticket.assignee}`);
    }
  } else {
    console.log(`❌ Search Error: ${searchData.error}`);
  }
}

testFinalFix().catch(console.error);
