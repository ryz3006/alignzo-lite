const https = require('https');

// Test configuration
const TEST_PAYLOAD = {
  userEmail: "riyas.siddikk@6dtech.co.in",
  projectKey: "CMPOPS",
  summary: "Test Direct JIRA Query",
  description: "Testing ticket creation with direct JIRA username lookup",
  issueType: "Task",
  priority: "Medium"
};

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: 'alignzo-lite.vercel.app',
      port: 443,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testDirectJiraQuery() {
  console.log('🧪 Testing Direct JIRA Query Approach...\n');
  
  console.log('📋 This test will:');
  console.log('1. Query JIRA directly to find users matching the email');
  console.log('2. Use the found username for ticket assignment');
  console.log('3. Create a ticket with the JIRA-found username\n');
  
  console.log('📋 Request Payload:');
  console.log(JSON.stringify(TEST_PAYLOAD, null, 2));
  console.log('\n🚀 Making API request...\n');

  try {
    const response = await makeRequest('/api/jira/create-ticket', 'POST', TEST_PAYLOAD);
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('\n✅ Ticket created successfully!');
      console.log(`🎫 Ticket Key: ${response.data.ticket?.key}`);
      console.log(`📝 Message: ${response.data.message}`);
      
      // Check if assignment information is in the message
      if (response.data.message && response.data.message.includes('assigned to')) {
        console.log('✅ Assignment information found in response message');
        console.log('🎯 The system should have queried JIRA directly for the username');
        console.log('🔍 Please check JIRA to see if the ticket is properly assigned!');
        
        // Extract the username from the message
        const match = response.data.message.match(/assigned to ([^!]+)/);
        if (match) {
          console.log(`📋 Username used: ${match[1].trim()}`);
        }
      } else {
        console.log('⚠️  No assignment information found in response message');
      }
    } else {
      console.log('\n❌ Ticket creation failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
      
      // Check if it's an assignee-related error
      if (response.data.details && response.data.details.includes('assignee')) {
        console.log('🔍 This appears to be an assignee-related error');
        console.log('💡 The JIRA query might not have found a valid username');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n💡 What this approach does:');
  console.log('1. Queries JIRA user search API with the email address');
  console.log('2. Looks for exact email matches first');
  console.log('3. Falls back to partial matches (username/display name)');
  console.log('4. Uses the found username for ticket assignment');
  console.log('5. This should find the correct JIRA username format');
}

// Run the test
testDirectJiraQuery();
