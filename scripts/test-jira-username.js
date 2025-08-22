const https = require('https');

// Test configuration
const TEST_PAYLOAD = {
  userEmail: "riyas.siddikk@6dtech.co.in",
  projectKey: "CMPOPS",
  summary: "Test Username Validation",
  description: "Testing if riyas siddikk is a valid JIRA username",
  issueType: "Task",
  priority: "Medium"
};

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'alignzo-lite.vercel.app',
      port: 443,
      path: '/api/jira/create-ticket',
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

async function testJiraUsername() {
  console.log('🧪 Testing JIRA Username Validation...\n');
  
  console.log('📋 Current Mapping: riyas.siddikk@6dtech.co.in -> "riyas siddikk"');
  console.log('⚠️  Note: JIRA usernames typically don\'t contain spaces\n');
  
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
        console.log('⚠️  However, if the ticket shows as "UnAssigned" in JIRA, the username may be invalid');
      } else {
        console.log('⚠️  No assignment information found in response message');
      }
    } else {
      console.log('\n❌ Ticket creation failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
      
      // Check if it's an assignee-related error
      if (response.data.details && response.data.details.includes('assignee')) {
        console.log('🔍 This appears to be an assignee-related error');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  console.log('\n💡 Possible Solutions:');
  console.log('1. Check if "riyas siddikk" exists as a username in JIRA');
  console.log('2. Try using email address instead: riyas.siddikk@6dtech.co.in');
  console.log('3. Try using username without space: riyassiddikk');
  console.log('4. Check JIRA user search API to find correct username format');
}

// Run the test
testJiraUsername();
