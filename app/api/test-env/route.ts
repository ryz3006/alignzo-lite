import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not Set',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not Set',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set',
      firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not Set',
      adminEmail: process.env.ADMIN_EMAIL ? 'Set' : 'Not Set',
      nodeEnv: process.env.NODE_ENV || 'Not Set'
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment variables check completed'
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check environment variables'
    }, { status: 500 });
  }
}
