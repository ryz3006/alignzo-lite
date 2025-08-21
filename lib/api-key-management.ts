import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from './supabase';
import { logSecurityEvent, SecurityEventType, LogLevel } from './logger';
import { auditTrail, AuditEventType } from './audit-trail';
import { monitoring } from './monitoring';
import { hashPassword, verifyPassword, generateSecurePassword } from './password';

// API key interface
export interface APIKey {
  id: string;
  name: string;
  key_hash: string;
  user_email: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
  metadata?: any;
}

// API key usage interface
export interface APIKeyUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  response_status: number;
  response_time: number;
  timestamp: string;
  metadata?: any;
}

// API key permissions
export enum APIKeyPermission {
  READ_USERS = 'read_users',
  WRITE_USERS = 'write_users',
  READ_PROJECTS = 'read_projects',
  WRITE_PROJECTS = 'write_projects',
  READ_WORKLOGS = 'read_worklogs',
  WRITE_WORKLOGS = 'write_worklogs',
  READ_INTEGRATIONS = 'read_integrations',
  WRITE_INTEGRATIONS = 'write_integrations',
  ADMIN_ACCESS = 'admin_access',
  EXPORT_DATA = 'export_data',
  IMPORT_DATA = 'import_data'
}

// API key validation schemas
export const apiKeySchemas = {
  create: z.object({
    name: z.string().min(1, 'API key name is required').max(100, 'Name too long'),
    permissions: z.array(z.nativeEnum(APIKeyPermission)).min(1, 'At least one permission required'),
    expires_at: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional()
  }),
  
  update: z.object({
    name: z.string().min(1, 'API key name is required').max(100, 'Name too long').optional(),
    permissions: z.array(z.nativeEnum(APIKeyPermission)).optional(),
    is_active: z.boolean().optional(),
    expires_at: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional()
  }),
  
  usage: z.object({
    endpoint: z.string().min(1, 'Endpoint is required'),
    method: z.string().min(1, 'Method is required'),
    response_status: z.number().int().min(100).max(599),
    response_time: z.number().positive(),
    metadata: z.record(z.any()).optional()
  })
};

// API key manager class
export class APIKeyManager {
  private readonly KEY_PREFIX = 'ak_';
  private readonly KEY_LENGTH = 32;

  // Generate a new API key
  async generateAPIKey(
    userEmail: string,
    name: string,
    permissions: APIKeyPermission[],
    createdBy: string,
    expiresAt?: string,
    metadata?: any
  ): Promise<{ apiKey: string; apiKeyRecord: APIKey }> {
    // Generate secure API key
    const apiKey = this.generateSecureAPIKey();
    const keyHash = await hashPassword(apiKey);

    // Create API key record
    const apiKeyRecord: Omit<APIKey, 'id' | 'created_at'> = {
      name,
      key_hash: keyHash,
      user_email: userEmail,
      permissions,
      is_active: true,
      expires_at: expiresAt,
      created_by: createdBy,
      metadata
    };

    const { data, error } = await supabase
      .from('api_keys')
      .insert(apiKeyRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Log API key creation
    await auditTrail.logDataAccess(
      createdBy,
      AuditEventType.CREATE,
      'api_keys',
      data.id,
      undefined,
      { ...apiKeyRecord, key_hash: '[REDACTED]' }
    );

    return {
      apiKey,
      apiKeyRecord: data
    };
  }

  // Validate API key
  async validateAPIKey(
    apiKey: string,
    requiredPermissions: APIKeyPermission[] = []
  ): Promise<{ isValid: boolean; userEmail?: string; permissions?: string[]; error?: string }> {
    try {
      // Find API key by hash
      const { data: apiKeyRecord, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error || !apiKeyRecord) {
        return { isValid: false, error: 'Invalid API key' };
      }

      // Verify API key hash
      const isValidHash = await verifyPassword(apiKey, apiKeyRecord.key_hash);
      if (!isValidHash) {
        return { isValid: false, error: 'Invalid API key' };
      }

      // Check if expired
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        return { isValid: false, error: 'API key expired' };
      }

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          apiKeyRecord.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          return { isValid: false, error: 'Insufficient permissions' };
        }
      }

