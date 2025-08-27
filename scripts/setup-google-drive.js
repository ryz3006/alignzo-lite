const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupGoogleDriveTables() {
  try {
    console.log('Setting up Google Drive database tables...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-google-drive-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('Error executing SQL:', error);
      
      // Fallback: Execute SQL statements individually
      console.log('Trying to execute SQL statements individually...');
      
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
            console.error('Statement:', statement);
          } else {
            console.log('✓ Executed statement successfully');
          }
        } catch (err) {
          console.error('Error executing statement:', err);
        }
      }
    } else {
      console.log('✓ Google Drive tables created successfully');
    }

    console.log('Google Drive database setup completed!');
  } catch (error) {
    console.error('Error setting up Google Drive tables:', error);
    process.exit(1);
  }
}

setupGoogleDriveTables();
