// Test the pagination logic locally
const testPaginationLogic = () => {
  console.log('🧪 Testing Pagination Logic...\n');
  
  // Simulate the data we get from JIRA
  const mockJiraData = {
    total: 25,
    issues: [
      { key: 'CMPOPS-6933', summary: 'test dummy' },
      { key: 'CMPOPS-6932', summary: 'dummy ticket new' },
      { key: 'CMPOPS-6931', summary: 'dummy ticket from work logs' },
      { key: 'CMPOPS-6883', summary: 'Dummy' },
      { key: 'CMPOPS-6882', summary: 'Test Task' },
      { key: 'CMPOPS-6220', summary: 'Comfort Techno' },
      { key: 'CMPOPS-3130', summary: 'Nagios Alarms' },
      { key: 'CMPOPS-2336', summary: 'Monitoring' },
      { key: 'CMPOPS-6878', summary: 'dummy' },
      { key: 'CMPOPS-6876', summary: 'dummy ticket' },
      { key: 'CMPOPS-6875', summary: 'another ticket' },
      { key: 'CMPOPS-6874', summary: 'yet another ticket' },
      { key: 'CMPOPS-6873', summary: 'more tickets' },
      { key: 'CMPOPS-6872', summary: 'even more' },
      { key: 'CMPOPS-6871', summary: 'last ticket' }
    ]
  };
  
  const pageSize = 5;
  
  // Test different pages
  for (let page = 1; page <= 4; page++) {
    const startAt = (page - 1) * pageSize;
    const endIndex = startAt + pageSize;
    const paginatedTickets = mockJiraData.issues.slice(startAt, endIndex);
    
    console.log(`📄 Page ${page}:`);
    console.log(`  StartAt: ${startAt}, EndIndex: ${endIndex}`);
    console.log(`  Tickets: ${paginatedTickets.length}`);
    console.log(`  First ticket: ${paginatedTickets[0]?.key || 'none'}`);
    console.log(`  Last ticket: ${paginatedTickets[paginatedTickets.length - 1]?.key || 'none'}`);
    console.log('');
  }
  
  // Test pagination calculation
  const totalItems = mockJiraData.total;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  console.log(`📊 Pagination Summary:`);
  console.log(`  Total Items: ${totalItems}`);
  console.log(`  Page Size: ${pageSize}`);
  console.log(`  Total Pages: ${totalPages}`);
  
  // Test hasNextPage and hasPreviousPage logic
  for (let page = 1; page <= 3; page++) {
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    console.log(`  Page ${page}: hasNext=${hasNextPage}, hasPrevious=${hasPreviousPage}`);
  }
};

testPaginationLogic();
