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
              // Convert Date objects to ISO strings
              let processedValue = value;
              if (value instanceof Date) {
                processedValue = value.toISOString();
              } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Handle nested objects with Date values
                processedValue = {} as Record<string, any>;
                Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                  (processedValue as Record<string, any>)[nestedKey] = nestedValue instanceof Date ? nestedValue.toISOString() : nestedValue;
                });
              }
              
              // Handle complex filter operators
              if (key.endsWith('_gte')) {
                const column = key.replace('_gte', '');
                query = query.gte(column, processedValue);
              } else if (key.endsWith('_lte')) {
                const column = key.replace('_lte', '');
                query = query.lte(column, processedValue);
              } else if (key.endsWith('_gt')) {
                const column = key.replace('_gt', '');
                query = query.gt(column, processedValue);
              } else if (key.endsWith('_lt')) {
                const column = key.replace('_lt', '');
                query = query.lt(column, processedValue);
              } else if (key.endsWith('_neq')) {
                const column = key.replace('_neq', '');
                query = query.neq(column, processedValue);
              } else if (key.endsWith('_like')) {
                const column = key.replace('_like', '');
                query = query.like(column, String(processedValue));
              } else if (key.endsWith('_ilike')) {
                const column = key.replace('_ilike', '');
                query = query.ilike(column, String(processedValue));
              } else if (key.endsWith('_in')) {
                const column = key.replace('_in', '');
                query = query.in(column, Array.isArray(processedValue) ? processedValue : [processedValue]);
              } else if (Array.isArray(processedValue)) {
                query = query.in(key, processedValue);
              } else if (typeof processedValue === 'object' && processedValue !== null) {
                // Handle complex filter objects like { gte: '2024-01-01' }
                Object.entries(processedValue).forEach(([operator, operatorValue]) => {
                  // Process nested Date objects
                  const finalValue = operatorValue instanceof Date ? operatorValue.toISOString() : operatorValue;
                  switch (operator) {
                    case 'gte':
                      query = query.gte(key, finalValue);
                      break;
                    case 'lte':
                      query = query.lte(key, finalValue);
                      break;
                    case 'gt':
                      query = query.gt(key, finalValue);
                      break;
                    case 'lt':
                      query = query.lt(key, finalValue);
                      break;
                    case 'neq':
                      query = query.neq(key, finalValue);
                      break;
                    case 'like':
                      query = query.like(key, String(finalValue));
                      break;
                    case 'ilike':
                      query = query.ilike(key, String(finalValue));
                      break;
                    case 'in':
                      query = query.in(key, Array.isArray(finalValue) ? finalValue : [finalValue]);
                      break;
                    case 'eq':
                    default:
                      query = query.eq(key, finalValue);
                      break;
                  }
                });
              } else {
                query = query.eq(key, processedValue);
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
