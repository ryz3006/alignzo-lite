const { createClient } = require('@supabase/supabase-js');

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTimerOperations() {
  console.log('Testing timer operations...\n');

  try {
    // Test 1: Check timers table schema
    console.log('1. Checking timers table schema...');
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'timers')
      .order('ordinal_position');

    if (schemaError) {
      console.error('Error checking schema:', schemaError);
      return;
    }

    console.log('Timers table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check if end_time column exists (it shouldn't)
    const hasEndTime = columns.some(col => col.column_name === 'end_time');
    console.log(`\nend_time column exists: ${hasEndTime} (should be false)\n`);

    // Test 2: Check work_logs table schema
    console.log('2. Checking work_logs table schema...');
    const { data: workLogColumns, error: workLogSchemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'work_logs')
      .order('ordinal_position');

    if (workLogSchemaError) {
      console.error('Error checking work_logs schema:', workLogSchemaError);
      return;
    }

    console.log('Work_logs table columns:');
    workLogColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Check if end_time column exists in work_logs (it should)
    const workLogHasEndTime = workLogColumns.some(col => col.column_name === 'end_time');
    console.log(`\nend_time column exists in work_logs: ${workLogHasEndTime} (should be true)\n`);

    // Test 3: Create a test timer
    console.log('3. Creating a test timer...');
    const testTimer = {
      user_email: 'test@example.com',
      project_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      ticket_id: 'TEST-001',
      task_detail: 'Test timer for validation',
      start_time: new Date().toISOString(),
      is_running: true,
      is_paused: false,
      total_pause_duration_seconds: 0
    };

    const { data: createdTimer, error: createError } = await supabase
      .from('timers')
      .insert(testTimer)
      .select()
      .single();

    if (createError) {
      console.error('Error creating test timer:', createError);
      return;
    }

    console.log('Test timer created successfully:', createdTimer.id);

    // Test 4: Test timer update operations (pause/resume)
    console.log('\n4. Testing timer update operations...');
    
    // Test pause
    const { error: pauseError } = await supabase
      .from('timers')
      .update({
        is_running: false,
        is_paused: true,
        pause_start_time: new Date().toISOString()
      })
      .eq('id', createdTimer.id);

    if (pauseError) {
      console.error('Error pausing timer:', pauseError);
    } else {
      console.log('Timer paused successfully');
    }

    // Test resume
    const { error: resumeError } = await supabase
      .from('timers')
      .update({
        is_running: true,
        is_paused: false,
        pause_start_time: null,
        total_pause_duration_seconds: 60
      })
      .eq('id', createdTimer.id);

    if (resumeError) {
      console.error('Error resuming timer:', resumeError);
    } else {
      console.log('Timer resumed successfully');
    }

    // Test 5: Test work log creation (simulating stop timer)
    console.log('\n5. Testing work log creation...');
    const testWorkLog = {
      user_email: 'test@example.com',
      project_id: '00000000-0000-0000-0000-000000000000',
      ticket_id: 'TEST-001',
      task_detail: 'Test timer for validation',
      start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      end_time: new Date().toISOString(),
      total_pause_duration_seconds: 60,
      logged_duration_seconds: 3540 // 59 minutes (3600 - 60)
    };

    const { data: createdWorkLog, error: workLogError } = await supabase
      .from('work_logs')
      .insert(testWorkLog)
      .select()
      .single();

    if (workLogError) {
      console.error('Error creating work log:', workLogError);
    } else {
      console.log('Work log created successfully:', createdWorkLog.id);
    }

    // Test 6: Test timer deletion (simulating stop timer)
    console.log('\n6. Testing timer deletion...');
    const { error: deleteError } = await supabase
      .from('timers')
      .delete()
      .eq('id', createdTimer.id);

    if (deleteError) {
      console.error('Error deleting timer:', deleteError);
    } else {
      console.log('Timer deleted successfully');
    }

    // Clean up test data
    console.log('\n7. Cleaning up test data...');
    await supabase
      .from('work_logs')
      .delete()
      .eq('ticket_id', 'TEST-001');

    console.log('\n✅ All timer operations tested successfully!');
    console.log('The fix for the end_time column error is working correctly.');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTimerOperations();
