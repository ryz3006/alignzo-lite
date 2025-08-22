import { supabaseClient } from './supabase-client';
import crypto from 'crypto';

export interface ApiKey {
  id?: string;
  name: string;
  key_hash: string;
  user_email: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiKeyUsage {
  id?: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  response_status: number;
  response_time: number;
  ip_address?: string;
  user_agent?: string;
  used_at?: string;
}

export interface ApiKeyPolicy {
  maxKeysPerUser: number;
  keyExpirationDays: number;
  maxRequestsPerMinute: number;
  allowedEndpoints: string[];
  blockedEndpoints: string[];
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private policy: ApiKeyPolicy;

  private constructor() {
    this.policy = {
      maxKeysPerUser: parseInt(process.env.API_MAX_KEYS_PER_USER || '5'),
      keyExpirationDays: parseInt(process.env.API_KEY_EXPIRATION_DAYS || '365'),
      maxRequestsPerMinute: parseInt(process.env.API_MAX_REQUESTS_PER_MINUTE || '100'),
      allowedEndpoints: process.env.API_ALLOWED_ENDPOINTS?.split(',') || ['*'],
      blockedEndpoints: process.env.API_BLOCKED_ENDPOINTS?.split(',') || []
    };
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  async generateApiKey(
    name: string,
    userEmail: string,
    permissions: string[] = ['read'],
    expiresAt?: Date
  ): Promise<{ key: string; apiKey: ApiKey } | null> {
    try {
      // Check if user has too many active keys
      const activeKeys = await this.getUserApiKeys(userEmail);
      if (activeKeys.length >= this.policy.maxKeysPerUser) {
        throw new Error(`User already has maximum number of API keys (${this.policy.maxKeysPerUser})`);
      }

      // Generate API key
      const key = `ak_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      
      // Set expiration
      const expirationDate = expiresAt || new Date(Date.now() + this.policy.keyExpirationDays * 24 * 60 * 60 * 1000);

      // Create API key record
      const apiKey: Omit<ApiKey, 'id' | 'created_at' | 'updated_at'> = {
        name,
        key_hash: keyHash,
        user_email: userEmail,
        permissions,
        is_active: true,
        expires_at: expirationDate.toISOString()
      };

      const response = await supabaseClient.insert('api_keys', {
        ...apiKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error creating API key:', response.error);
        return null;
      }

      return {
        key,
        apiKey: response.data
      };
    } catch (error) {
      console.error('Error generating API key:', error);
      return null;
    }
  }

  async validateApiKey(key: string): Promise<{ valid: boolean; apiKey?: ApiKey; message: string }> {
    try {
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      
      const response = await supabaseClient.get('api_keys', {
        select: '*',
        filters: { key_hash: keyHash }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return {
          valid: false,
          message: 'Invalid API key'
        };
      }

      const apiKey = response.data[0];

      // Check if key is active
      if (!apiKey.is_active) {
        return {
          valid: false,
          message: 'API key is inactive'
        };
      }

      // Check if key is expired
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return {
          valid: false,
          message: 'API key has expired'
        };
      }

      // Update last used timestamp
      await this.updateApiKeyLastUsed(apiKey.id!);

      return {
        valid: true,
        apiKey,
        message: 'Valid API key'
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      return {
        valid: false,
        message: 'Error validating API key'
      };
    }
  }

  async checkApiKeyPermissions(
    key: string,
    requiredPermissions: string[]
  ): Promise<{ hasPermission: boolean; apiKey?: ApiKey; message: string }> {
    try {
      const validation = await this.validateApiKey(key);
      if (!validation.valid) {
        return {
          hasPermission: false,
          message: validation.message
        };
      }

      const apiKey = validation.apiKey!;
      
      // Check if user has required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin')
      );

      if (!hasAllPermissions) {
        return {
          hasPermission: false,
          apiKey,
          message: 'Insufficient permissions'
        };
      }

      return {
        hasPermission: true,
        apiKey,
        message: 'Permissions validated'
      };
    } catch (error) {
      console.error('Error checking API key permissions:', error);
      return {
        hasPermission: false,
        message: 'Error checking permissions'
      };
    }
  }

  async getUserApiKeys(userEmail: string): Promise<ApiKey[]> {
    try {
      const response = await supabaseClient.get('api_keys', {
        select: '*',
        filters: { user_email: userEmail },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) {
        console.error('Error getting user API keys:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting user API keys:', error);
      return [];
    }
  }

  async deactivateApiKey(keyId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('api_keys', keyId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error deactivating API key:', error);
      return false;
    }
  }

  async deleteApiKey(keyId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('api_keys', keyId);
      return !response.error;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  }

  async updateApiKeyPermissions(
    keyId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const response = await supabaseClient.update('api_keys', keyId, {
        permissions,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error updating API key permissions:', error);
      return false;
    }
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    try {
      await supabaseClient.update('api_keys', keyId, {
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating API key last used:', error);
    }
  }

  async logApiKeyUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    responseStatus: number,
    responseTime: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const usage: Omit<ApiKeyUsage, 'id' | 'used_at'> = {
        api_key_id: apiKeyId,
        endpoint,
        method,
        response_status: responseStatus,
        response_time: responseTime,
        ip_address: ipAddress,
        user_agent: userAgent
      };

      await supabaseClient.insert('api_key_usage', {
        ...usage,
        used_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging API key usage:', error);
    }
  }

  async getApiKeyUsage(
    apiKeyId: string,
    startTime?: string,
    endTime?: string,
    limit: number = 100
  ): Promise<ApiKeyUsage[]> {
    try {
      const filters: any = { api_key_id: apiKeyId };
      
      if (startTime) filters.used_at = { gte: startTime };
      if (endTime) filters.used_at = { lte: endTime };

      const response = await supabaseClient.get('api_key_usage', {
        select: '*',
        filters,
        order: { column: 'used_at', ascending: false },
        limit
      });

      if (response.error) {
        console.error('Error getting API key usage:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting API key usage:', error);
      return [];
    }
  }

  async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number; resetTime: string }> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const response = await supabaseClient.get('api_key_usage', {
        select: 'id',
        filters: {
          api_key_id: apiKeyId,
          used_at: { gte: oneMinuteAgo.toISOString() }
        }
      });

      if (response.error) {
        return {
          allowed: true,
          remaining: this.policy.maxRequestsPerMinute,
          resetTime: new Date(Date.now() + 60 * 1000).toISOString()
        };
      }

      const usageCount = response.data?.length || 0;
      const remaining = Math.max(0, this.policy.maxRequestsPerMinute - usageCount);
      const resetTime = new Date(Date.now() + 60 * 1000).toISOString();

      return {
        allowed: remaining > 0,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        allowed: true,
        remaining: this.policy.maxRequestsPerMinute,
        resetTime: new Date(Date.now() + 60 * 1000).toISOString()
      };
    }
  }

  async cleanupExpiredKeys(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('api_keys', {
        select: 'id',
        filters: {
          expires_at: { lt: now.toISOString() },
          is_active: true
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const key of response.data) {
        if (await this.deactivateApiKey(key.id)) {
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired API keys:', error);
      return 0;
    }
  }

  async cleanupOldUsageLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const response = await supabaseClient.get('api_key_usage', {
        select: 'id',
        filters: {
          used_at: { lt: cutoffDate.toISOString() }
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const usage of response.data) {
        await supabaseClient.delete('api_key_usage', usage.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old usage logs:', error);
      return 0;
    }
  }

  async getApiKeyStats(userEmail?: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    totalUsage: number;
  }> {
    try {
      const filters: any = {};
      if (userEmail) filters.user_email = userEmail;

      const keysResponse = await supabaseClient.get('api_keys', {
        select: 'id,is_active,expires_at',
        filters
      });

      if (keysResponse.error) {
        return { totalKeys: 0, activeKeys: 0, expiredKeys: 0, totalUsage: 0 };
      }

      const keys = keysResponse.data || [];
      const now = new Date();

      const stats = {
        totalKeys: keys.length,
        activeKeys: keys.filter((k: ApiKey) => k.is_active).length,
        expiredKeys: keys.filter((k: ApiKey) => k.expires_at && new Date(k.expires_at) < now).length,
        totalUsage: 0
      };

      // Get total usage count
      const usageResponse = await supabaseClient.get('api_key_usage', {
        select: 'id',
        filters: userEmail ? { 'api_keys.user_email': userEmail } : {}
      });

      if (!usageResponse.error && usageResponse.data) {
        stats.totalUsage = usageResponse.data.length;
      }

      return stats;
    } catch (error) {
      console.error('Error getting API key stats:', error);
      return { totalKeys: 0, activeKeys: 0, expiredKeys: 0, totalUsage: 0 };
    }
  }

  async getPolicy(): Promise<ApiKeyPolicy> {
    return this.policy;
  }

  async updatePolicy(newPolicy: Partial<ApiKeyPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...newPolicy };
  }
}

// Global API key manager instance
export const apiKeyManager = ApiKeyManager.getInstance();

// Helper functions
export async function generateApiKey(
  name: string,
  userEmail: string,
  permissions?: string[]
): Promise<{ key: string; apiKey: ApiKey } | null> {
  return await apiKeyManager.generateApiKey(name, userEmail, permissions);
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; apiKey?: ApiKey; message: string }> {
  return await apiKeyManager.validateApiKey(key);
}

export async function checkApiKeyPermissions(
  key: string,
  requiredPermissions: string[]
): Promise<{ hasPermission: boolean; apiKey?: ApiKey; message: string }> {
  return await apiKeyManager.checkApiKeyPermissions(key, requiredPermissions);
}

export async function getUserApiKeys(userEmail: string): Promise<ApiKey[]> {
  return await apiKeyManager.getUserApiKeys(userEmail);
}
