const fetch = require('node-fetch');

async function testTeamMembersAPI() {
  try {
    // Test with a sample team ID - you'll need to replace this with a real team ID from your database
    const teamId = 'your-team-id-here'; // Replace with actual team ID
    
    console.log('Testing team members API...');
    console.log('Team ID:', teamId);
    
    const response = await fetch(`http://localhost:3000/api/teams/team-members?teamId=${teamId}`);
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.teamMembers && data.teamMembers.length > 0) {
        console.log('✅ Team members found:', data.teamMembers.length);
        data.teamMembers.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.full_name || 'No name'} (${member.email})`);
        });
      } else {
        console.log('⚠️  No team members found');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ API Error:', errorData);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTeamMembersAPI();
