import { getRedisClient, setCacheData, getCacheData, deleteCacheData } from './redis-service';

export interface CacheConfig {
  ttl: number;
  priority: 'high' | 'medium' | 'low';
  maxSize?: number; // in MB
}

export class CacheStrategy {
  private static instance: CacheStrategy;
  private configs: Map<string, CacheConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  static getInstance(): CacheStrategy {
    if (!CacheStrategy.instance) {
      CacheStrategy.instance = new CacheStrategy();
    }
    return CacheStrategy.instance;
  }

  private initializeDefaultConfigs() {
    // High priority - longer TTL, survives eviction longer
    this.configs.set('kanban', { ttl: 300, priority: 'high' });
    this.configs.set('user', { ttl: 1800, priority: 'high' });
    this.configs.set('project', { ttl: 600, priority: 'medium' });
    this.configs.set('analytics', { ttl: 60, priority: 'low' });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await getCacheData<T>(key);
      return value;
    } catch (error) {
      console.warn(`Cache get failed for ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, category: string = 'default'): Promise<boolean> {
    try {
      const config = this.configs.get(category) || { ttl: 300, priority: 'medium' };
      
      // Add priority prefix for eviction strategy
      const priorityKey = `${config.priority}:${key}`;
      
      return await setCacheData(priorityKey, value, config.ttl);
    } catch (error) {
      console.warn(`Cache set failed for ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Delete all priority variants
      const priorities = ['high', 'medium', 'low'];
      for (const priority of priorities) {
        await deleteCacheData(`${priority}:${key}`);
      }
      return true;
    } catch (error) {
      console.warn(`Cache delete failed for ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // This would require Redis SCAN command implementation
      // For now, we'll use a simple approach
      console.log(`Cache invalidation requested for pattern: ${pattern}`);
    } catch (error) {
      console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
    }
  }
}

export const cacheStrategy = CacheStrategy.getInstance();