      // Update last used timestamp
      await this.updateLastUsed(apiKeyRecord.id);

      return {
        isValid: true,
        userEmail: apiKeyRecord.user_email,
        permissions: apiKeyRecord.permissions
      };

    } catch (error) {
      console.error('API key validation error:', error);
      return { isValid: false, error: 'Validation error' };
    }
  }

  // Log API key usage
  async logAPIKeyUsage(
    apiKeyId: string,
    userEmail: string,
    request: NextRequest,
    responseStatus: number,
    responseTime: number,
    metadata?: any
  ): Promise<void> {
    const usage: Omit<APIKeyUsage, 'id' | 'timestamp'> = {
      api_key_id: apiKeyId,
      endpoint: request.url,
      method: request.method,
      user_email: userEmail,
      ip_address: this.extractIP(request),
      user_agent: this.extractUserAgent(request),
      response_status: responseStatus,
      response_time: responseTime,
      metadata
    };

    const { error } = await supabase
      .from('api_key_usage')
      .insert(usage);

    if (error) {
      console.error('Failed to log API key usage:', error);
    }

    // Log to audit trail
    await auditTrail.logDataAccess(
      userEmail,
      AuditEventType.READ,
      'api_key_usage',
      apiKeyId,
      undefined,
      { ...usage, api_key_id: '[REDACTED]' }
    );
  }

  // Get API keys for user
  async getUserAPIKeys(userEmail: string): Promise<APIKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    return data || [];
  }

  // Update API key
  async updateAPIKey(
    apiKeyId: string,
    updates: Partial<APIKey>,
    updatedBy: string
  ): Promise<APIKey> {
    // Get current API key
    const { data: currentKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', apiKeyId)
      .single();

    if (fetchError || !currentKey) {
      throw new Error('API key not found');
    }

    // Update API key
    const { data, error } = await supabase
      .from('api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy
      })
      .eq('id', apiKeyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    // Log update
    await auditTrail.logDataAccess(
      updatedBy,
      AuditEventType.UPDATE,
      'api_keys',
      apiKeyId,
      currentKey,
      data
    );

    return data;
  }

  // Deactivate API key
  async deactivateAPIKey(apiKeyId: string, deactivatedBy: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: deactivatedBy
      })
      .eq('id', apiKeyId);

    if (error) {
      throw new Error(`Failed to deactivate API key: ${error.message}`);
    }

    // Log deactivation
    await auditTrail.logDataAccess(
      deactivatedBy,
      AuditEventType.UPDATE,
      'api_keys',
      apiKeyId,
      { is_active: true },
      { is_active: false }
    );
  }

  // Delete API key
  async deleteAPIKey(apiKeyId: string, deletedBy: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', apiKeyId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }

    // Log deletion
    await auditTrail.logDataAccess(
      deletedBy,
      AuditEventType.DELETE,
      'api_keys',
      apiKeyId
    );
  }

  // Get API key usage statistics
  async getAPIKeyUsageStats(
    apiKeyId?: string,
    userEmail?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByStatus: Record<string, number>;
  }> {
    let query = supabase
      .from('api_key_usage')
      .select('*');

    if (apiKeyId) {
      query = query.eq('api_key_id', apiKeyId);
    }

    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch API key usage: ${error.message}`);
    }

    const usage = data || [];

    const stats = {
      totalRequests: usage.length,
      successfulRequests: usage.filter(u => u.response_status < 400).length,
      failedRequests: usage.filter(u => u.response_status >= 400).length,
      averageResponseTime: usage.length > 0 
        ? usage.reduce((sum, u) => sum + u.response_time, 0) / usage.length 
        : 0,
      requestsByEndpoint: {} as Record<string, number>,
      requestsByStatus: {} as Record<string, number>
    };

    usage.forEach(u => {
      // Count by endpoint
      const endpoint = u.endpoint.split('?')[0]; // Remove query params
      stats.requestsByEndpoint[endpoint] = (stats.requestsByEndpoint[endpoint] || 0) + 1;
      
      // Count by status
      const statusGroup = Math.floor(u.response_status / 100) * 100;
      stats.requestsByStatus[statusGroup.toString()] = (stats.requestsByStatus[statusGroup.toString()] || 0) + 1;
    });

    return stats;
  }

  // Rotate API key
  async rotateAPIKey(
    apiKeyId: string,
    rotatedBy: string
  ): Promise<{ newApiKey: string; apiKeyRecord: APIKey }> {
    // Get current API key
    const { data: currentKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', apiKeyId)
      .single();

    if (fetchError || !currentKey) {
      throw new Error('API key not found');
    }

    // Generate new API key
    const newApiKey = this.generateSecureAPIKey();
    const newKeyHash = await hashPassword(newApiKey);

    // Update with new hash
    const { data, error } = await supabase
      .from('api_keys')
      .update({
        key_hash: newKeyHash,
        updated_at: new Date().toISOString(),
        updated_by: rotatedBy
      })
      .eq('id', apiKeyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rotate API key: ${error.message}`);
    }

    // Log rotation
    await auditTrail.logDataAccess(
      rotatedBy,
      AuditEventType.UPDATE,
      'api_keys',
      apiKeyId,
      { key_hash: '[REDACTED]' },
      { key_hash: '[REDACTED]', updated_at: data.updated_at }
    );

    return {
      newApiKey,
      apiKeyRecord: data
    };
  }

  // Generate secure API key
  private generateSecureAPIKey(): string {
    const randomBytes = generateSecurePassword(this.KEY_LENGTH);
    return this.KEY_PREFIX + randomBytes;
  }

  // Update last used timestamp
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyId);
  }

  // Extract IP address from request
  private extractIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           request.ip || 
           'unknown';
  }

  // Extract user agent from request
  private extractUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown';
  }
}

