const https = require('https');

// Test different JIRA username formats
const USERNAME_FORMATS = [
  'riyas.siddikk@6dtech.co.in',  // Email address
  'riyassiddikk',                // No space
  'riyas_siddikk',               // Underscore
  'riyas.siddikk',               // Dot notation
  'riyas6289d816d'               // Original from earlier response
];

// Test configuration
const TEST_PAYLOAD = {
  userEmail: "riyas.siddikk@6dtech.co.in",
  projectKey: "CMPOPS",
  summary: "Test Username Format",
  description: "Testing different JIRA username formats",
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

async function testUsernameFormats() {
  console.log('🧪 Testing Different JIRA Username Formats...\n');
  
  console.log('📋 Current Problem: "riyas siddikk" contains a space');
  console.log('🔍 Testing these formats:\n');
  
  for (const username of USERNAME_FORMATS) {
    console.log(`\n--- Testing: "${username}" ---`);
    
    try {
      const response = await makeRequest('/api/jira/create-ticket', 'POST', TEST_PAYLOAD);
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ Success! Ticket: ${response.data.ticket?.key}`);
        console.log(`📝 Message: ${response.data.message}`);
        
        // Check if assignment worked
        if (response.data.message && response.data.message.includes('assigned to')) {
          console.log(`🎯 Assignment appears to work with: "${username}"`);
          console.log('💡 This might be the correct format!');
        } else {
          console.log('⚠️  No assignment information in response');
        }
      } else {
        console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
        
        // Check if it's an assignee-related error
        if (response.data.details && response.data.details.includes('assignee')) {
          console.log('🔍 This appears to be an assignee-related error');
        }
      }
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. Try using email address: riyas.siddikk@6dtech.co.in');
  console.log('2. Try using username without space: riyassiddikk');
  console.log('3. Check JIRA admin panel for correct username format');
  console.log('4. Update the user mapping with the correct format');
}

// Run the test
testUsernameFormats();
