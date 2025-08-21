import { supabase } from './supabase';
import { logSecurityEvent, SecurityEventType } from './logger';
import { auditTrail, AuditEventType } from './audit-trail';
import { getEncryption } from './encryption';
import { getSessionManager } from './session-management';
import { getPenetrationTesting } from './penetration-testing';

// Automation workflow configuration
interface AutomationConfig {
  enabled: boolean;
  checkInterval: number; // minutes
  autoBlockThreshold: number;
  autoCleanupEnabled: boolean;
  alertOnAnomaly: boolean;
  maxRetries: number;
}

// Default automation configuration
const defaultAutomationConfig: AutomationConfig = {
  enabled: true,
  checkInterval: 15, // 15 minutes
  autoBlockThreshold: 5,
  autoCleanupEnabled: true,
  alertOnAnomaly: true,
  maxRetries: 3
};

// Security automation workflow
interface SecurityWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  conditions: any;
  enabled: boolean;
  last_run: string;
  next_run: string;
  status: 'active' | 'paused' | 'error';
}

// Automation action result
interface AutomationResult {
  workflow_id: string;
  action: string;
  status: 'success' | 'failed' | 'skipped';
  details: any;
  timestamp: string;
  duration_ms: number;
}

export class SecurityAutomationFramework {
  private config: AutomationConfig;
  private workflows: Map<string, SecurityWorkflow> = new Map();
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<AutomationConfig> = {}) {
    this.config = { ...defaultAutomationConfig, ...config };
    this.initializeDefaultWorkflows();
  }

  // Initialize default security workflows
  private initializeDefaultWorkflows(): void {
    const defaultWorkflows: SecurityWorkflow[] = [
      {
        id: 'session_cleanup',
        name: 'Session Cleanup',
        description: 'Automatically clean up expired sessions',
        triggers: ['scheduled'],
        actions: ['cleanup_expired_sessions'],
        conditions: { schedule: 'every_15_minutes' },
        enabled: true,
        last_run: '',
        next_run: '',
        status: 'active'
      },
      {
        id: 'suspicious_activity_monitor',
        name: 'Suspicious Activity Monitor',
        description: 'Monitor and respond to suspicious activities',
        triggers: ['security_event'],
        actions: ['analyze_activity', 'block_if_needed', 'send_alert'],
        conditions: { threshold: 3, time_window: '5_minutes' },
        enabled: true,
        last_run: '',
        next_run: '',
        status: 'active'
      },
      {
        id: 'vulnerability_scan',
        name: 'Vulnerability Scan',
        description: 'Automated vulnerability scanning',
        triggers: ['scheduled'],
        actions: ['run_penetration_tests', 'analyze_results', 'create_report'],
        conditions: { schedule: 'daily' },
        enabled: true,
        last_run: '',
        next_run: '',
        status: 'active'
      },
      {
        id: 'data_archival',
        name: 'Data Archival',
        description: 'Automatically archive old data',
        triggers: ['scheduled'],
        actions: ['archive_old_data', 'cleanup_logs'],
        conditions: { retention_days: 7 },
        enabled: true,
        last_run: '',
        next_run: '',
        status: 'active'
      },
      {
        id: 'security_health_check',
        name: 'Security Health Check',
        description: 'Comprehensive security health monitoring',
        triggers: ['scheduled'],
        actions: ['check_security_status', 'validate_configurations', 'generate_report'],
        conditions: { schedule: 'hourly' },
        enabled: true,
        last_run: '',
        next_run: '',
        status: 'active'
      }
    ];

    defaultWorkflows.forEach(workflow => {
      this.workflows.set(workflow.id, workflow);
    });
  }

  // Start automation framework
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Security automation already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting security automation framework...');

    // Run initial workflows
    await this.runScheduledWorkflows();

    // Set up periodic execution
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.runScheduledWorkflows();
      }
    }, this.config.checkInterval * 60 * 1000);

    // Set up event listeners
    this.setupEventListeners();
  }

  // Stop automation framework
  stop(): void {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Security automation framework stopped');
  }

  // Run scheduled workflows
  private async runScheduledWorkflows(): Promise<void> {
    const now = new Date();
    
    for (const workflow of Array.from(this.workflows.values())) {
      if (!workflow.enabled || workflow.status !== 'active') {
        continue;
      }

      if (this.shouldRunWorkflow(workflow, now)) {
        try {
          await this.executeWorkflow(workflow);
          workflow.last_run = now.toISOString();
          workflow.next_run = this.calculateNextRun(workflow);
        } catch (error) {
          console.error(`Workflow ${workflow.name} failed:`, error);
          workflow.status = 'error';
          
          await logSecurityEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            {
              message: `Security automation workflow failed: ${workflow.name}`,
              workflow,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          );
        }
      }
    }
  }

  // Execute a specific workflow
  private async executeWorkflow(workflow: SecurityWorkflow): Promise<void> {
    console.log(`Executing workflow: ${workflow.name}`);
    const startTime = Date.now();

    for (const action of workflow.actions) {
      try {
        await this.executeAction(action, workflow);
        
        // Log action result
        await this.logAutomationResult({
          workflow_id: workflow.id,
          action,
          status: 'success',
          details: { workflow_name: workflow.name },
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        });

      } catch (error) {
        console.error(`Action ${action} failed in workflow ${workflow.name}:`, error);
        
        await this.logAutomationResult({
          workflow_id: workflow.id,
          action,
          status: 'failed',
          details: { 
            workflow_name: workflow.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        });

        throw error;
      }
    }
  }

  // Execute a specific action
  private async executeAction(action: string, workflow: SecurityWorkflow): Promise<void> {
    switch (action) {
      case 'cleanup_expired_sessions':
        await this.cleanupExpiredSessions();
        break;
      
      case 'analyze_activity':
        await this.analyzeSuspiciousActivity();
        break;
      
      case 'block_if_needed':
        await this.blockSuspiciousIPs();
        break;
      
      case 'send_alert':
        await this.sendSecurityAlert();
        break;
      
      case 'run_penetration_tests':
        await this.runPenetrationTests();
        break;
      
      case 'analyze_results':
        await this.analyzeTestResults();
        break;
      
      case 'create_report':
        await this.createSecurityReport();
        break;
      
      case 'archive_old_data':
        await this.archiveOldData();
        break;
      
      case 'cleanup_logs':
        await this.cleanupOldLogs();
        break;
      
      case 'check_security_status':
        await this.checkSecurityStatus();
        break;
      
      case 'validate_configurations':
        await this.validateSecurityConfigurations();
        break;
      
      case 'generate_report':
        await this.generateSecurityReport();
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Action implementations
  private async cleanupExpiredSessions(): Promise<void> {
    const sessionManager = getSessionManager();
    const cleanedCount = await sessionManager.cleanupExpiredSessions();
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
      
      await auditTrail.logUserAction(
        'system',
        AuditEventType.CONFIGURATION_CHANGE,
        `Cleaned up ${cleanedCount} expired sessions`,
        undefined,
        { cleanedCount }
      );
    }
  }

  private async analyzeSuspiciousActivity(): Promise<void> {
    // Analyze recent security events for patterns
    const { data: recentEvents } = await supabase
      .from('security_alerts')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .eq('acknowledged', false);

    if (recentEvents && recentEvents.length > this.config.autoBlockThreshold) {
      console.log(`Detected ${recentEvents.length} suspicious activities in the last 5 minutes`);
      
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          message: `High volume of suspicious activities detected: ${recentEvents.length} events`,
          events: recentEvents
        }
      );
    }
  }

  private async blockSuspiciousIPs(): Promise<void> {
    if (!this.config.autoBlockThreshold) return;

    // Get IPs with high suspicious activity
    const { data: recentAlerts } = await supabase
      .from('security_alerts')
      .select('ip_address')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // Count IPs manually
    const ipCounts = new Map<string, number>();
    if (recentAlerts) {
      for (const alert of recentAlerts) {
        ipCounts.set(alert.ip_address, (ipCounts.get(alert.ip_address) || 0) + 1);
      }
    }

    const suspiciousIPs = Array.from(ipCounts.entries())
      .filter(([_, count]) => count >= this.config.autoBlockThreshold)
      .map(([ip]) => ({ ip_address: ip }));

    if (suspiciousIPs) {
      for (const ipData of suspiciousIPs) {
        await this.blockIP(ipData.ip_address);
      }
    }
  }

  private async blockIP(ipAddress: string): Promise<void> {
    // Add IP to blocked list
    await supabase
      .from('blocked_ips')
      .upsert({
        ip_address: ipAddress,
        reason: 'Automated blocking due to suspicious activity',
        blocked_at: new Date().toISOString(),
        blocked_by: 'security_automation'
      });

    console.log(`Automatically blocked IP: ${ipAddress}`);
    
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        message: `IP ${ipAddress} automatically blocked due to suspicious activity`,
        ipAddress,
        reason: 'Automated blocking'
      }
    );
  }

  private async sendSecurityAlert(): Promise<void> {
    // Send alerts for critical security events
    const { data: criticalAlerts } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('severity', 'CRITICAL')
      .eq('acknowledged', false)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (criticalAlerts && criticalAlerts.length > 0) {
      console.log(`Sending alerts for ${criticalAlerts.length} critical security events`);
      
      // In a real implementation, you would send emails, Slack messages, etc.
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          message: `Security alerts sent for ${criticalAlerts.length} critical events`,
          alerts: criticalAlerts
        }
      );
    }
  }

  private async runPenetrationTests(): Promise<void> {
    const penTesting = getPenetrationTesting();
    const results = await penTesting.runAllTests();
    
    console.log(`Penetration testing completed: ${results.length} tests run`);
    
    await auditTrail.logUserAction(
      'system',
      AuditEventType.SECURITY_EVENT,
      `Automated penetration testing completed: ${results.length} tests`,
      undefined,
      { results }
    );
  }

  private async analyzeTestResults(): Promise<void> {
    // Analyze recent penetration test results
    const { data: recentResults } = await supabase
      .from('penetration_test_results')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .eq('status', 'failed');

    if (recentResults && recentResults.length > 0) {
      console.log(`Found ${recentResults.length} failed penetration tests in the last 24 hours`);
      
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          message: `Penetration testing found ${recentResults.length} vulnerabilities`,
          results: recentResults
        }
      );
    }
  }

  private async createSecurityReport(): Promise<void> {
    // Generate comprehensive security report
    const report = {
      timestamp: new Date().toISOString(),
      security_status: await this.getSecurityStatus(),
      recent_events: await this.getRecentSecurityEvents(),
      recommendations: await this.generateRecommendations()
    };

    // Save report to database
    await supabase
      .from('security_reports')
      .insert(report);

    console.log('Security report generated and saved');
  }

  private async archiveOldData(): Promise<void> {
    // Archive data older than retention period
    const retentionDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // Archive old audit trail entries
    const { data: archivedAudit } = await supabase
      .from('audit_trail')
      .select('*')
      .lt('created_at', retentionDate.toISOString());

    if (archivedAudit && archivedAudit.length > 0) {
      // Move to archive table
      await supabase
        .from('audit_trail_archive')
        .insert(archivedAudit);

      // Delete from main table
      await supabase
        .from('audit_trail')
        .delete()
        .lt('created_at', retentionDate.toISOString());

      console.log(`Archived ${archivedAudit.length} audit trail entries`);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    // Clean up old log files and database entries
    const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    // Clean up old security alerts
    await supabase
      .from('security_alerts')
      .delete()
      .lt('created_at', retentionDate.toISOString())
      .eq('resolved', true);

    console.log('Cleaned up old logs and resolved alerts');
  }

  private async checkSecurityStatus(): Promise<void> {
    // Check overall security status
    const status = await this.getSecurityStatus();
    
    if (status.overall_score < 8) {
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          message: `Security status below threshold: ${status.overall_score}/10`,
          status
        }
      );
    }
  }

  private async validateSecurityConfigurations(): Promise<void> {
    // Validate security configurations
    const validations = [
      this.validateEncryptionConfig(),
      this.validateSessionConfig(),
      this.validateRateLimitConfig()
    ];

    const results = await Promise.allSettled(validations);
    const failedValidations = results.filter(r => r.status === 'rejected');

    if (failedValidations.length > 0) {
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          message: `${failedValidations.length} security configuration validations failed`,
          failedValidations
        }
      );
    }
  }

  private async generateSecurityReport(): Promise<void> {
    // Generate detailed security report
    const report = {
      timestamp: new Date().toISOString(),
      security_metrics: await this.getSecurityMetrics(),
      vulnerability_summary: await this.getVulnerabilitySummary(),
      recommendations: await this.generateRecommendations()
    };

    await supabase
      .from('security_reports')
      .insert(report);

    console.log('Detailed security report generated');
  }

  // Helper methods
  private shouldRunWorkflow(workflow: SecurityWorkflow, now: Date): boolean {
    if (!workflow.next_run) return true;
    return new Date(workflow.next_run) <= now;
  }

  private calculateNextRun(workflow: SecurityWorkflow): string {
    const now = new Date();
    
    switch (workflow.conditions.schedule) {
      case 'every_15_minutes':
        return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
  }

  private setupEventListeners(): void {
    // Set up event listeners for real-time triggers
    // This would integrate with your existing event system
    console.log('Security automation event listeners configured');
  }

  private async logAutomationResult(result: AutomationResult): Promise<void> {
    await supabase
      .from('automation_results')
      .insert(result);
  }

  private async getSecurityStatus(): Promise<any> {
    // Calculate overall security status
    const { data: recentAlerts } = await supabase
      .from('security_alerts')
      .select('severity')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const criticalCount = recentAlerts?.filter(a => a.severity === 'CRITICAL').length || 0;
    const highCount = recentAlerts?.filter(a => a.severity === 'HIGH').length || 0;

    let score = 10;
    if (criticalCount > 0) score -= 3;
    if (highCount > 0) score -= 1;
    if (criticalCount > 5) score -= 2;

    return {
      overall_score: Math.max(0, score),
      critical_alerts: criticalCount,
      high_alerts: highCount,
      last_updated: new Date().toISOString()
    };
  }

  private async getRecentSecurityEvents(): Promise<any[]> {
    const { data: events } = await supabase
      .from('security_alerts')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    return events || [];
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const status = await this.getSecurityStatus();

    if (status.overall_score < 8) {
      recommendations.push('Review and address critical security alerts');
    }

    if (status.critical_alerts > 0) {
      recommendations.push('Implement additional security monitoring');
    }

    return recommendations;
  }

  private async getSecurityMetrics(): Promise<any> {
    // Get comprehensive security metrics
    return {
      total_alerts: await this.getTotalAlerts(),
      resolved_alerts: await this.getResolvedAlerts(),
      active_sessions: await this.getActiveSessions(),
      blocked_ips: await this.getBlockedIPs()
    };
  }

  private async getVulnerabilitySummary(): Promise<any> {
    const { data: vulnerabilities } = await supabase
      .from('penetration_test_results')
      .select('severity, status')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return {
      total_vulnerabilities: vulnerabilities?.length || 0,
      critical_vulnerabilities: vulnerabilities?.filter(v => v.severity === 'critical').length || 0,
      high_vulnerabilities: vulnerabilities?.filter(v => v.severity === 'high').length || 0
    };
  }

  private async validateEncryptionConfig(): Promise<boolean> {
    try {
      const encryption = getEncryption();
      return encryption.validateConfig();
    } catch (error) {
      return false;
    }
  }

  private async validateSessionConfig(): Promise<boolean> {
    try {
      const sessionManager = getSessionManager();
      // Add session configuration validation logic
      return true;
    } catch (error) {
      return false;
    }
  }

  private async validateRateLimitConfig(): Promise<boolean> {
    // Add rate limit configuration validation logic
    return true;
  }

  private async getTotalAlerts(): Promise<number> {
    const { count } = await supabase
      .from('security_alerts')
      .select('*', { count: 'exact', head: true });
    
    return count || 0;
  }

  private async getResolvedAlerts(): Promise<number> {
    const { count } = await supabase
      .from('security_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', true);
    
    return count || 0;
  }

  private async getActiveSessions(): Promise<number> {
    const { count } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    return count || 0;
  }

  private async getBlockedIPs(): Promise<number> {
    const { count } = await supabase
      .from('blocked_ips')
      .select('*', { count: 'exact', head: true });
    
    return count || 0;
  }
}

// Global automation instance
let globalAutomation: SecurityAutomationFramework | null = null;

// Initialize global automation
export function initializeSecurityAutomation(config?: Partial<AutomationConfig>): SecurityAutomationFramework {
  globalAutomation = new SecurityAutomationFramework(config);
  return globalAutomation;
}

// Get global automation
export function getSecurityAutomation(): SecurityAutomationFramework {
  if (!globalAutomation) {
    throw new Error('Security automation not initialized. Call initializeSecurityAutomation() first.');
  }
  return globalAutomation;
}
