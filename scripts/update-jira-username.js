const https = require('https');

// Update the JIRA username mapping
const UPDATE_PAYLOAD = {
  user_email: "riyas.siddikk@6dtech.co.in",
  jira_assignee_name: "riyas.siddikk@6dtech.co.in",  // Use email instead of "riyas siddikk"
  jira_reporter_name: "riyas.siddikk@6dtech.co.in",  // Use email instead of "riyas siddikk"
  integration_user_email: "riyas.siddikk@6dtech.co.in"
};

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'alignzo-lite.vercel.app',
      port: 443,
      path: '/api/integrations/jira/user-mapping',
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

async function updateJiraUsername() {
  console.log('🔄 Updating JIRA Username Mapping...\n');
  
  console.log('📋 Current Mapping: riyas.siddikk@6dtech.co.in -> "riyas siddikk"');
  console.log('📋 New Mapping: riyas.siddikk@6dtech.co.in -> "riyas.siddikk@6dtech.co.in"');
  console.log('💡 Reason: JIRA usernames typically don\'t contain spaces\n');
  
  console.log('📋 Update Payload:');
  console.log(JSON.stringify(UPDATE_PAYLOAD, null, 2));
  console.log('\n🚀 Making update request...\n');

  try {
    const response = await makeRequest('/api/integrations/jira/user-mapping', 'POST', UPDATE_PAYLOAD);
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('\n✅ User mapping updated successfully!');
      console.log('🎯 Now testing ticket creation with new mapping...\n');
      
      // Test ticket creation with the updated mapping
      await testTicketCreation();
    } else {
      console.log('\n❌ Failed to update user mapping');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testTicketCreation() {
  const TEST_PAYLOAD = {
    userEmail: "riyas.siddikk@6dtech.co.in",
    projectKey: "CMPOPS",
    summary: "Test After Username Update",
    description: "Testing ticket creation after updating JIRA username to email format",
    issueType: "Task",
    priority: "Medium"
  };

  console.log('🧪 Testing Ticket Creation with Updated Username...\n');
  
  console.log('📋 Request Payload:');
  console.log(JSON.stringify(TEST_PAYLOAD, null, 2));
  console.log('\n🚀 Making ticket creation request...\n');

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
        console.log('🎯 Check JIRA to see if the ticket is now properly assigned!');
      } else {
        console.log('⚠️  No assignment information found in response message');
      }
    } else {
      console.log('\n❌ Ticket creation failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the update
updateJiraUsername();
