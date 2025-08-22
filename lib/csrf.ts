import { supabaseClient } from './supabase-client';
import crypto from 'crypto';

export interface CSRFToken {
  id?: string;
  token: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  used: boolean;
  created_at?: string;
}

export interface CSRFConfig {
  enabled: boolean;
  tokenLength: number;
  tokenExpiryMinutes: number;
  requireUserEmail: boolean;
  validateOrigin: boolean;
  allowedOrigins: string[];
}

export class CSRFProtection {
  private static instance: CSRFProtection;
  private config: CSRFConfig;

  private constructor() {
    this.config = {
      enabled: process.env.CSRF_PROTECTION_ENABLED !== 'false',
      tokenLength: parseInt(process.env.CSRF_TOKEN_LENGTH || '32'),
      tokenExpiryMinutes: parseInt(process.env.CSRF_TOKEN_EXPIRY_MINUTES || '30'),
      requireUserEmail: process.env.CSRF_REQUIRE_USER_EMAIL !== 'false',
      validateOrigin: process.env.CSRF_VALIDATE_ORIGIN !== 'false',
      allowedOrigins: process.env.CSRF_ALLOWED_ORIGINS?.split(',') || ['*']
    };
  }

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  async generateToken(
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      if (!this.config.enabled) {
        return 'csrf_disabled';
      }

      // Generate random token
      const token = crypto.randomBytes(this.config.tokenLength).toString('hex');
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.config.tokenExpiryMinutes);

      // Store token in database
      const tokenRecord: Omit<CSRFToken, 'id' | 'created_at'> = {
        token,
        user_email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        used: false
      };

      await supabaseClient.insert('csrf_tokens', {
        ...tokenRecord,
        created_at: new Date().toISOString()
      });

