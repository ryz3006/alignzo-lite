import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    await googleDriveService.initialize();
    const authUrl = googleDriveService.getAuthUrl();

    return NextResponse.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate authentication URL' 
    }, { status: 500 });
  }
}
