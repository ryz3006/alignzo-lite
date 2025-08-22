import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables not configured');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export async function POST(request: NextRequest) {
  try {
    const { table, action, data, filters, select, order, limit, offset, userEmail } = await request.json();

    let result;

    switch (action) {
      case 'select':
        let query = supabase.from(table).select(select || '*');
        
        // Apply filters
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                query = query.in(key, value);
              } else {
                query = query.eq(key, value);
              }
            }
          });
        }
        
        // Apply user-specific filtering for user pages
        if (userEmail && table === 'work_logs') {
          query = query.eq('user_email', userEmail);
        }
        
        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending !== false });
        }
        
        // Apply pagination
        if (limit) {
          query = query.limit(limit);
        }
        if (offset) {
          query = query.range(offset, offset + (limit || 10) - 1);
        }
        
        result = await query;
        break;

      case 'insert':
        result = await supabase.from(table).insert(data);
        break;

      case 'update':
        result = await supabase.from(table).update(data).eq('id', filters?.id);
        break;

      case 'delete':
        result = await supabase.from(table).delete().eq('id', filters?.id);
        break;

      case 'upsert':
        result = await supabase.from(table).upsert(data, { 
          onConflict: 'project_id,team_id,user_email,shift_date' 
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.error) {
      console.error('Supabase error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      count: result.count
    });

  } catch (error) {
    console.error('Supabase proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const select = searchParams.get('select') || '*';
    const order = searchParams.get('order');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!table) {
      return NextResponse.json(
        { error: 'Table parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase.from(table).select(select);

    if (order) {
      const [column, direction] = order.split('.');
      query = query.order(column, { ascending: direction !== 'desc' });
    }

    query = query.range(offset, offset + limit - 1);

    const result = await query;

    if (result.error) {
      console.error('Supabase error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      count: result.count
    });

  } catch (error) {
    console.error('Supabase proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
