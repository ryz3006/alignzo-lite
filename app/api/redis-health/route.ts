import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth, getRedisMemoryInfo } from '@/lib/redis-service';

export async function GET(request: NextRequest) {
  try {
    const health = await checkRedisHealth();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      redis: health,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        redisUrl: process.env.STORAGE_REDIS_URL || process.env.STORAGE_URL ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
