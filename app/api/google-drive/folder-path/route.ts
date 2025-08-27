import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';

    await googleDriveService.initialize();
    const result = await googleDriveService.getFolderPath(folderId);

    return NextResponse.json({
      success: true,
      breadcrumbs: result.breadcrumbs
    });
  } catch (error) {
    console.error('Error getting folder path:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get folder path' 
    }, { status: 500 });
  }
}
