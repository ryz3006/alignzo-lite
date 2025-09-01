require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found!');
  console.log('Please make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTeamMembers() {
  try {
    console.log('🔍 Debugging Team Members...\n');

    // 1. Check if teams exist
    console.log('1. Checking teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(5);

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      return;
    }

    console.log(`✅ Found ${teams.length} teams:`);
    teams.forEach(team => {
      console.log(`   - ${team.name} (ID: ${team.id})`);
    });

    if (teams.length === 0) {
      console.log('⚠️  No teams found. Please create some teams first.');
      return;
    }

    // 2. Check team members for the first team
    const firstTeam = teams[0];
    console.log(`\n2. Checking team members for team: ${firstTeam.name} (${firstTeam.id})`);
    
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        users (
          id,
          email,
          full_name
        )
      `)
      .eq('team_id', firstTeam.id);

    if (membersError) {
      console.error('❌ Error fetching team members:', membersError);
      return;
    }

    console.log(`✅ Found ${teamMembers.length} team members:`);
    teamMembers.forEach(member => {
      const user = member.users;
      console.log(`   - ${user?.full_name || 'No name'} (${user?.email || 'No email'}) - User ID: ${member.user_id}`);
    });

    if (teamMembers.length === 0) {
      console.log('⚠️  No team members found for this team.');
      console.log('   You need to add users to this team first.');
      return;
    }

    // 3. Test the API endpoint
    console.log('\n3. Testing API endpoint...');
    const response = await fetch(`http://localhost:3000/api/teams/team-members?teamId=${firstTeam.id}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.json();
      console.log('❌ API Error:', errorData);
    }

    // 4. Check users table
    console.log('\n4. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.full_name || 'No name'} (${user.email}) - ID: ${user.id}`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugTeamMembers();
