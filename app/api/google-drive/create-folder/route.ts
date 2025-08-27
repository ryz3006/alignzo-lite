import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Folder name is required' 
      }, { status: 400 });
    }

    await googleDriveService.initialize();
    const result = await googleDriveService.createFolder(name, parentId || 'root');

    return NextResponse.json({
      success: true,
      folder: result
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create folder' 
    }, { status: 500 });
  }
}
