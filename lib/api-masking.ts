import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent, SecurityEventType } from './logger';
import { supabaseClient } from './supabase-client';

export interface MaskingRule {
  id?: string;
  field_pattern: string;
  mask_type: 'full' | 'partial' | 'hash' | 'custom';
  replacement: string;
  is_active: boolean;
  priority: number;
  created_at?: string;
}

export interface MaskingConfig {
  enabled: boolean;
  defaultMaskType: 'full' | 'partial' | 'hash' | 'custom';
  defaultReplacement: string;
  preserveLength: boolean;
  logMasking: boolean;
}

export class ApiMaskingManager {
  private static instance: ApiMaskingManager;
  private rules: MaskingRule[] = [];
  private config: MaskingConfig;

  private constructor() {
    this.config = {
      enabled: process.env.API_MASKING_ENABLED !== 'false',
      defaultMaskType: (process.env.API_MASKING_DEFAULT_TYPE as any) || 'partial',
      defaultReplacement: process.env.API_MASKING_DEFAULT_REPLACEMENT || '***',
      preserveLength: process.env.API_MASKING_PRESERVE_LENGTH === 'true',
      logMasking: process.env.API_MASKING_LOG === 'true'
    };
  }

  public static getInstance(): ApiMaskingManager {
    if (!ApiMaskingManager.instance) {
      ApiMaskingManager.instance = new ApiMaskingManager();
    }
    return ApiMaskingManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadMaskingRules();
    } catch (error) {
      console.error('Error initializing API masking:', error);
    }
  }

  async loadMaskingRules(): Promise<void> {
    try {
      const response = await supabaseClient.get('masking_rules', {
        select: '*',
        filters: { is_active: true },
        order: { column: 'priority', ascending: false }
      });

      if (response.error) {
        console.error('Error loading masking rules:', response.error);
        return;
      }

      this.rules = response.data || [];
      console.log(`Loaded ${this.rules.length} masking rules`);
    } catch (error) {
      console.error('Error loading masking rules:', error);
    }
  }

  async createMaskingRule(rule: Omit<MaskingRule, 'id' | 'created_at'>): Promise<MaskingRule | null> {
    try {
      const response = await supabaseClient.insert('masking_rules', {
        ...rule,
        created_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error creating masking rule:', response.error);
        return null;
      }

      const newRule = response.data;
      this.rules.push(newRule);
      this.rules.sort((a, b) => b.priority - a.priority);

      return newRule;
    } catch (error) {
      console.error('Error creating masking rule:', error);
      return null;
    }
  }

  async updateMaskingRule(ruleId: string, updates: Partial<MaskingRule>): Promise<boolean> {
    try {
      const response = await supabaseClient.update('masking_rules', ruleId, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error updating masking rule:', response.error);
        return false;
      }

      // Update local rules
      const index = this.rules.findIndex(r => r.id === ruleId);
      if (index !== -1) {
        this.rules[index] = { ...this.rules[index], ...updates };
        this.rules.sort((a, b) => b.priority - a.priority);
      }

      return true;
    } catch (error) {
      console.error('Error updating masking rule:', error);
      return false;
    }
  }

  async deleteMaskingRule(ruleId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('masking_rules', ruleId);

      if (response.error) {
        console.error('Error deleting masking rule:', response.error);
        return false;
      }

      // Remove from local rules
      this.rules = this.rules.filter(r => r.id !== ruleId);
      return true;
    } catch (error) {
      console.error('Error deleting masking rule:', error);
      return false;
    }
  }

  maskData(data: any, context?: string): any {
    if (!this.config.enabled || !data) {
      return data;
    }

    try {
      if (typeof data === 'string') {
        return this.maskString(data, context);
      }

      if (Array.isArray(data)) {
        return data.map(item => this.maskData(item, context));
      }

      if (typeof data === 'object' && data !== null) {
        const masked: any = {};
        for (const [key, value] of Object.entries(data)) {
          masked[key] = this.maskData(value, `${context ? context + '.' : ''}${key}`);
        }
        return masked;
      }

      return data;
    } catch (error) {
      console.error('Error masking data:', error);
      return data;
    }
  }

  private maskString(value: string, context?: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Find applicable masking rule
    const rule = this.findApplicableRule(context || '');
    if (!rule) {
      return this.applyDefaultMasking(value);
    }

    return this.applyMaskingRule(value, rule);
  }

  private findApplicableRule(context: string): MaskingRule | null {
    for (const rule of this.rules) {
      if (this.matchesPattern(context, rule.field_pattern)) {
        return rule;
      }
    }
    return null;
  }

  private matchesPattern(context: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced with regex support
    if (pattern === '*') return true;
    if (pattern === context) return true;
    if (context.includes(pattern)) return true;
    
    // Check if pattern is a wildcard pattern
    const wildcardPattern = pattern.replace(/\*/g, '.*');
    try {
      const regex = new RegExp(`^${wildcardPattern}$`, 'i');
      return regex.test(context);
    } catch {
      return false;
    }
  }

  private applyMaskingRule(value: string, rule: MaskingRule): string {
    switch (rule.mask_type) {
      case 'full':
        return rule.replacement;
      
      case 'partial':
        return this.maskPartial(value, rule.replacement);
      
      case 'hash':
        return this.hashValue(value);
      
      case 'custom':
        return this.applyCustomMasking(value, rule.replacement);
      
      default:
        return this.applyDefaultMasking(value);
    }
  }

  private maskPartial(value: string, replacement: string): string {
    if (value.length <= 2) {
      return replacement;
    }

    if (this.config.preserveLength) {
      return replacement.repeat(Math.ceil(value.length / replacement.length)).substring(0, value.length);
    }

    const visibleChars = Math.max(1, Math.floor(value.length * 0.2));
    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    return `${start}${replacement}${end}`;
  }

  private hashValue(value: string): string {
    // Simple hash function - in production, use a proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private applyCustomMasking(value: string, replacement: string): string {
    // Custom masking logic based on replacement pattern
    if (replacement.includes('{length}')) {
      return replacement.replace('{length}', value.length.toString());
    }
    
    if (replacement.includes('{first}')) {
      return replacement.replace('{first}', value.charAt(0));
    }
    
    if (replacement.includes('{last}')) {
      return replacement.replace('{last}', value.charAt(value.length - 1));
    }
    
    return replacement;
  }

  private applyDefaultMasking(value: string): string {
    switch (this.config.defaultMaskType) {
      case 'full':
        return this.config.defaultReplacement;
      
      case 'partial':
        return this.maskPartial(value, this.config.defaultReplacement);
      
      case 'hash':
        return this.hashValue(value);
      
      default:
        return this.maskPartial(value, this.config.defaultReplacement);
    }
  }

  async maskApiResponse(
    response: any,
    endpoint: string,
    method: string
  ): Promise<any> {
    if (!this.config.enabled) {
      return response;
    }

    const context = `${method.toUpperCase()}:${endpoint}`;
    const maskedResponse = this.maskData(response, context);

    if (this.config.logMasking) {
      await this.logMaskingEvent(endpoint, method, 'response');
    }

    return maskedResponse;
  }

  async maskApiRequest(
    request: any,
    endpoint: string,
    method: string
  ): Promise<any> {
    if (!this.config.enabled) {
      return request;
    }

    const context = `${method.toUpperCase()}:${endpoint}`;
    const maskedRequest = this.maskData(request, context);

    if (this.config.logMasking) {
      await this.logMaskingEvent(endpoint, method, 'request');
    }

    return maskedRequest;
  }

  private async logMaskingEvent(endpoint: string, method: string, type: string): Promise<void> {
    try {
      await supabaseClient.insert('masking_logs', {
        endpoint,
        method,
        type,
        masked_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging masking event:', error);
    }
  }

  async getMaskingRules(): Promise<MaskingRule[]> {
    return [...this.rules];
  }

  async getMaskingConfig(): Promise<MaskingConfig> {
    return { ...this.config };
  }

  async updateMaskingConfig(newConfig: Partial<MaskingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
  }

  async testMaskingRules(testData: any, context: string): Promise<{
    original: any;
    masked: any;
    appliedRules: string[];
  }> {
    const original = JSON.parse(JSON.stringify(testData));
    const masked = this.maskData(testData, context);
    
    const appliedRules: string[] = [];
    for (const rule of this.rules) {
      if (this.matchesPattern(context, rule.field_pattern)) {
        appliedRules.push(`${rule.field_pattern} (${rule.mask_type})`);
      }
    }

    return {
      original,
      masked,
      appliedRules
    };
  }

  async cleanupOldMaskingLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const response = await supabaseClient.get('masking_logs', {
        select: 'id',
        filters: {
          masked_at: { lt: cutoffDate.toISOString() }
        }
      });

      if (response.error || !response.data) {
        return 0;
      }

      let cleanedCount = 0;
      for (const log of response.data) {
        await supabaseClient.delete('masking_logs', log.id);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up old masking logs:', error);
      return 0;
    }
  }
}

// Global API masking manager instance
export const apiMaskingManager = ApiMaskingManager.getInstance();

// Helper functions
export function maskData(data: any, context?: string): any {
  return apiMaskingManager.maskData(data, context);
}

export async function maskApiResponse(
  response: any,
  endpoint: string,
  method: string
): Promise<any> {
  return await apiMaskingManager.maskApiResponse(response, endpoint, method);
}

export async function maskApiRequest(
  request: any,
  endpoint: string,
  method: string
): Promise<any> {
  return await apiMaskingManager.maskApiRequest(request, endpoint, method);
}

export async function testMaskingRules(
  testData: any,
  context: string
): Promise<{
  original: any;
  masked: any;
  appliedRules: string[];
}> {
  return await apiMaskingManager.testMaskingRules(testData, context);
}
