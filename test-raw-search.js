const fetch = require('node-fetch');

async function testRawSearch() {
  console.log('🧪 Testing Raw Search Response...\n');
  
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
    console.log(`\n📋 Raw Ticket Object:`);
    console.log(JSON.stringify(ticket, null, 2));
    
    console.log(`\n📋 Field Access Test:`);
    console.log(`  ticket.key: ${ticket.key}`);
    console.log(`  ticket.fields: ${ticket.fields ? 'exists' : 'undefined'}`);
    if (ticket.fields) {
      console.log(`  ticket.fields.summary: ${ticket.fields.summary}`);
      console.log(`  ticket.fields.status: ${ticket.fields.status ? 'exists' : 'undefined'}`);
      if (ticket.fields.status) {
        console.log(`  ticket.fields.status.name: ${ticket.fields.status.name}`);
      }
    }
  }
}

testRawSearch().catch(console.error);
