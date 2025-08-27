import { NextRequest, NextResponse } from 'next/server';
import { getProjectCategoriesWithRedis } from '@/lib/kanban-api-redis';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const result = await getProjectCategoriesWithRedis(projectId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching project categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project categories' },
      { status: 500 }
    );
  }
}
