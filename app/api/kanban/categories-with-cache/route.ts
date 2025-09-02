export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProjectCategoriesWithCache } from '@/lib/kanban-api-enhanced';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    const data = await getProjectCategoriesWithCache(projectId);
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in categories-with-cache API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project categories' },
      { status: 500 }
    );
  }
}
