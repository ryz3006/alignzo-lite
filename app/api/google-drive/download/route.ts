import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ 
        success: false, 
        error: 'File ID is required' 
      }, { status: 400 });
    }

    await googleDriveService.initialize();
    const fileData = await googleDriveService.downloadFile(fileId);
    const fileInfo = await googleDriveService.getFileInfo(fileId);

    // Convert file data to buffer if it's not already
    const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileInfo.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileInfo.name}"`,
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to download file' 
    }, { status: 500 });
  }
}
