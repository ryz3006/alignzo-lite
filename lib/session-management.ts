import crypto from 'crypto';
import { supabase } from './supabase';
import { logSecurityEvent, SecurityEventType } from './logger';
import { auditTrail, AuditEventType } from './audit-trail';

// Session configuration
interface SessionConfig {
  maxSessionsPerUser: number;
  sessionTimeoutMinutes: number;
  refreshTokenTimeoutDays: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requireReauthForSensitive: boolean;
}

// Default session configuration
const defaultSessionConfig: SessionConfig = {
  maxSessionsPerUser: 5,
  sessionTimeoutMinutes: 30,
  refreshTokenTimeoutDays: 7,
  maxFailedAttempts: 3,
  lockoutDurationMinutes: 15,
  requireReauthForSensitive: true
};

// Session data structure
interface SessionData {
  id: string;
  user_email: string;
  session_token: string;
  refresh_token: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  device_info?: any;
  location_info?: any;
  security_level: 'low' | 'medium' | 'high';
}

// Session activity tracking
interface SessionActivity {
  session_id: string;
  user_email: string;
  activity_type: string;
  endpoint: string;
  ip_address: string;
  timestamp: string;
  metadata?: any;
}

export class AdvancedSessionManager {
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...defaultSessionConfig, ...config };
  }

  // Create a new session
  async createSession(
    userEmail: string,
    ipAddress: string,
    userAgent: string,
    deviceInfo?: any,
    locationInfo?: any
  ): Promise<SessionData> {
    try {
      // Check if user has too many active sessions
      await this.enforceSessionLimit(userEmail);

      // Generate session tokens
      const sessionToken = this.generateSecureToken();
      const refreshToken = this.generateSecureToken();

      // Calculate expiration times
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.sessionTimeoutMinutes * 60 * 1000);

      // Create session data
      const sessionData: Omit<SessionData, 'id'> = {
        user_email: userEmail,
        session_token: sessionToken,
        refresh_token: refreshToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: now.toISOString(),
        last_activity: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        device_info: deviceInfo,
        location_info: locationInfo,
        security_level: this.calculateSecurityLevel(ipAddress, userAgent, deviceInfo)
      };

      // Insert session into database
      const { data, error } = await supabase
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log session creation
      await auditTrail.logUserAction(
        userEmail,
        AuditEventType.LOGIN,
        'Session created',
        undefined,
        { sessionId: data.id, ipAddress, userAgent }
      );

      return data;
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  }

  // Validate session
  async validateSession(sessionToken: string, ipAddress: string): Promise<SessionData | null> {
    try {
      // Get session from database
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return null;
      }

      // Check if session is expired
      if (new Date() > new Date(session.expires_at)) {
        await this.invalidateSession(session.id, 'Session expired');
        return null;
      }

      // Check for suspicious activity
      if (session.ip_address !== ipAddress) {
        await this.flagSuspiciousActivity(session, 'IP address mismatch', ipAddress);
      }

      // Update last activity
      await this.updateLastActivity(session.id);

      return session;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  // Refresh session
  async refreshSession(refreshToken: string, ipAddress: string): Promise<SessionData | null> {
    try {
      // Get session by refresh token
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('refresh_token', refreshToken)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return null;
      }

      // Check refresh token expiration
      const refreshExpiresAt = new Date(session.created_at);
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + this.config.refreshTokenTimeoutDays);

      if (new Date() > refreshExpiresAt) {
        await this.invalidateSession(session.id, 'Refresh token expired');
        return null;
      }

      // Generate new session token
      const newSessionToken = this.generateSecureToken();
      const newExpiresAt = new Date(Date.now() + this.config.sessionTimeoutMinutes * 60 * 1000);

      // Update session
      const { data: updatedSession, error: updateError } = await supabase
        .from('user_sessions')
        .update({
          session_token: newSessionToken,
          expires_at: newExpiresAt.toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log session refresh
      await auditTrail.logUserAction(
        session.user_email,
        AuditEventType.LOGIN,
        'Session refreshed',
        undefined,
        { sessionId: session.id, ipAddress }
      );

      return updatedSession;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  // Invalidate session
  async invalidateSession(sessionId: string, reason: string): Promise<void> {
    try {
      // Get session details for logging
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_email')
        .eq('id', sessionId)
        .single();

      // Mark session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      // Log session invalidation
      if (session) {
        await auditTrail.logUserAction(
          session.user_email,
          AuditEventType.LOGOUT,
          `Session invalidated: ${reason}`,
          undefined,
          { sessionId, reason }
        );
      }
    } catch (error) {
      console.error('Session invalidation failed:', error);
    }
  }

  // Invalidate all user sessions
  async invalidateAllUserSessions(userEmail: string, reason: string): Promise<void> {
    try {
      // Mark all user sessions as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_email', userEmail);

      // Log bulk session invalidation
      await auditTrail.logUserAction(
        userEmail,
        AuditEventType.LOGOUT,
        `All sessions invalidated: ${reason}`,
        undefined,
        { reason }
      );
    } catch (error) {
      console.error('Bulk session invalidation failed:', error);
    }
  }

  // Track session activity
  async trackActivity(
    sessionId: string,
    userEmail: string,
    activityType: string,
    endpoint: string,
    ipAddress: string,
    metadata?: any
  ): Promise<void> {
    try {
      const activity: Omit<SessionActivity, 'timestamp'> = {
        session_id: sessionId,
        user_email: userEmail,
        activity_type: activityType,
        endpoint: endpoint,
        ip_address: ipAddress,
        metadata
      };

      // Insert activity record
      await supabase
        .from('session_activities')
        .insert(activity);

      // Update session last activity
      await this.updateLastActivity(sessionId);
    } catch (error) {
      console.error('Activity tracking failed:', error);
    }
  }

  // Get user sessions
  async getUserSessions(userEmail: string): Promise<SessionData[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // First get count of expired sessions
      const { count, error: countError } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (countError) {
        throw countError;
      }

      // Then update them
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (updateError) {
        throw updateError;
      }

      return count || 0;
    } catch (error) {
      console.error('Session cleanup failed:', error);
      return 0;
    }
  }

  // Private helper methods
  private async enforceSessionLimit(userEmail: string): Promise<void> {
    const activeSessions = await this.getUserSessions(userEmail);
    
    if (activeSessions.length >= this.config.maxSessionsPerUser) {
      // Invalidate oldest session
      const oldestSession = activeSessions[activeSessions.length - 1];
      await this.invalidateSession(oldestSession.id, 'Session limit exceeded');
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateSecurityLevel(
    ipAddress: string,
    userAgent: string,
    deviceInfo?: any
  ): 'low' | 'medium' | 'high' {
    // Simple security level calculation
    // In production, you might use more sophisticated logic
    if (deviceInfo?.isMobile && ipAddress.includes('192.168.')) {
      return 'low';
    } else if (userAgent.includes('Chrome') || userAgent.includes('Firefox')) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  }

  private async flagSuspiciousActivity(
    session: SessionData,
    reason: string,
    currentIp: string
  ): Promise<void> {
    // Log suspicious activity
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        userEmail: session.user_email,
        message: `Suspicious session activity: ${reason}`,
        sessionId: session.id,
        originalIp: session.ip_address,
        currentIp,
        reason
      }
    );

    // Optionally invalidate session for high-risk activities
    if (this.config.requireReauthForSensitive) {
      await this.invalidateSession(session.id, `Suspicious activity: ${reason}`);
    }
  }
}

// Global session manager instance
let globalSessionManager: AdvancedSessionManager | null = null;

// Initialize global session manager
export function initializeSessionManager(config?: Partial<SessionConfig>): AdvancedSessionManager {
  globalSessionManager = new AdvancedSessionManager(config);
  return globalSessionManager;
}

// Get global session manager
export function getSessionManager(): AdvancedSessionManager {
  if (!globalSessionManager) {
    throw new Error('Session manager not initialized. Call initializeSessionManager() first.');
  }
  return globalSessionManager;
}

// Session middleware for API routes
export function withSessionValidation(handler: Function) {
  return async (request: any, ...args: any[]) => {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Session token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionManager = getSessionManager();
    const session = await sessionManager.validateSession(sessionToken, ipAddress);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Track activity
    await sessionManager.trackActivity(
      session.id,
      session.user_email,
      'API_ACCESS',
      request.url,
      ipAddress
    );

    // Add session to request context
    request.session = session;
    request.userEmail = session.user_email;

    return handler(request, ...args);
  };
}
