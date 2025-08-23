// Test script for shift loading functionality
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testShiftLoading() {
  try {
    console.log('🧪 Testing shift loading functionality...');
    
    // Test 1: Check if shift_schedules table exists and has data
    console.log('\n📊 Test 1: Checking shift_schedules table...');
    const { data: shiftCount, error: shiftError } = await supabase
      .from('shift_schedules')
      .select('*', { count: 'exact', head: true });
    
    if (shiftError) {
      console.error('❌ Error querying shift_schedules:', shiftError);
    } else {
      console.log('✅ shift_schedules table accessible');
      console.log('📈 Total shift schedules:', shiftCount?.length || 0);
    }
    
    // Test 2: Check if custom_shift_enums table exists and has data
    console.log('\n🎨 Test 2: Checking custom_shift_enums table...');
    const { data: enumCount, error: enumError } = await supabase
      .from('custom_shift_enums')
      .select('*', { count: 'exact', head: true });
    
    if (enumError) {
      console.error('❌ Error querying custom_shift_enums:', enumError);
    } else {
      console.log('✅ custom_shift_enums table accessible');
      console.log('📈 Total custom shift enums:', enumCount?.length || 0);
    }
    
    // Test 3: Check if team_members table exists and has data
    console.log('\n👥 Test 3: Checking team_members table...');
    const { data: teamCount, error: teamError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true });
    
    if (teamError) {
      console.error('❌ Error querying team_members:', teamError);
    } else {
      console.log('✅ team_members table accessible');
      console.log('📈 Total team members:', teamCount?.length || 0);
    }
    
    // Test 4: Check if users table exists and has data
    console.log('\n👤 Test 4: Checking users table...');
    const { data: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (userError) {
      console.error('❌ Error querying users:', userError);
    } else {
      console.log('✅ users table accessible');
      console.log('📈 Total users:', userCount?.length || 0);
    }
    
    // Test 5: Try to get a sample user's shift information
    console.log('\n🔍 Test 5: Testing shift query for a sample user...');
    const { data: sampleUser, error: userQueryError } = await supabase
      .from('users')
      .select('email')
      .limit(1);
    
    if (userQueryError || !sampleUser || sampleUser.length === 0) {
      console.error('❌ No users found for testing');
    } else {
      const testEmail = sampleUser[0].email;
      console.log('🧪 Testing with user email:', testEmail);
      
      // Test shift schedules query
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: shifts, error: shiftsError } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('user_email', testEmail)
        .in('shift_date', [today, tomorrow]);
      
      if (shiftsError) {
        console.error('❌ Error querying shifts for user:', shiftsError);
      } else {
        console.log('✅ Shift query successful');
        console.log('📅 Found shifts:', shifts?.length || 0);
        if (shifts && shifts.length > 0) {
          console.log('📋 Sample shift:', shifts[0]);
        }
      }
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testShiftLoading();
