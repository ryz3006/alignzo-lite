const fetch = require('node-fetch');

async function testJiraTicketSearch() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'riyas.siddikk@6dtech.co.in';
  const projectKey = 'CMPOPS';
  const searchTerm = 'CMPOPS-6873';
  
  console.log('🔍 Testing JIRA Ticket Search API...');
  console.log(`URL: ${baseUrl}/api/jira/search-tickets`);
  console.log(`Request:`, {
    userEmail,
    projectKey,
    searchTerm,
    maxResults: 20
  });
  
  try {
    const response = await fetch(`${baseUrl}/api/jira/search-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        projectKey,
        searchTerm,
        maxResults: 20
      }),
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📋 Response body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      if (data.success) {
        if (data.tickets && data.tickets.length > 0) {
          console.log('✅ JIRA ticket search successful!');
          console.log(`🎯 Found ${data.tickets.length} tickets`);
          console.log('📋 Ticket details:');
          data.tickets.forEach((ticket, index) => {
            console.log(`  ${index + 1}. Key: ${ticket.key}, Summary: ${ticket.fields?.summary || 'N/A'}`);
          });
        } else {
          console.log('⚠️ Search successful but no tickets found');
          console.log('💡 This might indicate:');
          console.log('   - The ticket key format is different');
          console.log('   - The project key mapping is incorrect');
          console.log('   - The ticket exists in a different project');
        }
      } else {
        console.log('❌ Search failed:', data.error);
      }
    } else {
      console.log('❌ API request failed with status:', response.status);
      console.log('❌ Error details:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing JIRA ticket search:', error.message);
  }
}

// Test with different search strategies
async function testDifferentSearchTerms() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'riyas.siddikk@6dtech.co.in';
  const projectKey = 'CMPOPS';
  
  const searchTerms = [
    'CMPOPS-6873',  // Exact ticket key
    '6873',         // Just the number
    'CMPOPS',       // Project prefix
    'test'          // Generic term
  ];
  
  console.log('\n🧪 Testing different search terms...');
  
  for (const searchTerm of searchTerms) {
    console.log(`\n🔍 Testing search term: "${searchTerm}"`);
    
    try {
      const response = await fetch(`${baseUrl}/api/jira/search-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          projectKey,
          searchTerm,
          maxResults: 20
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`  ✅ Found ${data.tickets?.length || 0} tickets`);
        if (data.tickets && data.tickets.length > 0) {
          console.log(`  📋 Sample: ${data.tickets[0].key}`);
        }
      } else {
        console.log(`  ❌ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run tests
testJiraTicketSearch();
testDifferentSearchTerms();
