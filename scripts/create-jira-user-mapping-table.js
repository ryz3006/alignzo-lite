const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createJiraUserMappingTable() {
  try {
    console.log('Creating JIRA user mapping table...');

    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../database/jira_user_mapping.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error creating table:', error);
      return;
    }

    console.log('✅ JIRA user mapping table created successfully!');
    console.log('Table: jira_user_mappings');
    console.log('Columns:');
    console.log('  - id (UUID, Primary Key)');
    console.log('  - user_email (VARCHAR)');
    console.log('  - jira_assignee_name (VARCHAR)');
    console.log('  - jira_reporter_name (VARCHAR, Optional)');
    console.log('  - jira_project_key (VARCHAR, Optional)');
    console.log('  - integration_user_email (VARCHAR)');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)');

  } catch (error) {
    console.error('Error:', error);
  }
}

createJiraUserMappingTable();
