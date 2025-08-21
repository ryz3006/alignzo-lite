const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Note: For local development, you'll need to set up your Supabase credentials
// This script is designed to be run in an environment where Supabase is properly configured
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'your-supabase-url') {
  console.error('❌ Please set up your Supabase credentials in environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Or manually run the SQL commands from database/jira_project_mapping.sql in your Supabase dashboard.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createJiraProjectMappingTable() {
  try {
    console.log('📊 Creating JIRA Project Mapping table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'jira_project_mapping.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL commands...');
    
    // Execute the SQL (note: this might not work with RLS policies in some Supabase setups)
    // You may need to run the SQL manually in the Supabase dashboard
    const { error } = await supabase.rpc('exec', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error executing SQL:', error.message);
      console.log('');
      console.log('💡 Please manually run the SQL commands from database/jira_project_mapping.sql in your Supabase dashboard:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and paste the contents of database/jira_project_mapping.sql');
      console.log('   4. Click "Run"');
      return;
    }
    
    console.log('✅ JIRA Project Mapping table created successfully!');
    console.log('');
    console.log('📋 Table created: jira_project_mappings');
    console.log('🔗 Features enabled:');
    console.log('   - Map dashboard projects to multiple JIRA projects');
    console.log('   - Row Level Security (RLS) policies');
    console.log('   - Automatic timestamp updates');
    console.log('   - Foreign key constraints');
    console.log('');
    console.log('🚀 You can now use the Project Mapping feature in the JIRA integrations page!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('');
    console.log('💡 Please manually run the SQL commands from database/jira_project_mapping.sql in your Supabase dashboard.');
  }
}

// Run the script
createJiraProjectMappingTable();
