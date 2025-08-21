import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent, SecurityEventType, LogLevel } from './logger';
import { auditTrail, AuditEventType } from './audit-trail';

// Alert severity levels
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Alert types
export enum AlertType {
  SECURITY_BREACH = 'SECURITY_BREACH',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  DATA_BREACH = 'DATA_BREACH',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE'
}

// Alert interface
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  userEmail?: string;
  ipAddress?: string;
  metadata?: any;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

// Monitoring rule interface
export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  conditions: {
    eventType: string;
    threshold: number;
    timeWindow: number; // in minutes
    userEmail?: string;
    ipAddress?: string;
    endpoint?: string;
  };
  enabled: boolean;
  actions: AlertAction[];
}

// Alert action interface
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'database' | 'log';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    channel?: string;
    template?: string;
  };
}

// Monitoring configuration
interface MonitoringConfig {
  enabled: boolean;
  alertRetentionDays: number;
  maxAlertsPerHour: number;
  emailNotifications: boolean;
  webhookNotifications: boolean;
  slackNotifications: boolean;
  autoAcknowledgeLowSeverity: boolean;
  alertCooldownMinutes: number;
}

// Default monitoring configuration
const defaultMonitoringConfig: MonitoringConfig = {
  enabled: true,
  alertRetentionDays: 30,
  maxAlertsPerHour: 100,
  emailNotifications: true,
  webhookNotifications: false,
  slackNotifications: false,
  autoAcknowledgeLowSeverity: true,
  alertCooldownMinutes: 5
};

// Predefined monitoring rules
const defaultMonitoringRules: MonitoringRule[] = [
  {
    id: 'rate-limit-exceeded',
    name: 'Rate Limit Exceeded',
    description: 'Multiple rate limit violations from same IP',
    type: AlertType.RATE_LIMIT_EXCEEDED,
    severity: AlertSeverity.MEDIUM,
    conditions: {
      eventType: 'rate_limit_exceeded',
      threshold: 5,
      timeWindow: 15
    },
    enabled: true,
    actions: [
      { type: 'log', config: {} },
      { type: 'database', config: {} }
    ]
  },
  {
    id: 'failed-login-attempts',
    name: 'Failed Login Attempts',
    description: 'Multiple failed login attempts from same IP',
    type: AlertType.SECURITY_BREACH,
    severity: AlertSeverity.HIGH,
    conditions: {
      eventType: 'login_failed',
      threshold: 3,
      timeWindow: 10
    },
    enabled: true,
    actions: [
      { type: 'log', config: {} },
      { type: 'database', config: {} },
      { type: 'email', config: { recipients: ['admin@example.com'] } }
    ]
  },
  {
    id: 'suspicious-data-access',
    name: 'Suspicious Data Access',
    description: 'Unusual data access patterns',
    type: AlertType.SUSPICIOUS_ACTIVITY,
    severity: AlertSeverity.MEDIUM,
    conditions: {
      eventType: 'data_access',
      threshold: 50,
      timeWindow: 5
    },
    enabled: true,
    actions: [
      { type: 'log', config: {} },
      { type: 'database', config: {} }
    ]
  },
  {
    id: 'access-denied-pattern',
    name: 'Access Denied Pattern',
    description: 'Multiple access denied events',
    type: AlertType.ACCESS_DENIED,
    severity: AlertSeverity.HIGH,
    conditions: {
      eventType: 'access_denied',
      threshold: 10,
      timeWindow: 10
    },
    enabled: true,
    actions: [
      { type: 'log', config: {} },
      { type: 'database', config: {} },
      { type: 'email', config: { recipients: ['security@example.com'] } }
    ]
  }
];

