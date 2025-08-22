import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Update the security alert to mark it as acknowledged
    const response = await supabaseClient.update('security_alerts', id, {
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (response.error) {
      console.error('Error acknowledging security alert:', response.error);
      return NextResponse.json(
        { error: 'Failed to acknowledge security alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Security alert acknowledged successfully',
      alert: response.data
    });

  } catch (error) {
    console.error('Error acknowledging security alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
