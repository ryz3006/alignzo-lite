// Test script for My JIRA Tickets API
// Run with: node test-my-jira-tickets.js

const testMyJiraTickets = async () => {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'riyas.siddikk@6dtech.co.in';
  const projectKey = 'CMPOPS';

  console.log('🧪 Testing My JIRA Tickets API...');
  console.log(`📧 User: ${userEmail}`);
  console.log(`🏗️ Project: ${projectKey}`);
  console.log('');

  try {
    // Test 1: Fetch user's tickets
    console.log('🔍 Test 1: Fetching user tickets...');
    const response = await fetch(`${baseUrl}/api/jira/my-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: userEmail,
        projectKey: projectKey,
        page: 1,
        pageSize: 10
      }),
    });

    console.log(`📊 Response Status: ${response.status}`);
    
    const data = await response.json();
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`✅ Success! Found ${data.tickets.length} tickets`);
      console.log(`📄 Pagination: Page ${data.pagination.currentPage} of ${data.pagination.totalPages}`);
      console.log(`📊 Pagination details:`, data.pagination);
      
      if (data.tickets.length > 0) {
        console.log('🎫 Sample ticket:', {
          key: data.tickets[0].key,
          summary: data.tickets[0].summary,
          status: data.tickets[0].status,
          assignee: data.tickets[0].assignee,
          jiraUrl: data.tickets[0].jiraUrl
        });
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
      if (data.details) {
        console.log(`📝 Details: ${data.details}`);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
};

// Test 2: Test transitions for a specific ticket
const testTicketTransitions = async (ticketKey) => {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'riyas.siddikk@6dtech.co.in';

  console.log(`\n🔍 Test 2: Fetching transitions for ticket ${ticketKey}...`);

  try {
    const response = await fetch(`${baseUrl}/api/jira/ticket-transitions?userEmail=${encodeURIComponent(userEmail)}&ticketKey=${encodeURIComponent(ticketKey)}`);
    
    console.log(`📊 Response Status: ${response.status}`);
    
    const data = await response.json();
    console.log('📋 Response Data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`✅ Success! Found ${data.transitions.length} available transitions`);
      data.transitions.forEach((transition, index) => {
        console.log(`  ${index + 1}. ${transition.name} → ${transition.to}`);
      });
    } else {
      console.log(`❌ Error: ${data.error}`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
};

// Run tests
const runTests = async () => {
  await testMyJiraTickets();
  
  // If you have a specific ticket key, test transitions
  // await testTicketTransitions('CMPOPS-123');
};

runTests().catch(console.error);
