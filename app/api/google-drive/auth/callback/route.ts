import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/alignzo/google-drive?error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/alignzo/google-drive?error=no_code`);
    }

    await googleDriveService.initialize();
    await googleDriveService.handleAuthCallback(code);

    return NextResponse.redirect(`${baseUrl}/alignzo/google-drive?success=true`);
  } catch (error) {
    console.error('Error handling auth callback:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    return NextResponse.redirect(`${baseUrl}/alignzo/google-drive?error=auth_failed`);
  }
}
