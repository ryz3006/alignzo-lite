import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  console.error('   Please configure these variables in your Vercel deployment.');
}

// Create both anon and service role clients
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-key'
);

// Helper function to determine if an operation is admin-related
function isAdminOperation(table: string, action: string): boolean {
  const adminTables = [
    'project_categories',
    'project_subcategories', 
    'team_project_assignments',
    'projects',
    'teams',
    'users',
    'audit_trail',
    'security_alerts',
    'category_options',
    'subcategory_options',
    'task_timeline', // Add timeline table to admin operations
    'task_comments',  // Add comments table to admin operations
    'kanban_tasks'   // Add kanban tasks table to admin operations
  ];
  
  const adminActions = ['insert', 'update', 'delete'];
  
  return adminTables.includes(table) && adminActions.includes(action);
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== PROXY REQUEST START ===');
    
    // Check if Supabase is properly configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required. Please configure them in your Vercel deployment.',
          code: 'SUPABASE_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    
    const { table, action, data, filters, select, order, limit, offset, userEmail, functionName, params } = body;

    // Determine which client to use based on the operation
    const isAdmin = isAdminOperation(table, action);
    
    // Special handling for timeline, comments, and kanban tasks - use admin client for all operations
    const isTimelineOrComments = table === 'task_timeline' || table === 'task_comments' || table === 'kanban_tasks';
    
    console.log(`=== SUPABASE PROXY DEBUG ===`);
    console.log(`Table: ${table}`);
    console.log(`Action: ${action}`);
    console.log(`Is admin operation: ${isAdmin}`);
    console.log(`Is timeline/comments: ${isTimelineOrComments}`);
    console.log(`Service role key available: ${!!supabaseServiceKey}`);
    console.log(`Using admin client: ${(isAdmin || isTimelineOrComments) && supabaseServiceKey}`);
    
    if (isAdmin || isTimelineOrComments) {
      console.log(`Using admin client for ${action} operation on ${table}`);
      
      // For admin operations and timeline/comments, use service role key if available, otherwise use anon key
      const client = supabaseServiceKey ? supabaseAdmin : supabase;
      
      // If using service role key, we can bypass RLS entirely
      // If using anon key, we need to ensure the user context is set properly
      if (!supabaseServiceKey) {
        console.warn('Service role key not available, using anon key for admin operation');
      }
    } else {
      // For non-admin operations, use the regular anon key
      const client = supabase;
    }

    let result;

    switch (action) {
      case 'select':
        console.log(`=== SELECT OPERATION ===`);
        console.log(`Table: ${table}`);
        console.log(`Select: ${select || '*'}`);
        console.log(`Filters:`, filters);
        console.log(`Using admin client: ${(isAdmin || isTimelineOrComments) && supabaseServiceKey}`);
        console.log(`Admin client available: ${!!supabaseServiceKey}`);
        
        const selectClient = (isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase;
        console.log(`Using client:`, selectClient === supabaseAdmin ? 'admin' : 'anon');
        
        let query = selectClient.from(table).select(select || '*');
        
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
        
        // Apply user-specific filtering for user pages (only for non-admin operations)
        if (userEmail && table === 'work_logs' && !isAdmin) {
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
        
        console.log(`Select result:`, result);
        console.log(`Select success:`, !result.error);
        console.log(`Select data:`, result.data);
        console.log(`Select error:`, result.error);
        break;

      case 'insert':
        console.log(`=== INSERT OPERATION ===`);
        console.log(`Table: ${table}`);
        console.log(`Data:`, data);
        console.log(`Using admin client: ${(isAdmin || isTimelineOrComments) && supabaseServiceKey}`);
        console.log(`Admin client available: ${!!supabaseServiceKey}`);
        
        const insertClient = (isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase;
        console.log(`Using client:`, insertClient === supabaseAdmin ? 'admin' : 'anon');
        
        try {
          console.log('About to execute insert...');
          result = await insertClient.from(table).insert(data);
          console.log('Insert executed successfully');
        } catch (insertError) {
          console.error('Insert execution error:', insertError);
          throw insertError;
        }
        
        console.log(`Insert result:`, result);
        console.log(`Insert success:`, !result.error);
        console.log(`Insert data:`, result.data);
        console.log(`Insert error:`, result.error);
        break;

      case 'update':
        console.log(`=== UPDATE OPERATION ===`);
        console.log(`Table: ${table}`);
        console.log(`Data:`, data);
        console.log(`Filters:`, filters);
        console.log(`Using admin client: ${(isAdmin || isTimelineOrComments) && supabaseServiceKey}`);
        console.log(`Admin client available: ${!!supabaseServiceKey}`);
        
        const updateClient = (isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase;
        console.log(`Using client:`, updateClient === supabaseAdmin ? 'admin' : 'anon');
        
        let updateQuery = updateClient.from(table).update(data);
        
        // Apply filters for update operation
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              updateQuery = updateQuery.eq(key, value);
            }
          });
        }
        
        result = await updateQuery;
        
        console.log(`Update result:`, result);
        console.log(`Update success:`, !result.error);
        console.log(`Update data:`, result.data);
        console.log(`Update error:`, result.error);
        break;

      case 'delete':
        let deleteQuery = ((isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase).from(table).delete();
        
        // Apply filters for delete operation
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              deleteQuery = deleteQuery.eq(key, value);
            }
          });
        }
        
        result = await deleteQuery;
        break;

      case 'upsert':
        result = await ((isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase).from(table).upsert(data, { 
          onConflict: 'project_id,team_id,user_email,shift_date' 
        });
        break;

      case 'rpc':
        result = await ((isAdmin || isTimelineOrComments) && supabaseServiceKey ? supabaseAdmin : supabase).rpc(functionName, params || {});
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    console.log('=== PROXY REQUEST END ===');
    console.log('Final result:', result);
    
    if (result.error) {
      console.error('Supabase error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const response = {
      data: result.data,
      count: result.count
    };
    
    console.log('Proxy response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Supabase proxy error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
