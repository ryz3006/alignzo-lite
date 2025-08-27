import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  console.error('   Please configure these variables in your Vercel deployment.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// POST - Save work log category selections
export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please configure them in your Vercel deployment.',
          code: 'SUPABASE_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { work_log_id, category_selections } = body;

    if (!work_log_id || !category_selections || !Array.isArray(category_selections)) {
      return NextResponse.json({ 
        error: 'Work log ID and category selections array are required' 
      }, { status: 400 });
    }

    // Delete existing selections for this work log
    const { error: deleteError } = await supabase
      .from('work_log_category_selections')
      .delete()
      .eq('work_log_id', work_log_id);

    if (deleteError) {
      console.error('Error deleting existing category selections:', deleteError);
      return NextResponse.json({ error: 'Failed to update category selections' }, { status: 500 });
    }

    // Insert new selections
    const selectionsToInsert = category_selections.map((selection: any) => ({
      work_log_id,
      category_id: selection.category_id,
      subcategory_id: selection.subcategory_id || null,
      selected_option_id: selection.selected_option_id || null,
      selected_suboption_id: selection.selected_suboption_id || null
    }));

    const { data, error } = await supabase
      .from('work_log_category_selections')
      .insert(selectionsToInsert)
      .select();

    if (error) {
      console.error('Error saving category selections:', error);
      return NextResponse.json({ error: 'Failed to save category selections' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in work log category selections POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get work log category selections
export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please configure them in your Vercel deployment.',
          code: 'SUPABASE_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workLogId = searchParams.get('workLogId');

    if (!workLogId) {
      return NextResponse.json({ error: 'Work log ID is required' }, { status: 400 });
    }

    // Get category selections using the RPC function
    const { data, error } = await supabase
      .rpc('get_work_log_category_selections', { work_log_uuid: workLogId });

    if (error) {
      console.error('Error fetching work log category selections:', error);
      return NextResponse.json({ error: 'Failed to fetch category selections' }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Error in work log category selections GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
