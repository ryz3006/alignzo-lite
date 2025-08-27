import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';

    await googleDriveService.initialize();
    const result = await googleDriveService.listFiles(folderId);

    return NextResponse.json({
      success: true,
      folders: result.folders,
      files: result.files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to list files' 
    }, { status: 500 });
  }
}
