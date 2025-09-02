async function testJiraCredentials() {
  try {
    console.log('🔍 Testing JIRA credentials and connectivity...');
    
    const baseUrl = 'https://6dtech.atlassian.net';
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    
    console.log('\n📋 Test Configuration:');
    console.log('Base URL:', baseUrl);
    console.log('User Email:', userEmail);
    
    console.log('\n🔍 Test 1: Basic connectivity');
    console.log('Testing if JIRA instance is reachable...');
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('✅ JIRA instance is reachable (Status:', response.status, ')');
    } catch (error) {
      console.log('❌ JIRA instance not reachable:', error.message);
    }
    
    console.log('\n🔍 Test 2: Project access');
    console.log('Testing if we can access project CMPOPS...');
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/project/CMPOPS`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('✅ Project CMPOPS is accessible (Status:', response.status, ')');
      
      if (response.ok) {
        const projectData = await response.json();
        console.log('📊 Project details:', {
          key: projectData.key,
          name: projectData.name,
          projectTypeKey: projectData.projectTypeKey
        });
      }
    } catch (error) {
      console.log('❌ Cannot access project CMPOPS:', error.message);
    }
    
    console.log('\n🔍 Test 3: Issue search without auth');
    console.log('Testing basic issue search (will fail without auth, but shows endpoint)...');
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/search?jql=key="CMPOPS-6882"&maxResults=1`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      console.log('✅ Issue search endpoint accessible (Status:', response.status, ')');
      
      if (response.status === 401) {
        console.log('ℹ️  Expected 401 - authentication required');
      }
    } catch (error) {
      console.log('❌ Issue search endpoint not accessible:', error.message);
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Verify your JIRA API token is correct');
    console.log('2. Check if user has access to project CMPOPS');
    console.log('3. Verify ticket CMPOPS-6882 exists in JIRA');
    console.log('4. Test the JQL queries manually in JIRA');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testJiraCredentials();
