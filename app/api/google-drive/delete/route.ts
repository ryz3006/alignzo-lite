import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function DELETE(request: NextRequest) {
  try {
    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'File IDs array is required' 
      }, { status: 400 });
    }

    await googleDriveService.initialize();
    await googleDriveService.deleteFiles(fileIds);

    return NextResponse.json({
      success: true,
      message: 'Files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete files' 
    }, { status: 500 });
  }
}
