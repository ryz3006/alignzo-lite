import crypto from 'crypto';

// Encryption configuration
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

// Default encryption configuration
const defaultConfig: EncryptionConfig = {
  algorithm: 'aes-256-cbc',
  keyLength: 32,
  ivLength: 16,
  saltLength: 16,
  iterations: 100000
};

// Encrypted data structure
interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag: string;
  version: string;
}

export class DatabaseEncryption {
  private config: EncryptionConfig;
  private masterKey: string;

  constructor(masterKey: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.masterKey = masterKey;
  }

  // Generate encryption key from master key and salt
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.config.iterations,
      this.config.keyLength,
      'sha256'
    );
  }

  // Encrypt sensitive data
  encrypt(data: string): EncryptedData {
    try {
      // Generate salt and IV
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);

      // Derive encryption key
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipher(this.config.algorithm, key, iv);

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: '', // Not used for CBC mode
        version: '1.0'
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData: EncryptedData): string {
    try {
      // Parse encrypted data
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const salt = Buffer.from(encryptedData.salt, 'hex');

      // Derive decryption key
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipher(this.config.algorithm, key, iv);

      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Encrypt object fields selectively
  encryptObject(obj: any, fieldsToEncrypt: string[]): any {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (obj[field] && typeof obj[field] === 'string') {
        const encryptedData = this.encrypt(obj[field]);
        encrypted[field] = JSON.stringify(encryptedData);
      }
    }

    return encrypted;
  }

  // Decrypt object fields selectively
  decryptObject(obj: any, fieldsToDecrypt: string[]): any {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          const encryptedData = JSON.parse(obj[field]) as EncryptedData;
          decrypted[field] = this.decrypt(encryptedData);
        } catch (error) {
          // If parsing fails, assume it's not encrypted
          console.warn(`Field ${field} is not encrypted or corrupted`);
        }
      }
    }

    return decrypted;
  }

  // Generate a new master key
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  // Validate encryption configuration
  validateConfig(): boolean {
    try {
      // Test encryption/decryption with sample data
      const testData = 'test-encryption-data';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      return decrypted === testData;
    } catch (error) {
      console.error('Encryption configuration validation failed:', error);
      return false;
    }
  }
}

// Global encryption instance
let globalEncryption: DatabaseEncryption | null = null;

// Initialize global encryption
export function initializeEncryption(masterKey: string): DatabaseEncryption {
  if (!masterKey) {
    throw new Error('Master key is required for encryption');
  }

  globalEncryption = new DatabaseEncryption(masterKey);
  
  // Validate configuration
  if (!globalEncryption.validateConfig()) {
    throw new Error('Encryption configuration validation failed');
  }

  return globalEncryption;
}

// Get global encryption instance
export function getEncryption(): DatabaseEncryption {
  if (!globalEncryption) {
    throw new Error('Encryption not initialized. Call initializeEncryption() first.');
  }
  return globalEncryption;
}

// Encrypt sensitive fields in database operations
export function encryptSensitiveFields(data: any, fields: string[]): any {
  const encryption = getEncryption();
  return encryption.encryptObject(data, fields);
}

// Decrypt sensitive fields in database operations
export function decryptSensitiveFields(data: any, fields: string[]): any {
  const encryption = getEncryption();
  return encryption.decryptObject(data, fields);
}

// Fields that should be encrypted by default
export const DEFAULT_ENCRYPTED_FIELDS = [
  'api_token',
  'password',
  'secret_key',
  'private_key',
  'access_token',
  'refresh_token',
  'encryption_key',
  'sensitive_data',
  'personal_info',
  'financial_data'
];

// Encryption utilities for specific data types
export class EncryptionUtils {
  // Encrypt API tokens
  static encryptApiToken(token: string): string {
    const encryption = getEncryption();
    const encryptedData = encryption.encrypt(token);
    return JSON.stringify(encryptedData);
  }

  // Decrypt API tokens
  static decryptApiToken(encryptedToken: string): string {
    const encryption = getEncryption();
    const encryptedData = JSON.parse(encryptedToken) as EncryptedData;
    return encryption.decrypt(encryptedData);
  }

  // Encrypt user passwords (additional layer)
  static encryptPassword(password: string): string {
    const encryption = getEncryption();
    const encryptedData = encryption.encrypt(password);
    return JSON.stringify(encryptedData);
  }

  // Decrypt user passwords
  static decryptPassword(encryptedPassword: string): string {
    const encryption = getEncryption();
    const encryptedData = JSON.parse(encryptedPassword) as EncryptedData;
    return encryption.decrypt(encryptedData);
  }

  // Encrypt sensitive configuration
  static encryptConfig(config: any): string {
    const encryption = getEncryption();
    const encryptedData = encryption.encrypt(JSON.stringify(config));
    return JSON.stringify(encryptedData);
  }

  // Decrypt sensitive configuration
  static decryptConfig(encryptedConfig: string): any {
    const encryption = getEncryption();
    const encryptedData = JSON.parse(encryptedConfig) as EncryptedData;
    const decrypted = encryption.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }
}