      return token;
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      throw new Error('Failed to generate CSRF token');
    }
  }

  async validateToken(
    token: string,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ valid: boolean; message: string }> {
    try {
      if (!this.config.enabled) {
        return { valid: true, message: 'CSRF protection disabled' };
      }

      if (!token) {
        return { valid: false, message: 'CSRF token is required' };
      }

      // Get token from database
      const response = await supabaseClient.get('csrf_tokens', {
        select: '*',
        filters: { token }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return { valid: false, message: 'Invalid CSRF token' };
      }

      const tokenRecord = response.data[0];

      // Check if token is expired
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await this.cleanupExpiredToken(tokenRecord.id!);
        return { valid: false, message: 'CSRF token has expired' };
      }

      // Check if token has been used
      if (tokenRecord.used) {
        return { valid: false, message: 'CSRF token has already been used' };
      }

      // Validate user email if required
      if (this.config.requireUserEmail && userEmail && tokenRecord.user_email) {
        if (tokenRecord.user_email !== userEmail) {
          return { valid: false, message: 'CSRF token user mismatch' };
        }
      }

      // Validate IP address if available
      if (ipAddress && tokenRecord.ip_address) {
        if (tokenRecord.ip_address !== ipAddress) {
          return { valid: false, message: 'CSRF token IP mismatch' };
        }
      }

      // Mark token as used
      await this.markTokenAsUsed(tokenRecord.id!);

      return { valid: true, message: 'CSRF token is valid' };
    } catch (error) {
      console.error('Error validating CSRF token:', error);
      return { valid: false, message: 'Error validating CSRF token' };
    }
  }

  async validateRequest(
    request: Request,
    token: string,
    userEmail?: string
  ): Promise<{ valid: boolean; message: string }> {
    try {
      if (!this.config.enabled) {
        return { valid: true, message: 'CSRF protection disabled' };
      }

      // Extract request details
      const ipAddress = this.extractIPAddress(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const origin = request.headers.get('origin') || request.headers.get('referer') || '';

      // Validate origin if enabled
      if (this.config.validateOrigin && origin) {
        const isOriginAllowed = this.isOriginAllowed(origin);
        if (!isOriginAllowed) {
          return { valid: false, message: 'Invalid request origin' };
        }
      }

      // Validate token
      return await this.validateToken(token, userEmail, ipAddress, userAgent);
    } catch (error) {
      console.error('Error validating CSRF request:', error);
      return { valid: false, message: 'Error validating CSRF request' };
    }
  }

  private extractIPAddress(request: Request): string {
    // Try to get IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    // In a real environment, you might have access to request.ip
    // For now, return a placeholder
    return 'unknown';
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      
      return this.config.allowedOrigins.some(allowed => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.substring(2);
          return hostname.endsWith(domain);
        }
        return allowed === hostname || allowed === origin;
      });
    } catch {
      return false;
    }
  }

  private async markTokenAsUsed(tokenId: string): Promise<void> {
    try {
      await supabaseClient.update('csrf_tokens', tokenId, {
        used: true,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking CSRF token as used:', error);
    }
  }

  private async cleanupExpiredToken(tokenId: string): Promise<void> {
    try {
      await supabaseClient.delete('csrf_tokens', tokenId);
    } catch (error) {
      console.error('Error cleaning up expired CSRF token:', error);
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('csrf_tokens', {
        select: 'id',
        filters: {
          expires_at: { lt: now.toISOString() }
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const token of response.data) {
        await supabaseClient.delete('csrf_tokens', token.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired CSRF tokens:', error);
      return 0;
    }
  }

  async getTokenInfo(token: string): Promise<CSRFToken | null> {
    try {
      const response = await supabaseClient.get('csrf_tokens', {
        select: '*',
        filters: { token }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return null;
      }

      return response.data[0];
    } catch (error) {
      console.error('Error getting CSRF token info:', error);
      return null;
    }
  }

  async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('csrf_tokens', token);
      return !response.error;
    } catch (error) {
      console.error('Error revoking CSRF token:', error);
      return false;
    }
  }

  async revokeUserTokens(userEmail: string): Promise<number> {
    try {
      const response = await supabaseClient.get('csrf_tokens', {
        select: 'id',
        filters: { user_email: userEmail }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let revokedCount = 0;
      for (const token of response.data) {
        if (await this.revokeToken(token.id)) {
          revokedCount++;
        }
      }

      return revokedCount;
    } catch (error) {
      console.error('Error revoking user CSRF tokens:', error);
      return 0;
    }
  }

  async getCSRFStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    usedTokens: number;
  }> {
    try {
      const response = await supabaseClient.get('csrf_tokens', {
        select: 'id,expires_at,used'
      });

      if (response.error) {
        return { totalTokens: 0, activeTokens: 0, expiredTokens: 0, usedTokens: 0 };
      }

      const tokens = response.data || [];
      const now = new Date();

      const stats = {
        totalTokens: tokens.length,
        activeTokens: 0,
        expiredTokens: 0,
        usedTokens: 0
      };

      tokens.forEach((token: CSRFToken) => {
        if (token.used) {
          stats.usedTokens++;
        } else if (new Date(token.expires_at) < now) {
          stats.expiredTokens++;
        } else {
          stats.activeTokens++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting CSRF stats:', error);
      return { totalTokens: 0, activeTokens: 0, expiredTokens: 0, usedTokens: 0 };
    }
  }

  getConfig(): CSRFConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CSRFConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global CSRF protection instance
export const csrfProtection = CSRFProtection.getInstance();

// Helper functions
export async function generateCSRFToken(
  userEmail?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await csrfProtection.generateToken(userEmail, ipAddress, userAgent);
}

export async function validateCSRFToken(
  token: string,
  userEmail?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ valid: boolean; message: string }> {
  return await csrfProtection.validateToken(token, userEmail, ipAddress, userAgent);
}

export async function validateCSRFRequest(
  request: Request,
  token: string,
  userEmail?: string
): Promise<{ valid: boolean; message: string }> {
  return await csrfProtection.validateRequest(request, token, userEmail);
}

export async function cleanupExpiredCSRFTokens(): Promise<number> {
  return await csrfProtection.cleanupExpiredTokens();
}
