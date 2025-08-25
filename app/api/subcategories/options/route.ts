import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch subcategory options for a specific subcategory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');

    if (!subcategoryId) {
      return NextResponse.json({ error: 'Subcategory ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subcategory_options')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching subcategory options:', error);
      return NextResponse.json({ error: 'Failed to fetch subcategory options' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in subcategory options GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new subcategory option
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subcategory_id, option_name, option_value, sort_order } = body;

    if (!subcategory_id || !option_name || !option_value) {
      return NextResponse.json({ 
        error: 'Subcategory ID, option name, and option value are required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subcategory_options')
      .insert({
        subcategory_id,
        option_name,
        option_value,
        sort_order: sort_order || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subcategory option:', error);
      return NextResponse.json({ error: 'Failed to create subcategory option' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in subcategory options POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update subcategory option
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, option_name, option_value, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (option_name !== undefined) updateData.option_name = option_name;
    if (option_value !== undefined) updateData.option_value = option_value;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('subcategory_options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subcategory option:', error);
      return NextResponse.json({ error: 'Failed to update subcategory option' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in subcategory options PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete subcategory option (soft delete by setting is_active to false)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Option ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subcategory_options')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting subcategory option:', error);
      return NextResponse.json({ error: 'Failed to delete subcategory option' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in subcategory options DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
