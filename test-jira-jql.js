async function testJiraJQL() {
  try {
    console.log('🔍 Testing JIRA JQL queries...');
    
    const baseUrl = 'https://6dtech.atlassian.net';
    const projectKey = 'CMPOPS';
    const searchTerm = 'CMPOPS-6882';
    
    // Test 1: Exact key match
    console.log('\n🔍 Test 1: Exact key match');
    const exactKeyJQL = `key = "${searchTerm}"`;
    console.log('JQL:', exactKeyJQL);
    
    // Test 2: Project + key pattern
    console.log('\n🔍 Test 2: Project + key pattern');
    const keyPatternJQL = `project = ${projectKey} AND key ~ "${searchTerm}"`;
    console.log('JQL:', keyPatternJQL);
    
    // Test 3: Project + text search
    console.log('\n🔍 Test 3: Project + text search');
    const textSearchJQL = `project = ${projectKey} AND text ~ "${searchTerm}"`;
    console.log('JQL:', textSearchJQL);
    
    // Test 4: Global search
    console.log('\n🔍 Test 4: Global search');
    const globalJQL = `(summary ~ "${searchTerm}" OR description ~ "${searchTerm}" OR key ~ "${searchTerm}")`;
    console.log('JQL:', globalJQL);
    
    // Test 5: Simple project search
    console.log('\n🔍 Test 5: Simple project search');
    const projectJQL = `project = ${projectKey}`;
    console.log('JQL:', projectJQL);
    
    console.log('\n💡 To test these JQL queries:');
    console.log('1. Go to your JIRA instance');
    console.log('2. Navigate to Issues > Search for issues');
    console.log('3. Click on "Advanced" to use JQL');
    console.log('4. Paste each JQL query above and test');
    console.log('5. Check if CMPOPS-6882 exists and is accessible');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testJiraJQL();
