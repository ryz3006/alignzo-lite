// Test JQL query format
const testJQL = () => {
  const assigneeName = "riyas siddikk";
  const projectKey = "CMPOPS";
  
  // Test different JQL formats
  const queries = [
    `assignee = "${assigneeName}" AND project = "${projectKey}" ORDER BY updated DESC`,
    `assignee = "${assigneeName}" AND project = ${projectKey} ORDER BY updated DESC`,
    `assignee = "${assigneeName}" ORDER BY updated DESC`,
    `project = "${projectKey}" ORDER BY updated DESC`
  ];
  
  console.log('🧪 Testing JQL Query Formats:');
  queries.forEach((query, index) => {
    console.log(`${index + 1}. ${query}`);
  });
  
  // Test URL encoding
  const testQuery = queries[0];
  const encodedQuery = encodeURIComponent(testQuery);
  console.log(`\n🔍 URL Encoded Query: ${encodedQuery}`);
  
  // Test the actual API call format
  const baseUrl = "https://sixdee.atlassian.net";
  const searchUrl = `${baseUrl}/rest/api/3/search?jql=${encodedQuery}&startAt=0&maxResults=10`;
  console.log(`\n🌐 Full Search URL: ${searchUrl}`);
};

testJQL();