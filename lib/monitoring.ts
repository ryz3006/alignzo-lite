import { supabaseClient } from './supabase-client';

export interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_users: number;
  api_requests_per_minute: number;
  error_rate: number;
  response_time_avg: number;
}

export interface AlertRule {
  id?: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  created_at?: string;
}

export interface Alert {
  id?: string;
  rule_id: string;
  metric_value: number;
  threshold: number;
  severity: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at?: string;
  resolved_at?: string;
}

export interface AuditLog {
  id?: string;
  metadata?: {
    responseTime?: number;
    [key: string]: any;
  };
  created_at?: string;
}

export class MonitoringManager {
  private static instance: MonitoringManager;
  private alertRules: AlertRule[] = [];
  private isRunning: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadAlertRules();
      await this.startMonitoring();
    } catch (error) {
      console.error('Error initializing monitoring:', error);
    }
  }

  async loadAlertRules(): Promise<void> {
    try {
      const response = await supabaseClient.get('alert_rules', {
        select: '*',
        filters: { is_active: true }
      });

      if (response.error) {
        console.error('Error loading alert rules:', response.error);
        return;
      }

      this.alertRules = response.data || [];
      console.log(`Loaded ${this.alertRules.length} alert rules`);
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('System monitoring started');

    // Collect metrics every minute
    this.metricsInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.collectMetrics();
        await this.checkAlerts();
      }
    }, 60000); // Every minute
  }

  async stopMonitoring(): Promise<void> {
    this.isRunning = false;
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    console.log('System monitoring stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        cpu_usage: await this.getCPUUsage(),
        memory_usage: await this.getMemoryUsage(),
        disk_usage: await this.getDiskUsage(),
        active_users: await this.getActiveUsers(),
        api_requests_per_minute: await this.getAPIRequestsPerMinute(),
        error_rate: await this.getErrorRate(),
        response_time_avg: await this.getAverageResponseTime()
      };

      // Store metrics
      await this.storeMetrics(metrics);

      // Check if metrics exceed thresholds
      await this.checkMetricThresholds(metrics);
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Simulate CPU usage - in production, use actual system metrics
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // Simulate memory usage - in production, use actual system metrics
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    // Simulate disk usage - in production, use actual system metrics
    return Math.random() * 100;
  }

  private async getActiveUsers(): Promise<number> {
    try {
      const response = await supabaseClient.get('sessions', {
        select: 'id',
        filters: { is_active: true }
      });

      if (response.error) return 0;
      return response.data?.length || 0;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  }

  private async getAPIRequestsPerMinute(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const response = await supabaseClient.get('audit_trail', {
        select: 'id',
        filters: {
          event_type: 'API_CALL',
          created_at: { gte: oneMinuteAgo.toISOString() }
        }
      });

      if (response.error) return 0;
      return response.data?.length || 0;
    } catch (error) {
      console.error('Error getting API requests per minute:', error);
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const totalResponse = await supabaseClient.get('audit_trail', {
        select: 'id',
        filters: {
          created_at: { gte: oneMinuteAgo.toISOString() }
        }
      });

      const errorResponse = await supabaseClient.get('audit_trail', {
        select: 'id',
        filters: {
          success: false,
          created_at: { gte: oneMinuteAgo.toISOString() }
        }
      });

      if (totalResponse.error || errorResponse.error) return 0;
      
      const total = totalResponse.data?.length || 0;
      const errors = errorResponse.data?.length || 0;
      
      return total > 0 ? (errors / total) * 100 : 0;
    } catch (error) {
      console.error('Error getting error rate:', error);
      return 0;
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const response = await supabaseClient.get('audit_trail', {
        select: 'metadata',
        filters: {
          event_type: 'API_CALL',
          created_at: { gte: oneMinuteAgo.toISOString() },
          metadata: { has_key: 'responseTime' }
        }
      });

      if (response.error || !response.data) return 0;
      
      const responseTimes = response.data
        .map((log: AuditLog) => log.metadata?.responseTime)
        .filter((time: any) => typeof time === 'number');
      
      if (responseTimes.length === 0) return 0;
      
      const sum = responseTimes.reduce((acc: number, time: number) => acc + time, 0);
      return sum / responseTimes.length;
    } catch (error) {
      console.error('Error getting average response time:', error);
      return 0;
    }
  }

  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      await supabaseClient.insert('system_metrics', metrics);
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }

  private async checkMetricThresholds(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      const metricValue = metrics[rule.metric as keyof SystemMetrics];
      
      if (typeof metricValue !== 'number') continue;
      
      let shouldAlert = false;
      
      switch (rule.operator) {
        case 'greater_than':
          shouldAlert = metricValue > rule.threshold;
          break;
        case 'less_than':
          shouldAlert = metricValue < rule.threshold;
          break;
        case 'equals':
          shouldAlert = metricValue === rule.threshold;
          break;
        case 'not_equals':
          shouldAlert = metricValue !== rule.threshold;
          break;
      }
      
      if (shouldAlert) {
        await this.createAlert(rule, metricValue);
      }
    }
  }

  private async createAlert(rule: AlertRule, metricValue: number): Promise<void> {
    try {
      const alert: Omit<Alert, 'id' | 'created_at'> = {
        rule_id: rule.id!,
        metric_value: metricValue,
        threshold: rule.threshold,
        severity: rule.severity,
        message: `Metric ${rule.metric} (${metricValue}) exceeded threshold ${rule.threshold}`,
        status: 'open'
      };

      await supabaseClient.insert('alerts', {
        ...alert,
        created_at: new Date().toISOString()
      });

      console.log(`Alert created: ${alert.message}`);
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      // Check for new alerts that need attention
      const response = await supabaseClient.get('alerts', {
        select: '*',
        filters: { status: 'open' },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error || !response.data) return;

      const openAlerts = response.data as Alert[];
      
      // Process critical alerts first
      const criticalAlerts = openAlerts.filter((alert: Alert) => alert.severity === 'critical');
      for (const alert of criticalAlerts) {
        await this.processCriticalAlert(alert);
      }

      // Process high severity alerts
      const highAlerts = openAlerts.filter((alert: Alert) => alert.severity === 'high');
      for (const alert of highAlerts) {
        await this.processHighAlert(alert);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private async processCriticalAlert(alert: Alert): Promise<void> {
    try {
      // For critical alerts, immediately notify administrators
      await this.notifyAdministrators(alert, 'CRITICAL');
      
      // Create security alert
      await supabaseClient.insert('security_alerts', {
        alert_type: 'system_alert',
        severity: 'critical',
        description: `Critical system alert: ${alert.message}`,
        metadata: { alert_id: alert.id, metric_value: alert.metric_value },
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing critical alert:', error);
    }
  }

  private async processHighAlert(alert: Alert): Promise<void> {
    try {
      // For high alerts, notify administrators with lower priority
      await this.notifyAdministrators(alert, 'HIGH');
    } catch (error) {
      console.error('Error processing high alert:', error);
    }
  }

  private async notifyAdministrators(alert: Alert, priority: string): Promise<void> {
    try {
      // In production, this would send actual notifications
      // For now, just log the notification
      console.log(`[${priority}] Admin notification: ${alert.message}`);
      
      // You could integrate with email, Slack, or other notification systems here
    } catch (error) {
      console.error('Error notifying administrators:', error);
    }
  }

  async getMetrics(
    startTime?: string,
    endTime?: string,
    limit: number = 100
  ): Promise<SystemMetrics[]> {
    try {
      const filters: any = {};
      
      if (startTime) filters.timestamp = { gte: startTime };
      if (endTime) filters.timestamp = { lte: endTime };

      const response = await supabaseClient.get('system_metrics', {
        select: '*',
        filters,
        order: { column: 'timestamp', ascending: false },
        limit
      });

      if (response.error) {
        console.error('Error getting metrics:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting metrics:', error);
      return [];
    }
  }

  async getAlerts(
    status?: string,
    severity?: string,
    limit: number = 100
  ): Promise<Alert[]> {
    try {
      const filters: any = {};
      
      if (status) filters.status = status;
      if (severity) filters.severity = severity;

      const response = await supabaseClient.get('alerts', {
        select: '*',
        filters,
        order: { column: 'created_at', ascending: false },
        limit
      });

      if (response.error) {
        console.error('Error getting alerts:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('alerts', alertId, {
        status: 'acknowledged',
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('alerts', alertId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }
}

// Global monitoring manager instance
export const monitoringManager = MonitoringManager.getInstance();

// Helper functions
export async function initializeMonitoring(): Promise<void> {
  await monitoringManager.initialize();
}

export async function getSystemMetrics(startTime?: string, endTime?: string): Promise<SystemMetrics[]> {
  return await monitoringManager.getMetrics(startTime, endTime);
}

export async function getSystemAlerts(status?: string, severity?: string): Promise<Alert[]> {
  return await monitoringManager.getAlerts(status, severity);
}
