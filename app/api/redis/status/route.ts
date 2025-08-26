import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth, getRedisMemoryInfo } from '@/lib/redis-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API: Redis status check requested');
    
    // Check Redis health
    const healthStatus = await checkRedisHealth();
    
    // Get memory info if Redis is healthy
    let memoryInfo = null;
    if (healthStatus.status === 'healthy') {
      memoryInfo = await getRedisMemoryInfo();
    }
    
    const response = {
      health: healthStatus,
      memory: memoryInfo,
      timestamp: new Date().toISOString()
    };
    
    console.log('🟢 API: Redis status check completed:', response);
    
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('🔴 API: Redis status check failed:', error);
    
    return NextResponse.json({
      health: { status: 'error', message: 'Failed to check Redis status' },
      memory: null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
