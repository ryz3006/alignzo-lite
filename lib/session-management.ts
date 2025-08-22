import { supabaseClient } from './supabase-client';

export interface Session {
  id: string;
  user_email: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

export interface SessionConfig {
  maxSessionsPerUser: number;
  sessionTimeoutHours: number;
  cleanupIntervalMinutes: number;
}

export class SessionManager {
  private static instance: SessionManager;
  private config: SessionConfig;

  private constructor() {
    this.config = {
      maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
      sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24'),
      cleanupIntervalMinutes: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '60')
    };
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(userEmail: string, ipAddress?: string, userAgent?: string): Promise<Session | null> {
    try {
      // Check if user has too many active sessions
      const activeSessions = await this.getActiveSessions(userEmail);
      
      if (activeSessions.length >= this.config.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSession = activeSessions[activeSessions.length - 1];
        await this.deleteSession(oldestSession.id);
      }

      // Create new session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.config.sessionTimeoutHours);

      const response = await supabaseClient.insert('sessions', {
        user_email: userEmail,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        is_active: true
      });

      if (response.error) {
        console.error('Error creating session:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await supabaseClient.get('sessions', {
        select: '*',
        filters: { id: sessionId }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return null;
      }

      const session = response.data[0];
      
      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async getActiveSessions(userEmail: string): Promise<Session[]> {
    try {
      const response = await supabaseClient.get('sessions', {
        select: '*',
        filters: {
          user_email: userEmail,
          is_active: true
        },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) {
        console.error('Error getting active sessions:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<boolean> {
    try {
      const response = await supabaseClient.update('sessions', sessionId, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('sessions', sessionId);
      return !response.error;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  async deleteUserSessions(userEmail: string): Promise<number> {
    try {
      const activeSessions = await this.getActiveSessions(userEmail);
      let deletedCount = 0;

      for (const session of activeSessions) {
        if (await this.deleteSession(session.id)) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return 0;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('sessions', {
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
      for (const session of response.data) {
        if (await this.deleteSession(session.id)) {
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  async validateSession(sessionId: string, userEmail?: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        return false;
      }

      if (userEmail && session.user_email !== userEmail) {
        return false;
      }

      // Extend session if it's close to expiring
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      if (timeUntilExpiry < 30 * 60 * 1000) { // 30 minutes
        const newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + this.config.sessionTimeoutHours);
        
        await this.updateSession(sessionId, { expires_at: newExpiresAt.toISOString() });
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }
}

// Global session manager instance
export const sessionManager = SessionManager.getInstance();

// Helper functions
export async function createUserSession(
  userEmail: string,
  ipAddress?: string,
  userAgent?: string
): Promise<Session | null> {
  return await sessionManager.createSession(userEmail, ipAddress, userAgent);
}

export async function validateUserSession(
  sessionId: string,
  userEmail?: string
): Promise<boolean> {
  return await sessionManager.validateSession(sessionId, userEmail);
}

export async function deleteUserSession(sessionId: string): Promise<boolean> {
  return await sessionManager.deleteSession(sessionId);
}

export async function cleanupAllExpiredSessions(): Promise<number> {
  return await sessionManager.cleanupExpiredSessions();
}
