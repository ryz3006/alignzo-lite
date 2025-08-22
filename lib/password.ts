import { supabaseClient } from './supabase-client';
import crypto from 'crypto';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords to prevent reuse
}

export interface PasswordHistory {
  id?: string;
  user_email: string;
  password_hash: string;
  created_at?: string;
}

export interface PasswordResetToken {
  id?: string;
  user_email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at?: string;
}

export class PasswordManager {
  private static instance: PasswordManager;
  private policy: PasswordPolicy;

  private constructor() {
    this.policy = {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90'),
      preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5')
    };
  }

  public static getInstance(): PasswordManager {
    if (!PasswordManager.instance) {
      PasswordManager.instance = new PasswordManager();
    }
    return PasswordManager.instance;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }

    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async updatePassword(
    userEmail: string,
    newPassword: string,
    currentPassword?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Password validation failed: ${validation.errors.join(', ')}`
        };
      }

      // If current password is provided, verify it
      if (currentPassword) {
        const userResponse = await supabaseClient.get('users', {
          select: 'password_hash',
          filters: { email: userEmail }
        });

        if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
          return {
            success: false,
            message: 'User not found'
          };
        }

        const currentHash = userResponse.data[0].password_hash;
        const isValid = await this.verifyPassword(currentPassword, currentHash);
        
        if (!isValid) {
          return {
            success: false,
            message: 'Current password is incorrect'
          };
        }
      }

      // Check password history to prevent reuse
      const canReuse = await this.canReusePassword(userEmail, newPassword);
      if (!canReuse) {
        return {
          success: false,
          message: `Password cannot be reused. Must be different from last ${this.policy.preventReuse} passwords.`
        };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update user password
      const updateResponse = await supabaseClient.update('users', userEmail, {
        password_hash: newHash,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (updateResponse.error) {
        return {
          success: false,
          message: 'Failed to update password'
        };
      }

      // Add to password history
      await this.addToPasswordHistory(userEmail, newHash);

      // Invalidate all user sessions
      await this.invalidateUserSessions(userEmail);

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        message: 'An error occurred while updating password'
      };
    }
  }

  private async canReusePassword(userEmail: string, newPassword: string): Promise<boolean> {
    try {
      const response = await supabaseClient.get('password_history', {
        select: 'password_hash',
        filters: { user_email: userEmail },
        order: { column: 'created_at', ascending: false },
        limit: this.policy.preventReuse
      });

      if (response.error || !response.data) {
        return true;
      }

      // Check if new password matches any of the recent passwords
      for (const record of response.data) {
        const matches = await this.verifyPassword(newPassword, record.password_hash);
        if (matches) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking password reuse:', error);
      return true; // Allow on error
    }
  }

  private async addToPasswordHistory(userEmail: string, passwordHash: string): Promise<void> {
    try {
      await supabaseClient.insert('password_history', {
        user_email: userEmail,
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding password to history:', error);
    }
  }

  private async invalidateUserSessions(userEmail: string): Promise<void> {
    try {
      const response = await supabaseClient.get('sessions', {
        select: 'id',
        filters: { user_email: userEmail, is_active: true }
      });

      if (response.error || !response.data) return;

      for (const session of response.data) {
        await supabaseClient.update('sessions', session.id, {
          is_active: false,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
    }
  }

  async createPasswordResetToken(userEmail: string): Promise<string | null> {
    try {
      // Check if user exists
      const userResponse = await supabaseClient.get('users', {
        select: 'id',
        filters: { email: userEmail }
      });

      if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
        return null;
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      const response = await supabaseClient.insert('password_reset_tokens', {
        user_email: userEmail,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error creating password reset token:', response.error);
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error creating password reset token:', error);
      return null;
    }
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userEmail?: string; message: string }> {
    try {
      const response = await supabaseClient.get('password_reset_tokens', {
        select: '*',
        filters: { token, used: false }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return {
          valid: false,
          message: 'Invalid or expired reset token'
        };
      }

      const resetToken = response.data[0];

      // Check if token is expired
      if (new Date(resetToken.expires_at) < new Date()) {
        return {
          valid: false,
          message: 'Password reset token has expired'
        };
      }

      return {
        valid: true,
        userEmail: resetToken.user_email,
        message: 'Valid reset token'
      };
    } catch (error) {
      console.error('Error validating password reset token:', error);
      return {
        valid: false,
        message: 'Error validating reset token'
      };
    }
  }

  async usePasswordResetToken(token: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('password_reset_tokens', token, {
        used: true,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error using password reset token:', error);
      return false;
    }
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate token
      const tokenValidation = await this.validatePasswordResetToken(token);
      if (!tokenValidation.valid) {
        return {
          success: false,
          message: tokenValidation.message
        };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Password validation failed: ${validation.errors.join(', ')}`
        };
      }

      const userEmail = tokenValidation.userEmail!;

      // Check password reuse
      const canReuse = await this.canReusePassword(userEmail, newPassword);
      if (!canReuse) {
        return {
          success: false,
          message: `Password cannot be reused. Must be different from last ${this.policy.preventReuse} passwords.`
        };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update user password
      const updateResponse = await supabaseClient.update('users', userEmail, {
        password_hash: newHash,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (updateResponse.error) {
        return {
          success: false,
          message: 'Failed to update password'
        };
      }

      // Mark token as used
      await this.usePasswordResetToken(token);

      // Add to password history
      await this.addToPasswordHistory(userEmail, newHash);

      // Invalidate all user sessions
      await this.invalidateUserSessions(userEmail);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        message: 'An error occurred while resetting password'
      };
    }
  }

  async checkPasswordAge(userEmail: string): Promise<{ isExpired: boolean; daysRemaining: number }> {
    try {
      const response = await supabaseClient.get('users', {
        select: 'password_changed_at',
        filters: { email: userEmail }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return { isExpired: true, daysRemaining: 0 };
      }

      const passwordChangedAt = response.data[0].password_changed_at;
      if (!passwordChangedAt) {
        return { isExpired: true, daysRemaining: 0 };
      }

      const lastChange = new Date(passwordChangedAt);
      const now = new Date();
      const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = this.policy.maxAge - daysSinceChange;

      return {
        isExpired: daysRemaining <= 0,
        daysRemaining: Math.max(0, daysRemaining)
      };
    } catch (error) {
      console.error('Error checking password age:', error);
      return { isExpired: true, daysRemaining: 0 };
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('password_reset_tokens', {
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
        await supabaseClient.delete('password_reset_tokens', token.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return this.policy;
  }

  async updatePasswordPolicy(newPolicy: Partial<PasswordPolicy>): Promise<void> {
    this.policy = { ...this.policy, ...newPolicy };
  }
}

// Global password manager instance
export const passwordManager = PasswordManager.getInstance();

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return await passwordManager.hashPassword(password);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await passwordManager.verifyPassword(password, hashedPassword);
}

export async function validatePassword(password: string): Promise<{ isValid: boolean; errors: string[] }> {
  return passwordManager.validatePassword(password);
}

export async function updatePassword(
  userEmail: string,
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; message: string }> {
  return await passwordManager.updatePassword(userEmail, newPassword, currentPassword);
}

export async function createPasswordResetToken(userEmail: string): Promise<string | null> {
  return await passwordManager.createPasswordResetToken(userEmail);
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return await passwordManager.resetPasswordWithToken(token, newPassword);
}

// Helper function to verify admin credentials
export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  try {
    // Get user from database
    const response = await supabaseClient.get('users', {
      select: 'password_hash,role',
      filters: { email }
    });

    if (response.error || !response.data || response.data.length === 0) {
      return false;
    }

    const user = response.data[0];
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return false;
    }

    // Verify password
    return await passwordManager.verifyPassword(password, user.password_hash);
  } catch (error) {
    console.error('Error verifying admin credentials:', error);
    return false;
  }
}
