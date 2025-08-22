const https = require('https');

function makeRequest(url, method) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'alignzo-lite.vercel.app',
      port: 443,
      path: url,
      method: method,
      headers: {
        'Accept': 'application/json'
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
    
    req.end();
  });
}

async function checkMasterMappings() {
  console.log('🔍 Checking Master Mappings for JIRA Username...\n');
  
  const userEmail = "riyas.siddikk@6dtech.co.in";
  
  try {
    // Step 1: Get JIRA source ID
    console.log('1. Getting JIRA source ID...');
    const jiraSourceResponse = await makeRequest('/api/integrations/jira/user-mapping?userEmail=riyas.siddikk@6dtech.co.in', 'GET');
    
    if (jiraSourceResponse.status === 200) {
      console.log('✅ User mappings retrieved successfully');
      console.log(`📋 Found ${jiraSourceResponse.data.mappings?.length || 0} user mappings`);
      
      if (jiraSourceResponse.data.mappings && jiraSourceResponse.data.mappings.length > 0) {
        console.log('\n📋 Current User Mappings:');
        jiraSourceResponse.data.mappings.forEach((mapping, index) => {
          console.log(`   ${index + 1}. ${mapping.user_email} -> ${mapping.jira_assignee_name} (Project: ${mapping.jira_project_key || 'Any'})`);
        });
      }
    } else {
      console.log('❌ Failed to get user mappings');
    }
    
    console.log('\n2. Checking master mappings...');
    console.log('💡 Note: We need to check the ticket_master_mappings table directly');
    console.log('   This would show the source_assignee_value for JIRA source');
    
    console.log('\n📋 Expected Master Mapping Structure:');
    console.log('   - mapped_user_email: riyas.siddikk@6dtech.co.in');
    console.log('   - source_id: [JIRA source ID from ticket_sources]');
    console.log('   - source_assignee_value: [This is what we need for JIRA assignment]');
    console.log('   - is_active: true');
    
    console.log('\n💡 Next Steps:');
    console.log('1. Check the ticket_master_mappings table in your database');
    console.log('2. Look for the record with mapped_user_email = "riyas.siddikk@6dtech.co.in"');
    console.log('3. Find the source_assignee_value for the JIRA source_id');
    console.log('4. That value should be the correct JIRA username');
    
    console.log('\n🔍 Database Query to run:');
    console.log(`
SELECT 
  tmm.mapped_user_email,
  tmm.source_assignee_value,
  ts.name as source_name
FROM ticket_master_mappings tmm
JOIN ticket_sources ts ON tmm.source_id = ts.id
WHERE tmm.mapped_user_email = 'riyas.siddikk@6dtech.co.in'
  AND ts.name = 'JIRA'
  AND tmm.is_active = true;
    `);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkMasterMappings();