// Monitoring manager class
export class MonitoringManager {
  private config: MonitoringConfig;
  private rules: MonitoringRule[];
  private alertCache: Map<string, Alert[]>;
  private eventCounters: Map<string, { count: number; firstSeen: number }>;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...defaultMonitoringConfig, ...config };
    this.rules = [...defaultMonitoringRules];
    this.alertCache = new Map();
    this.eventCounters = new Map();
  }

  // Process a security event
  async processSecurityEvent(
    eventType: SecurityEventType,
    userEmail: string,
    request: NextRequest,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const eventKey = this.createEventKey(eventType, userEmail, request);
    this.incrementEventCounter(eventKey);

    // Check rules for this event type
    const applicableRules = this.rules.filter(rule => 
      rule.enabled && rule.conditions.eventType === eventType
    );

    for (const rule of applicableRules) {
      await this.evaluateRule(rule, eventKey, userEmail, request, metadata);
    }
  }

  // Process an audit event
  async processAuditEvent(
    eventType: AuditEventType,
    userEmail: string,
    request: NextRequest,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enabled) return;

    const eventKey = this.createEventKey(eventType, userEmail, request);
    this.incrementEventCounter(eventKey);

    // Check rules for this event type
    const applicableRules = this.rules.filter(rule => 
      rule.enabled && rule.conditions.eventType === eventType
    );

    for (const rule of applicableRules) {
      await this.evaluateRule(rule, eventKey, userEmail, request, metadata);
    }
  }

  // Evaluate a monitoring rule
  private async evaluateRule(
    rule: MonitoringRule,
    eventKey: string,
    userEmail: string,
    request: NextRequest,
    metadata?: any
  ): Promise<void> {
    const counter = this.eventCounters.get(eventKey);
    if (!counter) return;

    const timeWindowMs = rule.conditions.timeWindow * 60 * 1000;
    const timeSinceFirstSeen = Date.now() - counter.firstSeen;

    // Check if within time window and threshold exceeded
    if (timeSinceFirstSeen <= timeWindowMs && counter.count >= rule.conditions.threshold) {
      // Check if alert already exists (cooldown)
      const existingAlert = this.getExistingAlert(rule.id, eventKey);
      if (existingAlert) return;

      // Create alert
      const alert = await this.createAlert(rule, eventKey, userEmail, request, metadata);
      
      // Execute alert actions
      await this.executeAlertActions(alert, rule.actions);
    }
  }

  // Create an alert
  private async createAlert(
    rule: MonitoringRule,
    eventKey: string,
    userEmail: string,
    request: NextRequest,
    metadata?: any
  ): Promise<Alert> {
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: rule.description,
      source: eventKey,
      userEmail,
      ipAddress: this.extractIP(request),
      metadata,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false
    };

    // Store alert in cache
    if (!this.alertCache.has(rule.id)) {
      this.alertCache.set(rule.id, []);
    }
    this.alertCache.get(rule.id)!.push(alert);

    // Log alert creation
    logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        alertId: alert.id,
        ruleId: rule.id,
        eventKey,
        userEmail,
        severity: alert.severity
      },
      request,
      LogLevel.WARN
    );

    return alert;
  }

  // Execute alert actions
  private async executeAlertActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'log':
            await this.executeLogAction(alert);
            break;
          case 'database':
            await this.executeDatabaseAction(alert);
            break;
          case 'email':
            await this.executeEmailAction(alert, action.config);
            break;
          case 'webhook':
            await this.executeWebhookAction(alert, action.config);
            break;
          case 'slack':
            await this.executeSlackAction(alert, action.config);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  // Execute log action
  private async executeLogAction(alert: Alert): Promise<void> {
    logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        alert: alert,
        action: 'log'
      },
      undefined,
      LogLevel.WARN
    );
  }

  // Execute database action
  private async executeDatabaseAction(alert: Alert): Promise<void> {
    // Save alert to database (implement based on your database)
    // This would typically save to a alerts table
    console.log('Saving alert to database:', alert);
  }

  // Execute email action
  private async executeEmailAction(alert: Alert, config: any): Promise<void> {
    if (!this.config.emailNotifications) return;

    const recipients = config.recipients || ['admin@example.com'];
    
    // Implement email sending logic
    console.log(`Sending email alert to ${recipients.join(', ')}:`, alert);
    
    // Example email template
    const emailContent = `
      Security Alert: ${alert.title}
      
      Severity: ${alert.severity}
      Time: ${alert.timestamp}
      User: ${alert.userEmail || 'Unknown'}
      IP: ${alert.ipAddress || 'Unknown'}
      
      Message: ${alert.message}
      
      Please investigate this security event immediately.
    `;
    
    // Send email (implement with your email service)
    // await sendEmail(recipients, 'Security Alert', emailContent);
  }

  // Execute webhook action
  private async executeWebhookAction(alert: Alert, config: any): Promise<void> {
    if (!this.config.webhookNotifications || !config.webhookUrl) return;

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  // Execute Slack action
  private async executeSlackAction(alert: Alert, config: any): Promise<void> {
    if (!this.config.slackNotifications || !config.webhookUrl) return;

    try {
      const slackMessage = {
        text: `🚨 Security Alert: ${alert.title}`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'User', value: alert.userEmail || 'Unknown', short: true },
              { title: 'IP Address', value: alert.ipAddress || 'Unknown', short: true },
              { title: 'Time', value: alert.timestamp, short: true },
              { title: 'Message', value: alert.message, short: false }
            ]
          }
        ]
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage)
      });

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  // Get severity color for Slack
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return '#36a64f';
      case AlertSeverity.MEDIUM: return '#ffa500';
      case AlertSeverity.HIGH: return '#ff0000';
      case AlertSeverity.CRITICAL: return '#8b0000';
      default: return '#808080';
    }
  }

  // Create event key for tracking
  private createEventKey(
    eventType: string,
    userEmail: string,
    request: NextRequest
  ): string {
    const ip = this.extractIP(request);
    return `${eventType}:${userEmail}:${ip}`;
  }

  // Increment event counter
  private incrementEventCounter(eventKey: string): void {
    const now = Date.now();
    const existing = this.eventCounters.get(eventKey);
    
    if (existing) {
      existing.count++;
    } else {
      this.eventCounters.set(eventKey, {
        count: 1,
        firstSeen: now
      });
    }
  }

  // Get existing alert (for cooldown)
  private getExistingAlert(ruleId: string, eventKey: string): Alert | undefined {
    const alerts = this.alertCache.get(ruleId) || [];
    const cooldownMs = this.config.alertCooldownMinutes * 60 * 1000;
    
    return alerts.find(alert => 
      alert.source === eventKey && 
      Date.now() - new Date(alert.timestamp).getTime() < cooldownMs
    );
  }

  // Extract IP address from request
  private extractIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           request.ip || 
           'unknown';
  }

  // Get all active alerts
  getActiveAlerts(): Alert[] {
    const allAlerts: Alert[] = [];
    const alertArrays = Array.from(this.alertCache.values());
    for (const alerts of alertArrays) {
      allAlerts.push(...alerts.filter((alert: Alert) => !alert.resolved));
    }
    return allAlerts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Acknowledge an alert
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alertArrays = Array.from(this.alertCache.values());
    for (const alerts of alertArrays) {
      const alert = alerts.find((a: Alert) => a.id === alertId);
      if (alert && !alert.acknowledged) {
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
        break;
      }
    }
  }

  // Resolve an alert
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alertArrays = Array.from(this.alertCache.values());
    for (const alerts of alertArrays) {
      const alert = alerts.find((a: Alert) => a.id === alertId);
      if (alert && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedBy = resolvedBy;
        alert.resolvedAt = new Date().toISOString();
        break;
      }
    }
  }

  // Add a custom monitoring rule
  addRule(rule: MonitoringRule): void {
    this.rules.push(rule);
  }

  // Remove a monitoring rule
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  // Get monitoring statistics
  getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
  } {
    const allAlerts = this.getActiveAlerts();
    const stats = {
      totalAlerts: allAlerts.length,
      activeAlerts: allAlerts.filter(a => !a.resolved).length,
      alertsBySeverity: {} as Record<string, number>,
      alertsByType: {} as Record<string, number>
    };

    allAlerts.forEach(alert => {
      stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
      stats.alertsByType[alert.type] = (stats.alertsByType[alert.type] || 0) + 1;
    });

    return stats;
  }

  // Clean up old alerts and counters
  cleanup(): void {
    const now = Date.now();
    const retentionMs = this.config.alertRetentionDays * 24 * 60 * 60 * 1000;

    // Clean up old alerts
    const alertEntries = Array.from(this.alertCache.entries());
    for (const [ruleId, alerts] of alertEntries) {
      this.alertCache.set(ruleId, alerts.filter((alert: Alert) => 
        now - new Date(alert.timestamp).getTime() < retentionMs
      ));
    }

    // Clean up old counters
    const counterEntries = Array.from(this.eventCounters.entries());
    for (const [eventKey, counter] of counterEntries) {
      const timeWindowMs = 60 * 60 * 1000; // 1 hour
      if (now - counter.firstSeen > timeWindowMs) {
        this.eventCounters.delete(eventKey);
      }
    }
  }
}

// Global monitoring instance
export const monitoring = new MonitoringManager();

// Monitoring middleware
export function withMonitoring(
  eventType: SecurityEventType | AuditEventType
) {
  return function(handler: (request: NextRequest, userEmail: string) => Promise<NextResponse>) {
    return async function(request: NextRequest): Promise<NextResponse> {
      const userEmail = 'anonymous'; // Extract from request based on your auth system
      
      try {
        const response = await handler(request, userEmail);
        
        // Process security event for monitoring
        if (Object.values(SecurityEventType).includes(eventType as SecurityEventType)) {
          await monitoring.processSecurityEvent(
            eventType as SecurityEventType,
            userEmail,
            request
          );
        } else {
          await monitoring.processAuditEvent(
            eventType as AuditEventType,
            userEmail,
            request
          );
        }
        
        return response;
      } catch (error) {
        // Process error event
        await monitoring.processSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          userEmail,
          request,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        
        throw error;
      }
    };
  };
}
