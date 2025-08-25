import { NextRequest, NextResponse } from 'next/server';
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
    const userEmail = searchParams.get('userEmail');
    const projectId = searchParams.get('projectId');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('timers')
      .select('*')
      .order('created_at', { ascending: false });

    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching timers:', error);
      return NextResponse.json({ error: 'Failed to fetch timers' }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Error in timers GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
