const https = require('https');

// Try different username formats based on the patterns I see
const USERNAME_FORMATS = [
  'riyas.siddikk',                // Username without domain (like shameem.mohammed)
  'riyas',                        // Just first name
  'siddikk',                      // Just last name
  'riyassiddikk',                 // No dots or spaces
  'riyas_siddikk',                // Underscore
  'riyas.siddikk@6dtech.co.in',   // Full email (current)
  'riyas6289d816d'                // Original from earlier response
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

async function updateUsernameMapping(username) {
  const UPDATE_PAYLOAD = {
    user_email: "riyas.siddikk@6dtech.co.in",
    jira_assignee_name: username,
    jira_reporter_name: username,
    integration_user_email: "riyas.siddikk@6dtech.co.in"
  };

  try {
    const response = await makeRequest('/api/integrations/jira/user-mapping', 'POST', UPDATE_PAYLOAD);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function testUsernameFormats() {
  console.log('🧪 Testing Different JIRA Username Formats...\n');
  
  console.log('📋 Based on other user mappings, trying these formats:\n');
  
  for (const username of USERNAME_FORMATS) {
    console.log(`\n--- Testing: "${username}" ---`);
    
    // Update the mapping first
    console.log('🔄 Updating user mapping...');
    const updateSuccess = await updateUsernameMapping(username);
    
    if (!updateSuccess) {
      console.log('❌ Failed to update mapping, skipping...');
      continue;
    }
    
    console.log('✅ Mapping updated, testing ticket creation...');
    
    try {
      const response = await makeRequest('/api/jira/create-ticket', 'POST', TEST_PAYLOAD);
      
      if (response.status === 200 && response.data.success) {
        console.log(`✅ Success! Ticket: ${response.data.ticket?.key}`);
        console.log(`📝 Message: ${response.data.message}`);
        
        // Check if assignment worked
        if (response.data.message && response.data.message.includes('assigned to')) {
          console.log(`🎯 Assignment appears to work with: "${username}"`);
          console.log('💡 This might be the correct format!');
          console.log('🔍 Please check JIRA to see if the ticket is assigned');
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
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Check which tickets were created and their assignment status in JIRA');
  console.log('2. Look for the username format that actually works');
  console.log('3. Update the mapping permanently with the working format');
  console.log('4. Consider checking JIRA admin panel for correct username format');
}

// Run the test
testUsernameFormats();
