const fetch = require('node-fetch');

async function testSearchFix() {
  console.log('🧪 Testing Search API Fix...\n');
  
  const baseUrl = 'https://alignzo-lite.vercel.app/api/jira/search-tickets';
  
  // Test search functionality
  console.log('📄 Testing search for ticket "6934"...');
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      searchTerm: '6934',
      maxResults: 20
    })
  });
  
  const data = await response.json();
  console.log(`📊 Response Status: ${response.status}`);
  console.log(`📊 Success: ${data.success}`);
  console.log(`📊 Tickets Found: ${data.tickets?.length || 0}`);
  
  if (data.tickets && data.tickets.length > 0) {
    const ticket = data.tickets[0];
    console.log(`\n📋 Sample Ticket Data:`);
    console.log(`  Key: ${ticket.key}`);
    console.log(`  Summary: ${ticket.summary}`);
    console.log(`  Status: ${ticket.status}`);
    console.log(`  Priority: ${ticket.priority}`);
    console.log(`  Assignee: ${ticket.assignee}`);
    console.log(`  Reporter: ${ticket.reporter}`);
    console.log(`  Project: ${ticket.project} (${ticket.projectKey})`);
    console.log(`  Issue Type: ${ticket.issueType}`);
    console.log(`  Created: ${ticket.created}`);
    console.log(`  Updated: ${ticket.updated}`);
    console.log(`  JIRA URL: ${ticket.jiraUrl}`);
  }
  
  // Test pagination
  console.log('\n📄 Testing pagination...');
  const paginationResponse = await fetch('https://alignzo-lite.vercel.app/api/jira/my-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: 'riyas.siddikk@6dtech.co.in',
      projectKey: 'CMPOPS',
      page: 1,
      pageSize: 5
    })
  });
  
  const paginationData = await paginationResponse.json();
  console.log(`📊 Pagination Status: ${paginationResponse.status}`);
  console.log(`📊 Success: ${paginationData.success}`);
  console.log(`📊 Total Items: ${paginationData.pagination?.totalItems || 'undefined'}`);
  console.log(`📊 Current Page: ${paginationData.pagination?.currentPage || 'undefined'}`);
  console.log(`📊 Tickets on Page: ${paginationData.tickets?.length || 0}`);
  
  if (paginationData.tickets && paginationData.tickets.length > 0) {
    console.log(`📊 First ticket: ${paginationData.tickets[0].key}`);
    console.log(`📊 Last ticket: ${paginationData.tickets[paginationData.tickets.length - 1].key}`);
  }
}

testSearchFix().catch(console.error);
