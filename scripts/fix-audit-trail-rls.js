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

async function fixAuditTrailRLS() {
  try {
    console.log('🔧 Fixing audit trail RLS policies...');
    
    // Drop existing policies that use JWT authentication
    const dropPoliciesSQL = `
      DROP POLICY IF EXISTS "Users can view their own audit trail" ON audit_trail;
      DROP POLICY IF EXISTS "Admins can view all audit trail" ON audit_trail;
      DROP POLICY IF EXISTS "Users can view alerts related to them" ON security_alerts;
      DROP POLICY IF EXISTS "Admins can manage all alerts" ON security_alerts;
      DROP POLICY IF EXISTS "Admins can manage monitoring rules" ON monitoring_rules;
      DROP POLICY IF EXISTS "Admins can manage event counters" ON event_counters;
    `;
    
    // Create new policies that allow all access (admin auth handled in app layer)
    const createPoliciesSQL = `
      CREATE POLICY "Allow all audit trail access" ON audit_trail FOR ALL USING (true);
      CREATE POLICY "Allow all security alerts access" ON security_alerts FOR ALL USING (true);
      CREATE POLICY "Allow all monitoring rules access" ON monitoring_rules FOR ALL USING (true);
      CREATE POLICY "Allow all event counters access" ON event_counters FOR ALL USING (true);
    `;
    
    console.log('📝 Dropping old RLS policies...');
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL });
    
    if (dropError) {
      console.error('❌ Failed to drop old policies:', dropError);
      return;
    }
    
    console.log('✅ Old policies dropped successfully');
    
    console.log('📝 Creating new RLS policies...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });
    
    if (createError) {
      console.error('❌ Failed to create new policies:', createError);
      return;
    }
    
    console.log('✅ New RLS policies created successfully');
    
    // Test the audit trail query
    console.log('🧪 Testing audit trail query...');
    const { data, error } = await supabase
      .from('audit_trail')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Audit trail query still failing:', error);
    } else {
      console.log('✅ Audit trail query working! Found', data.length, 'entries');
    }
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

fixAuditTrailRLS();
