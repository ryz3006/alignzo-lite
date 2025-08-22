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

    // Update the security alert to mark it as resolved
    const response = await supabaseClient.update('security_alerts', id, {
      resolved: true,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (response.error) {
      console.error('Error resolving security alert:', response.error);
      return NextResponse.json(
        { error: 'Failed to resolve security alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Security alert resolved successfully',
      alert: response.data
    });

  } catch (error) {
    console.error('Error resolving security alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
