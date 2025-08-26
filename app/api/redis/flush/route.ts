import { NextRequest, NextResponse } from 'next/server';
import { flushRedisData } from '@/lib/redis-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API: Redis flush requested');
    
    const success = await flushRedisData();
    
    if (success) {
      console.log('🟢 API: Redis flush completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Redis data flushed successfully',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    } else {
      console.log('🔴 API: Redis flush failed');
      return NextResponse.json({
        success: false,
        message: 'Failed to flush Redis data',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('🔴 API: Redis flush error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error flushing Redis data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
