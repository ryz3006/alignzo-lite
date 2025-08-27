import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all security alerts
    const response = await supabaseClient.get('security_alerts', {
      select: '*',
      order: { column: 'id', ascending: false }
    });

    if (response.error) {
      console.error('Error fetching security alerts:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch security alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alerts: response.data || []
    });

  } catch (error) {
    console.error('Error in security alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
