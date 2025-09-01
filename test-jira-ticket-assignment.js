const fetch = require('node-fetch');

async function testJiraTicketAssignment() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'riyas.siddikk@6dtech.co.in';
  const projectKey = 'CMPOPS';
  
  console.log('🧪 Testing JIRA Ticket Assignment Fix...');
  console.log(`URL: ${baseUrl}/api/jira/create-ticket`);
  console.log(`Request:`, {
    userEmail,
    projectKey,
    summary: 'Test ticket for assignment fix',
    description: 'This ticket is created to test the assignment fix',
    issueType: 'Task',
    priority: 'Medium'
  });
  
  try {
    const response = await fetch(`${baseUrl}/api/jira/create-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        projectKey,
        summary: 'Test ticket for assignment fix',
        description: 'This ticket is created to test the assignment fix',
        issueType: 'Task',
        priority: 'Medium'
      }),
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📋 Response body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      if (data.success) {
        console.log('✅ JIRA ticket created successfully!');
        console.log(`🎫 Ticket Key: ${data.ticket?.key}`);
        
        if (data.assignee) {
          console.log('👤 Ticket assigned to:', data.assignee.displayName);
          console.log('🆔 Assignee Account ID:', data.assignee.accountId);
          console.log('✅ Assignment working correctly!');
        } else {
          console.log('⚠️ Ticket created without assignment');
          console.log('📝 Note:', data.note);
          console.log('💡 This means no user mapping was found for automatic assignment');
        }
        
        console.log('📝 Message:', data.message);
      } else {
        console.log('❌ Ticket creation failed:', data.error);
        if (data.details) {
          console.log('🔍 Error details:', data.details);
        }
      }
    } else {
      console.log('❌ API request failed with status:', response.status);
      console.log('❌ Error details:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing JIRA ticket creation:', error.message);
  }
}

// Test with different users to see assignment behavior
async function testMultipleUsers() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const projectKey = 'CMPOPS';
  
  const testUsers = [
    'riyas.siddikk@6dtech.co.in',
    'amal.krishnan@6dtech.co.in',
    'test.user@6dtech.co.in' // This user might not have mappings
  ];
  
  console.log('\n🧪 Testing ticket assignment for multiple users...');
  
  for (const userEmail of testUsers) {
    console.log(`\n👤 Testing user: ${userEmail}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/jira/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          projectKey,
          summary: `Test ticket for ${userEmail}`,
          description: `Testing assignment for user ${userEmail}`,
          issueType: 'Task',
          priority: 'Low'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.assignee) {
          console.log(`  ✅ Ticket ${data.ticket.key} assigned to ${data.assignee.displayName}`);
        } else {
          console.log(`  ⚠️ Ticket ${data.ticket.key} created without assignment`);
        }
      } else {
        console.log(`  ❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run tests
testJiraTicketAssignment();
testMultipleUsers();
