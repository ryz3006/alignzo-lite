const fetch = require('node-fetch');

async function testProjectMappingDelete() {
  const baseUrl = 'http://localhost:3000';
  const mappingId = '8b37bafb-87d1-4dab-a8a8-fb5900fdefb4'; // Use the same ID from the error
  
  console.log('Testing project mapping delete API...');
  console.log(`URL: ${baseUrl}/api/integrations/jira/project-mapping?mappingId=${mappingId}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/integrations/jira/project-mapping?mappingId=${mappingId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (response.ok) {
      console.log('✅ DELETE request successful!');
    } else {
      console.log('❌ DELETE request failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing DELETE request:', error.message);
  }
}

// Test both parameter names to ensure backward compatibility
async function testBothParameterNames() {
  const baseUrl = 'http://localhost:3000';
  const mappingId = 'test-id-123';
  
  console.log('\n=== Testing with mappingId parameter ===');
  try {
    const response1 = await fetch(`${baseUrl}/api/integrations/jira/project-mapping?mappingId=${mappingId}`, {
      method: 'DELETE',
    });
    console.log('mappingId parameter - Status:', response1.status);
  } catch (error) {
    console.log('mappingId parameter - Error:', error.message);
  }
  
  console.log('\n=== Testing with id parameter ===');
  try {
    const response2 = await fetch(`${baseUrl}/api/integrations/jira/project-mapping?id=${mappingId}`, {
      method: 'DELETE',
    });
    console.log('id parameter - Status:', response2.status);
  } catch (error) {
    console.log('id parameter - Error:', error.message);
  }
}

// Run tests
testProjectMappingDelete();
testBothParameterNames();
