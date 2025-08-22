import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check Firebase environment variables
    const firebaseVars = {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Check admin environment variables
    const adminVars = {
      email: !!process.env.ADMIN_EMAIL,
      passwordHash: !!process.env.ADMIN_PASSWORD_HASH,
    };

    // Check Supabase environment variables
    const supabaseVars = {
      url: !!process.env.SUPABASE_URL,
      anonKey: !!process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Check if all required variables are present
    const allFirebaseVarsSet = Object.values(firebaseVars).every(Boolean);
    const allAdminVarsSet = Object.values(adminVars).every(Boolean);
    const allSupabaseVarsSet = Object.values(supabaseVars).every(Boolean);

    return NextResponse.json({
      status: 'success',
      message: 'Environment variables check completed',
      firebase: {
        configured: allFirebaseVarsSet,
        variables: firebaseVars,
        missing: Object.entries(firebaseVars)
          .filter(([_, value]) => !value)
          .map(([key, _]) => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`)
      },
      admin: {
        configured: allAdminVarsSet,
        variables: adminVars,
        missing: Object.entries(adminVars)
          .filter(([_, value]) => !value)
          .map(([key, _]) => key === 'email' ? 'ADMIN_EMAIL' : 'ADMIN_PASSWORD_HASH')
      },
      supabase: {
        configured: allSupabaseVarsSet,
        variables: supabaseVars,
        missing: Object.entries(supabaseVars)
          .filter(([_, value]) => !value)
          .map(([key, _]) => `SUPABASE_${key.toUpperCase()}`)
      },
      summary: {
        firebaseReady: allFirebaseVarsSet,
        adminReady: allAdminVarsSet,
        supabaseReady: allSupabaseVarsSet,
        allReady: allFirebaseVarsSet && allAdminVarsSet && allSupabaseVarsSet
      }
    });

  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to check environment variables',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
