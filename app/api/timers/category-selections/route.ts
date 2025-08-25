import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Save category selections for a timer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timer_id, category_selections } = body;

    if (!timer_id) {
      return NextResponse.json({ error: 'Timer ID is required' }, { status: 400 });
    }

    if (!category_selections || !Array.isArray(category_selections)) {
      return NextResponse.json({ error: 'Category selections array is required' }, { status: 400 });
    }

    // Insert category selections
    const selectionsToInsert = category_selections.map((selection: any) => ({
      timer_id,
      category_id: selection.category_id,
      subcategory_id: selection.subcategory_id || null,
      selected_option_id: selection.selected_option_id,
      selected_suboption_id: selection.selected_suboption_id || null
    }));

    const { data, error } = await supabase
      .from('timer_category_selections')
      .insert(selectionsToInsert)
      .select();

    if (error) {
      console.error('Error saving timer category selections:', error);
      return NextResponse.json({ error: 'Failed to save category selections' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in timer category selections POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get category selections for a timer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timerId = searchParams.get('timerId');

    if (!timerId) {
      return NextResponse.json({ error: 'Timer ID is required' }, { status: 400 });
    }

    // Use the database function to get category selections
    const { data, error } = await supabase
      .rpc('get_timer_category_selections', { timer_uuid: timerId });

    if (error) {
      console.error('Error fetching timer category selections:', error);
      return NextResponse.json({ error: 'Failed to fetch category selections' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in timer category selections GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
