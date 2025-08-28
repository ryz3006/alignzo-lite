const fetch = require('node-fetch');

async function testTeamMemberships() {
  try {
    console.log('🔍 Testing team memberships...');
    
    const userEmail = 'riyas.siddikk@6dtech.co.in';
    
    // Test the user teams API
    const teamsUrl = `https://alignzo-lite.vercel.app/api/user/teams-with-cache?userEmail=${encodeURIComponent(userEmail)}`;
    console.log(`📡 Testing user teams: ${teamsUrl}`);
    
    const teamsResponse = await fetch(teamsUrl);
    const teamsData = await teamsResponse.json();
    
    console.log(`✅ Teams response status: ${teamsResponse.status}`);
    console.log(`📊 Teams data:`, JSON.stringify(teamsData, null, 2));
    
    // Test the user projects API
    const projectsUrl = `https://alignzo-lite.vercel.app/api/user/projects-with-cache?userEmail=${encodeURIComponent(userEmail)}`;
    console.log(`\n📡 Testing user projects: ${projectsUrl}`);
    
    const projectsResponse = await fetch(projectsUrl);
    const projectsData = await projectsResponse.json();
    
    console.log(`✅ Projects response status: ${projectsResponse.status}`);
    console.log(`📊 Projects data:`, JSON.stringify(projectsData, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing team memberships:', error);
  }
}

testTeamMemberships();
