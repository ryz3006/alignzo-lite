import { NextRequest, NextResponse } from 'next/server';
import { testEmailNotifications } from '@/lib/kanban-notifications';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email notification system...');
    
    const result = await testEmailNotifications();
    
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email notification system test passed' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Email notification system test failed' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error testing email notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test email notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
