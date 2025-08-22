import { supabaseClient } from './supabase-client';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface RateLimitEntry {
  id?: string;
  key: string;
  requests: number;
  reset_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}

export class RateLimitManager {
  private static instance: RateLimitManager;
  private configs: Map<string, RateLimitConfig> = new Map();

  private constructor() {
    // Initialize default configurations
    this.configs.set('default', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });

    this.configs.set('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: true,
      skipFailedRequests: false
    });

    this.configs.set('api', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      message: 'API rate limit exceeded, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });

    this.configs.set('admin', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      message: 'Admin API rate limit exceeded.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });
  }

  public static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  async checkRateLimit(
    key: string,
    configName: string = 'default'
  ): Promise<RateLimitResult> {
    try {
      const config = this.configs.get(configName) || this.configs.get('default')!;
      const now = new Date();
      
      // Get or create rate limit entry
      let entry = await this.getRateLimitEntry(key);
      
      if (!entry) {
        // Create new entry
        entry = await this.createRateLimitEntry(key, config);
        return {
          success: true,
          remaining: config.maxRequests - 1,
          resetTime: entry.reset_time
        };
      }

      // Check if window has reset
      if (new Date(entry.reset_time) <= now) {
        // Reset window
        entry = await this.resetRateLimitEntry(key, config);
        return {
          success: true,
          remaining: config.maxRequests - 1,
          resetTime: entry.reset_time
        };
      }

      // Check if limit exceeded
      if (entry.requests >= config.maxRequests) {
        const resetTime = new Date(entry.reset_time);
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
        
        return {
          success: false,
          remaining: 0,
          resetTime: entry.reset_time,
          retryAfter
        };
      }

      // Increment request count
      await this.incrementRequestCount(key);
      
      return {
        success: true,
        remaining: config.maxRequests - entry.requests - 1,
        resetTime: entry.reset_time
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, allow the request to proceed
      return {
        success: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
    }
  }

  private async getRateLimitEntry(key: string): Promise<RateLimitEntry | null> {
    try {
      const response = await supabaseClient.get('rate_limits', {
        select: '*',
        filters: { key }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return null;
      }

      return response.data[0];
    } catch (error) {
      console.error('Error getting rate limit entry:', error);
      return null;
    }
  }

  private async createRateLimitEntry(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitEntry> {
    try {
      const resetTime = new Date(Date.now() + config.windowMs);
      
      const response = await supabaseClient.insert('rate_limits', {
        key,
        requests: 1,
        reset_time: resetTime.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        throw new Error(`Failed to create rate limit entry: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error creating rate limit entry:', error);
      throw error;
    }
  }

  private async resetRateLimitEntry(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitEntry> {
    try {
      const resetTime = new Date(Date.now() + config.windowMs);
      
      const response = await supabaseClient.update('rate_limits', key, {
        requests: 1,
        reset_time: resetTime.toISOString(),
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        throw new Error(`Failed to reset rate limit entry: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error resetting rate limit entry:', error);
      throw error;
    }
  }

  private async incrementRequestCount(key: string): Promise<void> {
    try {
      const response = await supabaseClient.update('rate_limits', key, {
        requests: { increment: 1 },
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error incrementing request count:', response.error);
      }
    } catch (error) {
      console.error('Error incrementing request count:', error);
    }
  }

  async getRateLimitInfo(key: string): Promise<RateLimitEntry | null> {
    return await this.getRateLimitEntry(key);
  }

  async resetRateLimit(key: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('rate_limits', key);
      return !response.error;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  async updateConfig(
    configName: string,
    config: Partial<RateLimitConfig>
  ): Promise<void> {
    const existingConfig = this.configs.get(configName);
    if (existingConfig) {
      this.configs.set(configName, { ...existingConfig, ...config });
    }
  }

  async getConfig(configName: string): Promise<RateLimitConfig | undefined> {
    return this.configs.get(configName);
  }

  async getAllConfigs(): Promise<Map<string, RateLimitConfig>> {
    return new Map(this.configs);
  }

  async cleanupExpiredEntries(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('rate_limits', {
        select: 'id',
        filters: {
          reset_time: { lt: now.toISOString() }
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const entry of response.data) {
        if (await this.resetRateLimit(entry.id)) {
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired rate limit entries:', error);
      return 0;
    }
  }
}

// Global rate limit manager instance
export const rateLimitManager = RateLimitManager.getInstance();

// Predefined rate limit configurations
export const authLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later.',
  statusCode: 429,
  skipSuccessfulRequests: true,
  skipFailedRequests: false
};

export const apiLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'API rate limit exceeded, please try again later.',
  statusCode: 429,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

export const adminLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200,
  message: 'Admin API rate limit exceeded.',
  statusCode: 429,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

// Helper functions
export async function checkRateLimit(
  key: string,
  configName: string = 'default'
): Promise<RateLimitResult> {
  return await rateLimitManager.checkRateLimit(key, configName);
}

export async function getRateLimitInfo(key: string): Promise<RateLimitEntry | null> {
  return await rateLimitManager.getRateLimitInfo(key);
}

export async function resetRateLimit(key: string): Promise<boolean> {
  return await rateLimitManager.resetRateLimit(key);
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  return await rateLimitManager.cleanupExpiredEntries();
}
