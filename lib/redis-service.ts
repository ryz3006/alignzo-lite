import { createClient, RedisClientType } from 'redis';
import { NextResponse } from 'next/server';

// Redis client instance
let redisClient: RedisClientType | null = null;

// Cache configuration
export const CACHE_TTL = {
  KANBAN_BOARD: 300, // 5 minutes
  PROJECT_CATEGORIES: 600, // 10 minutes
  USER_TEAMS: 900, // 15 minutes
  TASK_DETAILS: 180, // 3 minutes
  COLUMN_DATA: 300, // 5 minutes
};

// Key prefixes for organization
export const KEY_PREFIXES = {
  KANBAN_BOARD: 'kanban:board',
  PROJECT_CATEGORIES: 'kanban:categories',
  USER_TEAMS: 'kanban:teams',
  TASK_DETAILS: 'kanban:task',
  COLUMN_DATA: 'kanban:column',
  USER_SESSION: 'kanban:session',
};

// Initialize Redis client
export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Check for both environment variables
    const redisUrl = process.env.STORAGE_REDIS_URL || process.env.STORAGE_URL;
    
    if (!redisUrl) {
      throw new Error('Redis URL not configured');
    }
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
      },
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('🔴 Redis Error:', err);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      // Connection established
    });

    redisClient.on('ready', () => {
      // Ready to accept commands
    });

    redisClient.on('end', () => {
      redisClient = null;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    redisClient = null;
    throw error;
  }
}

// Get Redis client (with initialization)
export async function getRedisClient(): Promise<RedisClientType | null> {
  try {
    if (!redisClient) {
      return await initializeRedis();
    }
    return redisClient;
  } catch (error) {
    return null;
  }
}

// Generate cache keys
export function generateCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

// Intelligent data compression for Redis storage
export function compressData(data: any): string {
  try {
    // Remove unnecessary fields to save space
    const compressed = JSON.stringify(data, (key, value) => {
      // Skip null/undefined values
      if (value === null || value === undefined) return undefined;
      // Skip empty strings
      if (value === '') return undefined;
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) return undefined;
      // Skip empty objects
      if (typeof value === 'object' && Object.keys(value).length === 0) return undefined;
      return value;
    });
    
    return compressed;
  } catch (error) {
    return JSON.stringify(data);
  }
}

// Decompress data
export function decompressData<T>(compressedData: string): T | null {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    return null;
  }
}

// Set data in Redis with intelligent TTL
export async function setCacheData(
  key: string, 
  data: any, 
  ttl: number = CACHE_TTL.KANBAN_BOARD
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false;
    }

    const compressedData = compressData(data);
    
    await client.setEx(key, ttl, compressedData);
    return true;
  } catch (error) {
    return false;
  }
}

// Get data from Redis
export async function getCacheData<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return decompressData<T>(data);
  } catch (error) {
    return null;
  }
}

// Delete cache data
export async function deleteCacheData(key: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false;
    }
    await client.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

// Pattern-based cache invalidation
export async function invalidateCachePattern(pattern: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false;
    }

    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Get Redis memory usage info
export async function getRedisMemoryInfo(): Promise<any> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return { error: 'Redis unavailable' };
    }

    const info = await client.info('memory');
    const lines = info.split('\r\n');
    const memoryInfo: any = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryInfo[key] = value;
      }
    });

    return memoryInfo;
  } catch (error) {
    return { error: 'Failed to get memory info' };
  }
}

// Flush Redis data (use with caution)
export async function flushRedisData(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return false;
    }

    await client.flushAll();
    return true;
  } catch (error) {
    return false;
  }
}

// Close Redis connection
export async function closeRedisConnection(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      // Connection closed
    }
  } catch (error) {
    // Handle error silently
  }
}

// Health check for Redis
export async function checkRedisHealth(): Promise<{ status: string; message: string }> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: 'error', message: 'Redis unavailable' };
    }

    await client.ping();
    return { status: 'healthy', message: 'Redis is working properly' };
  } catch (error) {
    return { status: 'error', message: `Redis health check failed: ${error}` };
  }
}
