const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found!');
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const createTicketUploadTables = async () => {
  try {
    console.log('🔄 Creating ticket upload tables...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, '..', 'database', 'ticket_upload_schema.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      process.exit(1);
    }
    
    console.log('✅ Ticket upload tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - ticket_sources');
    console.log('   - ticket_upload_mappings');
    console.log('   - ticket_upload_user_mappings');
    console.log('   - uploaded_tickets');
    console.log('   - upload_sessions');
    console.log('');
    console.log('🎉 Ticket upload functionality is now ready to use!');
    
  } catch (error) {
    console.error('❌ Error creating ticket upload tables:', error);
    process.exit(1);
  }
};

createTicketUploadTables();
