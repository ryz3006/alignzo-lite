import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth, getRedisMemoryInfo } from '@/lib/redis-service';

export async function GET(request: NextRequest) {
  try {
    const memoryInfo = await getRedisMemoryInfo();
    const health = await checkRedisHealth();
    
    // Convert memory info to the format expected by the frontend
    const usedMB = memoryInfo.used_memory ? parseInt(memoryInfo.used_memory) / 1024 / 1024 : 0;
    const maxMB = memoryInfo.maxmemory ? parseInt(memoryInfo.maxmemory) / 1024 / 1024 : 20;
    const percentage = usedMB && maxMB ? (usedMB / maxMB) * 100 : 0;
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      memory: {
        used: `${usedMB.toFixed(2)}MB`,
        max: `${maxMB.toFixed(2)}MB`,
        percentage: `${percentage.toFixed(1)}%`,
        status: usedMB > 18 ? 'warning' : 'healthy'
      },
      cache: {
        status: health.status,
        keys: memoryInfo.db0 ? parseInt(memoryInfo.db0) : 0,
        hitRate: 'N/A' // Would need to implement hit tracking
      },
      recommendations: getRecommendations({ usedMB, maxMB, percentage })
    });
  } catch (error) {
    console.error('Cache stats failed:', error);
    return NextResponse.json({
      error: 'Cache stats failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getRecommendations(memoryInfo: any): string[] {
  const recommendations = [];
  
  if (memoryInfo.percentage > 90) {
    recommendations.push('Memory usage critical - consider upgrading Redis plan');
  } else if (memoryInfo.percentage > 80) {
    recommendations.push('Memory usage high - review cache TTLs and eviction policies');
  }
  
  if (memoryInfo.usedMB > 18) {
    recommendations.push('Memory threshold exceeded - aggressive eviction active');
  }
  
  return recommendations;
}
