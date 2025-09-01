const fetch = require('node-fetch');

async function testJiraProjectsAPI() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'amal.krishnan@6dtech.co.in';
  const query = 'VIL-IN-CMPOPS-INT';
  
  console.log('Testing JIRA Projects API...');
  console.log(`URL: ${baseUrl}/api/integrations/jira/projects?userEmail=${userEmail}&query=${query}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/integrations/jira/projects?userEmail=${userEmail}&query=${query}`);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      if (data.projects && Array.isArray(data.projects)) {
        console.log('✅ API now returns projects array instead of mappings!');
        console.log(`Found ${data.projects.length} JIRA projects`);
        
        if (data.projects.length > 0) {
          console.log('Sample project:', data.projects[0]);
        }
      } else if (data.mappings && Array.isArray(data.mappings)) {
        console.log('❌ API still returns mappings instead of projects');
      } else {
        console.log('⚠️ API response format is unexpected:', Object.keys(data));
      }
    } else {
      console.log('❌ API request failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing JIRA projects API:', error.message);
  }
}

// Test without query parameter
async function testJiraProjectsAPIWithoutQuery() {
  const baseUrl = 'https://alignzo-lite.vercel.app';
  const userEmail = 'amal.krishnan@6dtech.co.in';
  
  console.log('\n=== Testing JIRA Projects API without query ===');
  console.log(`URL: ${baseUrl}/api/integrations/jira/projects?userEmail=${userEmail}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/integrations/jira/projects?userEmail=${userEmail}`);
    
    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      if (data.projects && Array.isArray(data.projects)) {
        console.log(`✅ Found ${data.projects.length} total JIRA projects`);
      } else {
        console.log('❌ Response format is still incorrect');
      }
    } else {
      console.log('❌ API request failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run tests
testJiraProjectsAPI();
testJiraProjectsAPIWithoutQuery();
