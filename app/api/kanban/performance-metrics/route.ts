// =====================================================
// PERFORMANCE METRICS API ENDPOINT
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { supabaseClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      timestamp, 
      metrics, 
      project_id, 
      user_email 
    } = body;

    // Validate required fields
    if (!timestamp || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: timestamp and metrics' },
        { status: 400 }
      );
    }

    // Insert performance metrics into database
    const metricsToInsert = Object.entries(metrics).map(([operation, metric]: [string, any]) => ({
      operation,
      duration_ms: Math.round(metric.average),
      project_id: project_id || null,
      user_email: user_email || null,
      timestamp: new Date(timestamp).toISOString(),
      metadata: {
        min_duration_ms: Math.round(metric.min),
        max_duration_ms: Math.round(metric.max),
        total_calls: metric.count,
        average_duration_ms: Math.round(metric.average)
      }
    }));

    // Insert metrics in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < metricsToInsert.length; i += batchSize) {
      const batch = metricsToInsert.slice(i, i + batchSize);
      
      const { error } = await supabaseClient.query({
        table: 'kanban_performance_metrics',
        action: 'insert',
        data: batch
      });
      
      if (error) {
        console.error('Error inserting performance metrics batch:', error);
        // Continue with other batches even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Inserted ${metricsToInsert.length} performance metrics` 
    });

  } catch (error) {
    console.error('Error processing performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '7');
    const operation = searchParams.get('operation');

    const filters: Record<string, any> = {};
    if (projectId) {
      filters.project_id = projectId;
    }
    if (operation) {
      filters.operation = operation;
    }
    
    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    filters.timestamp_gte = cutoffDate.toISOString();

    const { data, error } = await supabaseClient.query({
      table: 'kanban_performance_metrics',
      action: 'select',
      filters,
      order: { column: 'timestamp', ascending: false }
    });

    if (error) {
      console.error('Error fetching performance metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch performance metrics' },
        { status: 500 }
      );
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = data.reduce((acc: any, metric: any) => {
      const op = metric.operation;
      if (!acc[op]) {
        acc[op] = {
          total_calls: 0,
          total_duration: 0,
          min_duration: Infinity,
          max_duration: 0,
          slow_calls: 0
        };
      }

      acc[op].total_calls += 1;
      acc[op].total_duration += metric.duration_ms;
      acc[op].min_duration = Math.min(acc[op].min_duration, metric.duration_ms);
      acc[op].max_duration = Math.max(acc[op].max_duration, metric.duration_ms);
      
      if (metric.duration_ms > 1000) {
        acc[op].slow_calls += 1;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.keys(aggregatedMetrics).forEach(op => {
      const metric = aggregatedMetrics[op];
      metric.average_duration = metric.total_calls > 0 
        ? Math.round(metric.total_duration / metric.total_calls) 
        : 0;
      metric.min_duration = metric.min_duration === Infinity ? 0 : metric.min_duration;
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: data,
        aggregated: aggregatedMetrics,
        summary: {
          total_operations: Object.keys(aggregatedMetrics).length,
          total_calls: Object.values(aggregatedMetrics).reduce((sum: number, m: any) => sum + m.total_calls, 0),
          slow_operations: Object.values(aggregatedMetrics).filter((m: any) => m.average_duration > 1000).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
