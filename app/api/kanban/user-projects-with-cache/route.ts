import { NextRequest, NextResponse } from 'next/server';
import { getUserAccessibleProjects } from '@/lib/kanban-api';

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

    const response = await getUserAccessibleProjects(userEmail);
    
    if (response.success) {
      return NextResponse.json(response.data);
    } else {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch user projects' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching user projects with cache:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user projects' },
      { status: 500 }
    );
  }
}
