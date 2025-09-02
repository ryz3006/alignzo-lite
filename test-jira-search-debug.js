const { searchJiraIssuesEnhanced } = require('./lib/jira');

async function testJiraSearch() {
  try {
    console.log('🔍 Testing JIRA search for CMPOPS-6882...');
    
    // Test with the exact data from the API call
    const result = await searchJiraIssuesEnhanced(
      {
        base_url: 'https://6dtech.atlassian.net',
        user_email_integration: 'riyas.siddikk@6dtech.co.in',
        api_token: 'YOUR_API_TOKEN_HERE' // You'll need to add the actual token
      },
      'CMPOPS',
      'CMPOPS-6882',
      20
    );
    
    console.log('✅ Search result:', result);
    console.log('📊 Found tickets:', result.length);
    
    if (result.length > 0) {
      console.log('🎯 First ticket:', result[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testJiraSearch();
