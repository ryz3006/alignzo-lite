import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID parameter is required' }, { status: 400 });
    }

    const response = await supabaseClient.query({
      table: 'project_subcategories',
      action: 'select',
      select: '*,project_categories(name)',
      filters: { 'project_categories.project_id': projectId },
      order: { column: 'sort_order', ascending: true }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return NextResponse.json({ subcategories: response.data || [] });
  } catch (error) {
    console.error('Error fetching project subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project subcategories' },
      { status: 500 }
    );
  }
}
