const https = require('https');

// Test with username without domain (like shameem.mohammed)
const TEST_USERNAME = 'riyas.siddikk';

// Update the JIRA username mapping
const UPDATE_PAYLOAD = {
  user_email: "riyas.siddikk@6dtech.co.in",
  jira_assignee_name: TEST_USERNAME,
  jira_reporter_name: TEST_USERNAME,
  jira_project_key: "CMPOPS",
  integration_user_email: "riyas.siddikk@6dtech.co.in"
};

// Test configuration
const TEST_PAYLOAD = {
  userEmail: "riyas.siddikk@6dtech.co.in",
  projectKey: "CMPOPS",
  summary: "Test Single Username Format",
  description: "Testing ticket creation with username format: " + TEST_USERNAME,
  issueType: "Task",
  priority: "Medium"
};

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'alignzo-lite.vercel.app',
      port: 443,
      path: url,
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

async function testSingleUsername() {
  console.log(`🧪 Testing Single Username Format: "${TEST_USERNAME}"\n`);
  
  console.log('📋 Update Payload:');
  console.log(JSON.stringify(UPDATE_PAYLOAD, null, 2));
  console.log('\n🚀 Updating user mapping...\n');

  try {
    // Step 1: Update the mapping
    const updateResponse = await makeRequest('/api/integrations/jira/user-mapping', 'POST', UPDATE_PAYLOAD);
    
    console.log(`📊 Update Response Status: ${updateResponse.status}`);
    console.log('📋 Update Response Data:');
    console.log(JSON.stringify(updateResponse.data, null, 2));
    
    if (updateResponse.status !== 200) {
      console.log('\n❌ Failed to update user mapping');
      return;
    }
    
    console.log('\n✅ User mapping updated successfully!');
    console.log('🎯 Now testing ticket creation...\n');
    
    // Step 2: Test ticket creation
    console.log('📋 Test Payload:');
    console.log(JSON.stringify(TEST_PAYLOAD, null, 2));
    console.log('\n🚀 Creating test ticket...\n');
    
    const ticketResponse = await makeRequest('/api/jira/create-ticket', 'POST', TEST_PAYLOAD);
    
    console.log(`📊 Ticket Response Status: ${ticketResponse.status}`);
    console.log('📋 Ticket Response Data:');
    console.log(JSON.stringify(ticketResponse.data, null, 2));
    
    if (ticketResponse.status === 200 && ticketResponse.data.success) {
      console.log('\n✅ Ticket created successfully!');
      console.log(`🎫 Ticket Key: ${ticketResponse.data.ticket?.key}`);
      console.log(`📝 Message: ${ticketResponse.data.message}`);
      
      // Check if assignment worked
      if (ticketResponse.data.message && ticketResponse.data.message.includes('assigned to')) {
        console.log('✅ Assignment information found in response message');
        console.log(`🎯 Ticket should be assigned to: ${TEST_USERNAME}`);
        console.log('🔍 Please check JIRA to see if the ticket is properly assigned!');
      } else {
        console.log('⚠️  No assignment information found in response message');
      }
    } else {
      console.log('\n❌ Ticket creation failed');
      console.log(`Error: ${ticketResponse.data.error || 'Unknown error'}`);
      
      // Check if it's an assignee-related error
      if (ticketResponse.data.details && ticketResponse.data.details.includes('assignee')) {
        console.log('🔍 This appears to be an assignee-related error');
        console.log('💡 The username format might be incorrect');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check the ticket in JIRA to see if it\'s assigned');
  console.log('2. If still unassigned, we need to try a different username format');
  console.log('3. Consider checking JIRA admin panel for correct username format');
}

// Run the test
testSingleUsername();
