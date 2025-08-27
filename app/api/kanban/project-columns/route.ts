import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID parameter is required' }, { status: 400 });
    }

    const response = await supabaseClient.get('kanban_columns', {
      select: '*',
      filters: { project_id: projectId },
      order: { column: 'sort_order', ascending: true }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({ columns: response.data || [] });
  } catch (error) {
    console.error('Error fetching project columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project columns' },
      { status: 500 }
    );
  }
}
