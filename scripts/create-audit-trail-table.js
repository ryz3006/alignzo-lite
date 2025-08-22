const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAuditTrailTable() {
  try {
    console.log('🔍 Checking if audit_trail table exists...');
    
    // Try to query the audit_trail table
    const { data, error } = await supabase
      .from('audit_trail')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('❌ Audit trail table does not exist or is not accessible');
      console.log('Error:', error.message);
      
      console.log('📝 Creating audit_trail table...');
      
      // Create the audit_trail table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS audit_trail (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          table_name VARCHAR(100),
          record_id VARCHAR(255),
          old_values JSONB,
          new_values JSONB,
          ip_address VARCHAR(45) NOT NULL,
          user_agent TEXT,
          endpoint TEXT NOT NULL,
          method VARCHAR(10) NOT NULL,
          success BOOLEAN NOT NULL DEFAULT true,
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('❌ Failed to create audit_trail table:', createError);
        return;
      }
      
      console.log('✅ Audit trail table created successfully');
      
      // Create indexes
      console.log('📝 Creating indexes...');
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_audit_trail_user_email ON audit_trail(user_email);
        CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
        CREATE INDEX IF NOT EXISTS idx_audit_trail_table_name ON audit_trail(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_trail_ip_address ON audit_trail(ip_address);
      `;
      
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
      
      if (indexError) {
        console.error('❌ Failed to create indexes:', indexError);
      } else {
        console.log('✅ Indexes created successfully');
      }
      
    } else {
      console.log('✅ Audit trail table exists and is accessible');
      console.log('📊 Current record count:', data[0]?.count || 0);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAuditTrailTable();
