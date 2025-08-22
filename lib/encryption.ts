import { supabaseClient } from './supabase-client';
import crypto from 'crypto';

export interface EncryptionKey {
  id?: string;
  name: string;
  key_hash: string;
  algorithm: string;
  key_size: number;
  created_at?: string;
  expires_at?: string;
  is_active: boolean;
}

export interface EncryptedData {
  id?: string;
  encrypted_data: string;
  iv: string;
  key_id: string;
  algorithm: string;
  created_at?: string;
}

export class EncryptionManager {
  private static instance: EncryptionManager;
  private masterKey: string;
  private algorithm: string;
  private keySize: number;

  private constructor() {
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey();
    this.algorithm = 'aes-256-gcm';
    this.keySize = 32;
  }

  public static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  private generateMasterKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('No ENCRYPTION_MASTER_KEY found, generated temporary key. Set this environment variable in production.');
    return key;
  }

  async generateKey(name: string, expiresAt?: Date): Promise<EncryptionKey | null> {
    try {
      const key = crypto.randomBytes(this.keySize);
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      
      const expiresDate = expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

      const response = await supabaseClient.insert('encryption_keys', {
        name,
        key_hash: keyHash,
        algorithm: this.algorithm,
        key_size: this.keySize,
        expires_at: expiresDate.toISOString(),
        is_active: true
      });

      if (response.error) {
        console.error('Error creating encryption key:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error generating encryption key:', error);
      return null;
    }
  }

  async getKey(keyId: string): Promise<EncryptionKey | null> {
    try {
      const response = await supabaseClient.get('encryption_keys', {
        select: '*',
        filters: { id: keyId }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return null;
      }

      const key = response.data[0];
      
      // Check if key is expired
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        await this.deactivateKey(keyId);
        return null;
      }

      return key;
    } catch (error) {
      console.error('Error getting encryption key:', error);
      return null;
    }
  }

  async deactivateKey(keyId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('encryption_keys', keyId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error deactivating encryption key:', error);
      return false;
    }
  }

  async encrypt(data: string, keyId: string): Promise<EncryptedData | null> {
    try {
      const key = await this.getKey(keyId);
      if (!key || !key.is_active) {
        throw new Error('Invalid or inactive encryption key');
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.masterKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // For compatibility, use a simpler approach without auth tag
      const encryptedData: Omit<EncryptedData, 'id' | 'created_at'> = {
        encrypted_data: encrypted,
        iv: iv.toString('hex'),
        key_id: keyId,
        algorithm: this.algorithm
      };

      const response = await supabaseClient.insert('encrypted_data', {
        ...encryptedData,
        created_at: new Date().toISOString()
      });

      if (response.error) {
        throw new Error(`Failed to store encrypted data: ${response.error}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error encrypting data:', error);
      return null;
    }
  }

  async decrypt(encryptedDataId: string): Promise<string | null> {
    try {
      const response = await supabaseClient.get('encrypted_data', {
        select: '*',
        filters: { id: encryptedDataId }
      });

      if (response.error || !response.data || response.data.length === 0) {
        throw new Error('Encrypted data not found');
      }

      const encryptedRecord = response.data[0];
      const key = await this.getKey(encryptedRecord.key_id);
      
      if (!key || !key.is_active) {
        throw new Error('Invalid or inactive encryption key');
      }

      const iv = Buffer.from(encryptedRecord.iv, 'hex');
      const encryptedData = encryptedRecord.encrypted_data;

      const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }

  async encryptField(data: any, fieldsToEncrypt: string[], keyId: string): Promise<any> {
    try {
      const encryptedData = { ...data };
      
      for (const field of fieldsToEncrypt) {
        if (data[field] && typeof data[field] === 'string') {
          const encrypted = await this.encrypt(data[field], keyId);
          if (encrypted) {
            encryptedData[field] = encrypted.id;
            encryptedData[`${field}_encrypted`] = true;
          }
        }
      }
      
      return encryptedData;
    } catch (error) {
      console.error('Error encrypting fields:', error);
      return data;
    }
  }

  async decryptFields(data: any, fieldsToDecrypt: string[]): Promise<any> {
    try {
      const decryptedData = { ...data };
      
      for (const field of fieldsToDecrypt) {
        if (data[`${field}_encrypted`] && data[field]) {
          const decrypted = await this.decrypt(data[field]);
          if (decrypted !== null) {
            decryptedData[field] = decrypted;
            delete decryptedData[`${field}_encrypted`];
          }
        }
      }
      
      return decryptedData;
    } catch (error) {
      console.error('Error decrypting fields:', error);
      return data;
    }
  }

  async rotateKeys(): Promise<number> {
    try {
      // Get all active keys
      const response = await supabaseClient.get('encryption_keys', {
        select: '*',
        filters: { is_active: true }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let rotatedCount = 0;
      const now = new Date();

      for (const key of response.data) {
        // Check if key is close to expiration (within 30 days)
        if (key.expires_at) {
          const expirationDate = new Date(key.expires_at);
          const daysUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysUntilExpiry < 30) {
            // Generate new key
            const newKey = await this.generateKey(key.name, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
            if (newKey) {
              // Re-encrypt data with new key
              await this.reEncryptData(key.id!, newKey.id!);
              
              // Deactivate old key
              await this.deactivateKey(key.id!);
              
              rotatedCount++;
            }
          }
        }
      }

      return rotatedCount;
    } catch (error) {
      console.error('Error rotating keys:', error);
      return 0;
    }
  }

  private async reEncryptData(oldKeyId: string, newKeyId: string): Promise<void> {
    try {
      // Get all data encrypted with old key
      const response = await supabaseClient.get('encrypted_data', {
        select: '*',
        filters: { key_id: oldKeyId }
      });

      if (response.error || !response.data) return;

      for (const encryptedRecord of response.data) {
        try {
          // Decrypt with old key
          const decrypted = await this.decrypt(encryptedRecord.id!);
          
          if (decrypted !== null) {
            // Encrypt with new key
            const reEncrypted = await this.encrypt(decrypted, newKeyId);
            
            if (reEncrypted) {
              // Update the record to use new key
              await supabaseClient.update('encrypted_data', encryptedRecord.id!, {
                key_id: newKeyId,
                updated_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error(`Error re-encrypting data ${encryptedRecord.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error re-encrypting data:', error);
    }
  }

  async getKeyUsage(keyId: string): Promise<number> {
    try {
      const response = await supabaseClient.get('encrypted_data', {
        select: 'id',
        filters: { key_id: keyId }
      });

      if (response.error) return 0;
      return response.data?.length || 0;
    } catch (error) {
      console.error('Error getting key usage:', error);
      return 0;
    }
  }

  async cleanupExpiredKeys(): Promise<number> {
    try {
      const now = new Date();
      
      const response = await supabaseClient.get('encryption_keys', {
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
        if (await this.deactivateKey(key.id)) {
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired keys:', error);
      return 0;
    }
  }
}

// Global encryption manager instance
export const encryptionManager = EncryptionManager.getInstance();

// Helper functions
export async function encryptData(data: string, keyId: string): Promise<EncryptedData | null> {
  return await encryptionManager.encrypt(data, keyId);
}

export async function decryptData(encryptedDataId: string): Promise<string | null> {
  return await encryptionManager.decrypt(encryptedDataId);
}

export async function generateEncryptionKey(name: string, expiresAt?: Date): Promise<EncryptionKey | null> {
  return await encryptionManager.generateKey(name, expiresAt);
}

export async function rotateEncryptionKeys(): Promise<number> {
  return await encryptionManager.rotateKeys();
}

