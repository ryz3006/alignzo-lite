import { NextRequest, NextResponse } from 'next/server';
import { getUserProjectsWithCache } from '@/lib/kanban-api-enhanced';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email parameter is required' },
        { status: 400 }
      );
    }

    const projects = await getUserProjectsWithCache(userEmail);
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching user projects with cache:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user projects' },
      { status: 500 }
    );
  }
}
