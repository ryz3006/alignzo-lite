import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/alignzo/google-drive?error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/alignzo/google-drive?error=no_code`);
    }

    await googleDriveService.initialize();
    await googleDriveService.handleAuthCallback(code);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/alignzo/google-drive?success=true`);
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/alignzo/google-drive?error=auth_failed`);
  }
}
