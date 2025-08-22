const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_USER_EMAIL = 'riyas.siddikk@6dtech.co.in';
const TEST_PROJECT_KEY = 'CMPOPS';

// Initialize Supabase client (using placeholder values for testing)
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJiraUserMapping() {
  console.log('🧪 Testing JIRA User Mapping Functionality...\n');

  try {
    // Test 1: Check if user mappings exist
    console.log('1. Checking JIRA user mappings...');
    const { data: mappings, error } = await supabase
      .from('jira_user_mappings')
      .select('*')
      .eq('user_email', TEST_USER_EMAIL);

    if (error) {
      console.error('❌ Error fetching user mappings:', error);
      return;
    }

    console.log(`✅ Found ${mappings?.length || 0} user mappings for ${TEST_USER_EMAIL}`);
    
    if (mappings && mappings.length > 0) {
      console.log('📋 User mappings:');
      mappings.forEach((mapping, index) => {
        console.log(`   ${index + 1}. ${mapping.user_email} -> ${mapping.jira_assignee_name} (Project: ${mapping.jira_project_key || 'Any'})`);
      });
    } else {
      console.log('⚠️  No user mappings found. This might be expected if mappings are created dynamically.');
    }

    // Test 2: Check master mappings
    console.log('\n2. Checking master mappings...');
    const { data: masterMappings, error: masterError } = await supabase
      .from('ticket_master_mappings')
      .select('*')
      .eq('is_active', true);

    if (masterError) {
      console.error('❌ Error fetching master mappings:', masterError);
      return;
    }

    console.log(`✅ Found ${masterMappings?.length || 0} active master mappings`);
    
    if (masterMappings && masterMappings.length > 0) {
      console.log('📋 Sample master mappings:');
      masterMappings.slice(0, 3).forEach((mapping, index) => {
        console.log(`   ${index + 1}. ${mapping.mapped_user_email} -> ${mapping.source_assignee_value}`);
      });
    }

    // Test 3: Simulate the getJiraUsernameForUser logic
    console.log('\n3. Simulating JIRA username lookup...');
    
    // First try with project-specific mapping
    const { data: projectMappings, error: projectError } = await supabase
      .from('jira_user_mappings')
      .select('jira_assignee_name')
      .eq('user_email', TEST_USER_EMAIL)
      .eq('jira_project_key', TEST_PROJECT_KEY);

    let jiraUsername = null;
    
    if (projectMappings && projectMappings.length > 0) {
      jiraUsername = projectMappings[0].jira_assignee_name;
      console.log(`✅ Found project-specific mapping: ${jiraUsername}`);
    } else {
      // Fallback to any mapping for this user
      const { data: fallbackMappings, error: fallbackError } = await supabase
        .from('jira_user_mappings')
        .select('jira_assignee_name')
        .eq('user_email', TEST_USER_EMAIL);

      if (fallbackMappings && fallbackMappings.length > 0) {
        jiraUsername = fallbackMappings[0].jira_assignee_name;
        console.log(`✅ Found fallback mapping: ${jiraUsername}`);
      } else {
        console.log('❌ No JIRA username mapping found for user');
      }
    }

    // Test 4: Simulate ticket creation payload
    console.log('\n4. Simulating ticket creation payload...');
    const ticketPayload = {
      userEmail: TEST_USER_EMAIL,
      projectKey: TEST_PROJECT_KEY,
      summary: 'Test Ticket Assignment',
      description: 'Testing automatic assignment to logged-in user',
      issueType: 'Task',
      priority: 'Medium'
    };

    console.log('📋 Ticket creation payload:');
    console.log(JSON.stringify(ticketPayload, null, 2));
    
    if (jiraUsername) {
      console.log(`✅ Ticket would be assigned to: ${jiraUsername}`);
    } else {
      console.log('⚠️  Ticket would be assigned to integration user (no mapping found)');
    }

    console.log('\n🎉 JIRA Assignment Test Complete!');
    console.log('\n📝 Summary:');
    console.log(`   - User Email: ${TEST_USER_EMAIL}`);
    console.log(`   - Project Key: ${TEST_PROJECT_KEY}`);
    console.log(`   - JIRA Username: ${jiraUsername || 'Not found'}`);
    console.log(`   - Assignment Status: ${jiraUsername ? '✅ Will be assigned to user' : '⚠️  Will use integration user'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJiraUserMapping();
