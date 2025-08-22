import { supabaseClient } from './supabase-client';

export interface SecurityRule {
  id?: string;
  name: string;
  description: string;
  rule_type: 'monitoring' | 'blocking' | 'alerting';
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: any;
}

export interface SecurityAction {
  type: 'block_ip' | 'alert_admin' | 'log_event' | 'rate_limit' | 'require_2fa';
  parameters?: Record<string, any>;
}

export interface SecurityEvent {
  id?: string;
  rule_id: string;
  user_email?: string;
  ip_address?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: any;
  created_at?: string;
  resolved_at?: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export interface APICall {
  id?: string;
  ip_address?: string;
  user_email?: string;
  endpoint?: string;
  method?: string;
  created_at?: string;
}

export class SecurityAutomationManager {
  private static instance: SecurityAutomationManager;
  private rules: SecurityRule[] = [];
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): SecurityAutomationManager {
    if (!SecurityAutomationManager.instance) {
      SecurityAutomationManager.instance = new SecurityAutomationManager();
    }
    return SecurityAutomationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadRules();
      await this.startMonitoring();
    } catch (error) {
      console.error('Error initializing security automation:', error);
    }
  }

  async loadRules(): Promise<void> {
    try {
      const response = await supabaseClient.get('security_rules', {
        select: '*',
        filters: { is_active: true },
        order: { column: 'priority', ascending: false }
      });

      if (response.error) {
        console.error('Error loading security rules:', response.error);
        return;
      }

      this.rules = response.data || [];
      console.log(`Loaded ${this.rules.length} security rules`);
    } catch (error) {
      console.error('Error loading security rules:', error);
    }
  }

  async createRule(rule: Omit<SecurityRule, 'id' | 'created_at' | 'updated_at'>): Promise<SecurityRule | null> {
    try {
      const response = await supabaseClient.insert('security_rules', {
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error creating security rule:', response.error);
        return null;
      }

      const newRule = response.data;
      this.rules.push(newRule);
      this.rules.sort((a, b) => b.priority - a.priority);

      return newRule;
    } catch (error) {
      console.error('Error creating security rule:', error);
      return null;
    }
  }

  async updateRule(ruleId: string, updates: Partial<SecurityRule>): Promise<boolean> {
    try {
      const response = await supabaseClient.update('security_rules', ruleId, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      if (response.error) {
        console.error('Error updating security rule:', response.error);
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
      console.error('Error updating security rule:', error);
      return false;
    }
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.delete('security_rules', ruleId);

      if (response.error) {
        console.error('Error deleting security rule:', response.error);
        return false;
      }

      // Remove from local rules
      this.rules = this.rules.filter(r => r.id !== ruleId);
      return true;
    } catch (error) {
      console.error('Error deleting security rule:', error);
      return false;
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Security monitoring started');

    // Start monitoring loop
    setInterval(async () => {
      if (this.isRunning) {
        await this.runSecurityChecks();
      }
    }, 30000); // Check every 30 seconds
  }

  async stopMonitoring(): Promise<void> {
    this.isRunning = false;
    console.log('Security monitoring stopped');
  }

  private async runSecurityChecks(): Promise<void> {
    try {
      // Check for suspicious activities
      await this.checkSuspiciousActivities();
      
      // Check for rate limit violations
      await this.checkRateLimitViolations();
      
      // Check for unusual access patterns
      await this.checkAccessPatterns();
    } catch (error) {
      console.error('Error running security checks:', error);
    }
  }

  private async checkSuspiciousActivities(): Promise<void> {
    try {
      // Get recent failed login attempts
      const response = await supabaseClient.get('security_alerts', {
        select: '*',
        filters: {
          alert_type: 'failed_login',
          created_at: { gte: new Date(Date.now() - 5 * 60 * 1000).toISOString() } // Last 5 minutes
        }
      });

      if (response.error || !response.data) return;

      const failedLogins = response.data;
      
      // Check for brute force attempts
      if (failedLogins.length > 10) {
        await this.triggerSecurityAction('brute_force_detected', {
          count: failedLogins.length,
          timeWindow: '5 minutes'
        });
      }
    } catch (error) {
      console.error('Error checking suspicious activities:', error);
    }
  }

  private async checkRateLimitViolations(): Promise<void> {
    try {
      // Get recent API calls
      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters: {
          event_type: 'API_CALL',
          created_at: { gte: new Date(Date.now() - 60 * 1000).toISOString() } // Last minute
        }
      });

      if (response.error || !response.data) return;

      const apiCalls = response.data as APICall[];
      
      // Group by IP address
      const callsByIP: Record<string, number> = {};
      apiCalls.forEach((call: APICall) => {
        const ip = call.ip_address || 'unknown';
        callsByIP[ip] = (callsByIP[ip] || 0) + 1;
      });

      // Check for rate limit violations
      Object.entries(callsByIP).forEach(([ip, count]) => {
        if (count > 100) { // More than 100 calls per minute
          this.triggerSecurityAction('rate_limit_violation', {
            ip_address: ip,
            call_count: count,
            timeWindow: '1 minute'
          });
        }
      });
    } catch (error) {
      console.error('Error checking rate limit violations:', error);
    }
  }

  private async checkAccessPatterns(): Promise<void> {
    try {
      // Get recent user access patterns
      const response = await supabaseClient.get('audit_trail', {
        select: '*',
        filters: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } // Last 24 hours
        },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error || !response.data) return;

      const accessLogs = response.data as any[];
      
      // Group by user
      const accessByUser: Record<string, any[]> = {};
      accessLogs.forEach((log: any) => {
        const user = log.user_email || 'anonymous';
        if (!accessByUser[user]) {
          accessByUser[user] = [];
        }
        accessByUser[user].push(log);
      });

      // Check for unusual patterns
      Object.entries(accessByUser).forEach(([user, logs]) => {
        if (logs.length > 1000) { // More than 1000 actions per day
          this.triggerSecurityAction('unusual_activity', {
            user_email: user,
            action_count: logs.length,
            timeWindow: '24 hours'
          });
        }
      });
    } catch (error) {
      console.error('Error checking access patterns:', error);
    }
  }

  private async triggerSecurityAction(actionType: string, parameters: Record<string, any>): Promise<void> {
    try {
      // Find applicable rules
      const applicableRules = this.rules.filter(rule => 
        rule.conditions.some(condition => 
          condition.field === 'action_type' && 
          condition.operator === 'equals' && 
          condition.value === actionType
        )
      );

      for (const rule of applicableRules) {
        // Execute rule actions
        for (const action of rule.actions) {
          await this.executeAction(action, parameters);
        }

        // Log security event
        await this.logSecurityEvent(rule, actionType, parameters);
      }
    } catch (error) {
      console.error('Error triggering security action:', error);
    }
  }

  private async executeAction(action: SecurityAction, parameters: Record<string, any>): Promise<void> {
    try {
      switch (action.type) {
        case 'block_ip':
          await this.blockIP(parameters.ip_address);
          break;
        case 'alert_admin':
          await this.alertAdmin(action, parameters);
          break;
        case 'log_event':
          await this.logSecurityEvent(null, 'security_action', { action, parameters });
          break;
        case 'rate_limit':
          await this.applyRateLimit(parameters.ip_address, action.parameters);
          break;
        case 'require_2fa':
          await this.require2FA(parameters.user_email);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error('Error executing security action:', error);
    }
  }

  private async blockIP(ipAddress: string): Promise<void> {
    try {
      // Add IP to blocked list
      await supabaseClient.insert('blocked_ips', {
        ip_address: ipAddress,
        reason: 'Security automation',
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Block for 24 hours
      });

      console.log(`IP ${ipAddress} blocked by security automation`);
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  }

  private async alertAdmin(action: SecurityAction, parameters: Record<string, any>): Promise<void> {
    try {
      // Create admin alert
      await supabaseClient.insert('security_alerts', {
        alert_type: 'admin_alert',
        severity: 'high',
        description: `Security automation triggered: ${action.type}`,
        metadata: { action, parameters },
        created_at: new Date().toISOString()
      });

      console.log('Admin alert created by security automation');
    } catch (error) {
      console.error('Error creating admin alert:', error);
    }
  }

  private async applyRateLimit(ipAddress: string, rateLimitParams?: Record<string, any>): Promise<void> {
    try {
      const limit = rateLimitParams?.limit || 10;
      const window = rateLimitParams?.window || 60; // seconds

      // Add rate limit entry
      await supabaseClient.insert('rate_limits', {
        ip_address: ipAddress,
        limit: limit,
        window: window,
        applied_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + window * 1000).toISOString()
      });

      console.log(`Rate limit applied to IP ${ipAddress}: ${limit} requests per ${window} seconds`);
    } catch (error) {
      console.error('Error applying rate limit:', error);
    }
  }

  private async require2FA(userEmail: string): Promise<void> {
    try {
      // Update user to require 2FA
      await supabaseClient.update('users', userEmail, {
        require_2fa: true,
        updated_at: new Date().toISOString()
      });

      console.log(`2FA required for user ${userEmail}`);
    } catch (error) {
      console.error('Error requiring 2FA:', error);
    }
  }

  private async logSecurityEvent(
    rule: SecurityRule | null,
    eventType: string,
    parameters: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseClient.insert('security_events', {
        rule_id: rule?.id || 'system',
        event_type: eventType,
        severity: 'medium',
        description: `Security automation event: ${eventType}`,
        metadata: parameters,
        created_at: new Date().toISOString(),
        status: 'open'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  async getSecurityEvents(
    filters?: {
      rule_id?: string;
      severity?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SecurityEvent[]> {
    try {
      const queryFilters: any = {};
      
      if (filters?.rule_id) queryFilters.rule_id = filters.rule_id;
      if (filters?.severity) queryFilters.severity = filters.severity;
      if (filters?.status) queryFilters.status = filters.status;

      const response = await supabaseClient.get('security_events', {
        select: '*',
        filters: queryFilters,
        order: { column: 'created_at', ascending: false },
        limit: filters?.limit || 100,
        offset: filters?.offset || 0
      });

      if (response.error) {
        console.error('Error getting security events:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }
}

// Global security automation manager instance
export const securityAutomation = SecurityAutomationManager.getInstance();

// Helper functions
export async function initializeSecurityAutomation(): Promise<void> {
  await securityAutomation.initialize();
}

export async function createSecurityRule(rule: Omit<SecurityRule, 'id' | 'created_at' | 'updated_at'>): Promise<SecurityRule | null> {
  return await securityAutomation.createRule(rule);
}

export async function getSecurityEvents(filters?: any): Promise<SecurityEvent[]> {
  return await securityAutomation.getSecurityEvents(filters);
}
