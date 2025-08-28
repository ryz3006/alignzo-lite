import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

    console.log('🔍 Testing RPC functions in deployed environment for project:', projectId);

    // Test the first RPC function
    console.log('📋 Testing get_project_categories_with_options_api...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_project_categories_with_options_api', { 
        project_uuid: projectId 
      });

    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
      return NextResponse.json({ 
        error: 'RPC function failed',
        details: rpcError.message
      }, { status: 500 });
    }

    console.log(`✅ RPC function result: ${rpcData?.length || 0} categories`);

    // Test the second RPC function
    console.log('📋 Testing get_project_categories_direct...');
    const { data: directData, error: directError } = await supabase
      .rpc('get_project_categories_direct', { 
        project_uuid: projectId 
      });

    if (directError) {
      console.error('❌ Direct RPC function error:', directError);
    } else {
      console.log(`✅ Direct RPC function result: ${directData?.length || 0} categories`);
    }

    return NextResponse.json({
      success: true,
      projectId,
      rpcFunction: {
        success: !rpcError,
        categoriesCount: rpcData?.length || 0,
        categories: rpcData || [],
        error: rpcError?.message
      },
      directFunction: {
        success: !directError,
        categoriesCount: directData?.length || 0,
        categories: directData || [],
        error: directError?.message
      }
    });

  } catch (error) {
    console.error('❌ Error testing RPC functions:', error);
    return NextResponse.json({ 
      error: 'Failed to test RPC functions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