// Global API key manager instance
export const apiKeyManager = new APIKeyManager();

// API key middleware
export function withAPIKeyAuth(
  requiredPermissions: APIKeyPermission[] = []
) {
  return function(handler: (request: NextRequest, userEmail: string, permissions: string[]) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      const startTime = Date.now();
      
      try {
        // Extract API key from request
        const apiKey = extractAPIKey(request);
        if (!apiKey) {
          return NextResponse.json(
            { error: 'API key required' },
            { status: 401 }
          );
        }

        // Validate API key
        const validation = await apiKeyManager.validateAPIKey(apiKey, requiredPermissions);
        if (!validation.isValid) {
          // Log failed authentication
          await logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            {
              endpoint: request.url,
              method: request.method,
              error: validation.error
            },
            request,
            LogLevel.WARN
          );

          return NextResponse.json(
            { error: validation.error || 'Invalid API key' },
            { status: 401 }
          );
        }

        // Process request
        const response = await handler(request, validation.userEmail!, validation.permissions!);
        
        // Log successful usage
        await apiKeyManager.logAPIKeyUsage(
          'api-key-id', // You'll need to get this from the validation
          validation.userEmail!,
          request,
          response.status,
          Date.now() - startTime
        );

        return response;

      } catch (error) {
        // Log error
        await logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          {
            endpoint: request.url,
            method: request.method,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          request,
          LogLevel.ERROR
        );

        throw error;
      }
    };
  };
}

// Extract API key from request
function extractAPIKey(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get('api_key');
  if (apiKeyParam) {
    return apiKeyParam;
  }

  return null;
}

// API key management endpoints
export async function createAPIKeyEndpoint(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = apiKeySchemas.create.parse(body);

    const { apiKey, apiKeyRecord } = await apiKeyManager.generateAPIKey(
      'user@example.com', // Extract from auth
      validatedData.name,
      validatedData.permissions,
      'user@example.com', // Extract from auth
      validatedData.expires_at,
      validatedData.metadata
    );

    return NextResponse.json({
      message: 'API key created successfully',
      apiKey,
      apiKeyRecord: {
        ...apiKeyRecord,
        key_hash: '[REDACTED]'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function listAPIKeysEndpoint(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKeys = await apiKeyManager.getUserAPIKeys('user@example.com'); // Extract from auth

    return NextResponse.json({
      apiKeys: apiKeys.map(key => ({
        ...key,
        key_hash: '[REDACTED]'
      }))
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}
