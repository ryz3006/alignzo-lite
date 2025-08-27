import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, userEmail, action, details } = body;

    if (!taskId || !userEmail || !action) {
      return NextResponse.json(
        { success: false, error: 'Task ID, user email, and action are required' },
        { status: 400 }
      );
    }

    console.log('=== DEBUG TIMELINE CREATION ===');
    console.log('Task ID:', taskId);
    console.log('User Email:', userEmail);
    console.log('Action:', action);
    console.log('Details:', details);
    console.log('Service Role Key Available:', !!supabaseServiceKey);

    // Create both clients
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

    // Try to create timeline entry with admin client
    console.log('Attempting to create timeline entry with admin client...');
    const insertResult = await supabaseAdmin
      .from('task_timeline')
      .insert({
        task_id: taskId,
        user_email: userEmail,
        action: action,
        details: details
      })
      .select();

    console.log('Insert result:', insertResult);

    if (insertResult.error) {
      console.error('Insert error:', insertResult.error);
      return NextResponse.json(
        { success: false, error: insertResult.error.message },
        { status: 500 }
      );
    }

    console.log('Timeline entry created successfully:', insertResult.data);

    // Now try to retrieve it with admin client
    console.log('Attempting to retrieve timeline entries with admin client...');
    const selectResult = await supabaseAdmin
      .from('task_timeline')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    console.log('Select result:', selectResult);

    // Also try with regular client
    console.log('Attempting to retrieve timeline entries with regular client...');
    const selectResultRegular = await supabase
      .from('task_timeline')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    console.log('Select result (regular client):', selectResultRegular);

    return NextResponse.json({
      success: true,
      insertResult: insertResult.data,
      selectResult: selectResult.data,
      selectResultRegular: selectResultRegular.data,
      serviceRoleAvailable: !!supabaseServiceKey
    });

  } catch (error) {
    console.error('Debug timeline error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log('=== DEBUG TIMELINE RETRIEVAL ===');
    console.log('Task ID:', taskId);
    console.log('Service Role Key Available:', !!supabaseServiceKey);

    // Create both clients
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

    // Try to retrieve with admin client
    console.log('Attempting to retrieve timeline entries with admin client...');
    const adminResult = await supabaseAdmin
      .from('task_timeline')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    console.log('Admin client result:', adminResult);

    // Try to retrieve with regular client
    console.log('Attempting to retrieve timeline entries with regular client...');
    const regularResult = await supabase
      .from('task_timeline')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    console.log('Regular client result:', regularResult);

    return NextResponse.json({
      success: true,
      adminResult: adminResult.data,
      regularResult: regularResult.data,
      serviceRoleAvailable: !!supabaseServiceKey
    });

  } catch (error) {
    console.error('Debug timeline retrieval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
