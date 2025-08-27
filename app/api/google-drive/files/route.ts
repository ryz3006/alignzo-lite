import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [API] Google Drive files request received');
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';
    console.log(`📁 [API] Requesting files for folder: ${folderId}`);

    console.log('🔧 [API] Initializing Google Drive service...');
    await googleDriveService.initialize();
    console.log('✅ [API] Google Drive service initialized');

    console.log('📋 [API] Listing files...');
    const result = await googleDriveService.listFiles(folderId);
    console.log(`✅ [API] Successfully retrieved ${result.folders.length} folders and ${result.files.length} files`);

    return NextResponse.json({
      success: true,
      folders: result.folders,
      files: result.files
    });
  } catch (error) {
    console.error('❌ [API] Error listing files:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
