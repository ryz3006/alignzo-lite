const https = require('https');

// Test configuration
const TEST_PAYLOAD = {
  userEmail: "riyas.siddikk@6dtech.co.in",
  projectKey: "CMPOPS",
  summary: "Test Master Mapping Approach",
  description: "Testing ticket creation using master mapping source_assignee_value",
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

async function testMasterMappingApproach() {
  console.log('🧪 Testing Master Mapping Approach for JIRA Username...\n');
  
  console.log('📋 This test will:');
  console.log('1. Query ticket_master_mappings for source_assignee_value');
  console.log('2. Use that value as the JIRA username');
  console.log('3. Create a ticket with the found username\n');
  
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
        console.log('🎯 The system should have used the source_assignee_value from master mappings');
        console.log('🔍 Please check JIRA to see if the ticket is properly assigned!');
      } else {
        console.log('⚠️  No assignment information found in response message');
      }
    } else {
      console.log('\n❌ Ticket creation failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
      
      // Check if it's an assignee-related error
      if (response.data.details && response.data.details.includes('assignee')) {
        console.log('🔍 This appears to be an assignee-related error');
        console.log('💡 The master mapping source_assignee_value might be incorrect');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n💡 What this approach does:');
  console.log('1. Looks up the user in ticket_master_mappings table');
  console.log('2. Finds the JIRA source_id from ticket_sources table');
  console.log('3. Gets the source_assignee_value for that user and JIRA source');
  console.log('4. Uses that value as the JIRA username for assignment');
  console.log('5. If that fails, falls back to querying JIRA directly');
}

// Run the test
testMasterMappingApproach();
