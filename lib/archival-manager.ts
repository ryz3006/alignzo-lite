import { supabase } from './supabase';
import { logUserAction, logError } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// Archival configuration
interface ArchivalConfig {
  enabled: boolean;
  retentionDays: number;
  archiveToFile: boolean;
  archiveToDatabase: boolean;
  compressArchives: boolean;
  cleanupInterval: number; // hours
}

// Default archival configuration
const defaultArchivalConfig: ArchivalConfig = {
  enabled: true,
  retentionDays: 7, // Keep only last 7 days
  archiveToFile: true,
  archiveToDatabase: false,
  compressArchives: true,
  cleanupInterval: 24 // Run cleanup every 24 hours
};

export class ArchivalManager {
  private config: ArchivalConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ArchivalConfig> = {}) {
    this.config = { ...defaultArchivalConfig, ...config };
    this.startCleanupScheduler();
  }

  // Start automatic cleanup scheduler
  private startCleanupScheduler(): void {
    if (!this.config.enabled) return;

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Archival cleanup failed:', error);
        await logError(error as Error, { 
          service: 'ArchivalManager',
          operation: 'scheduledCleanup'
        });
      }
    }, this.config.cleanupInterval * 60 * 60 * 1000);
  }

  // Stop cleanup scheduler
  public stopCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Perform complete cleanup
  public async performCleanup(): Promise<{
    auditTrailCleaned: number;
    securityAlertsCleaned: number;
    logFilesCleaned: number;
    apiKeyUsageCleaned: number;
    eventCountersCleaned: number;
  }> {
    const results = {
      auditTrailCleaned: 0,
      securityAlertsCleaned: 0,
      logFilesCleaned: 0,
      apiKeyUsageCleaned: 0,
      eventCountersCleaned: 0,
    };

    const cutoffDate = this.getCutoffDate();

    try {
      // Archive and clean audit trail
      results.auditTrailCleaned = await this.cleanAuditTrail(cutoffDate);
      
      // Archive and clean security alerts
      results.securityAlertsCleaned = await this.cleanSecurityAlerts(cutoffDate);
      
      // Clean API key usage logs
      results.apiKeyUsageCleaned = await this.cleanApiKeyUsage(cutoffDate);
      
      // Clean event counters
      results.eventCountersCleaned = await this.cleanEventCounters(cutoffDate);
      
      // Clean log files
      results.logFilesCleaned = await this.cleanLogFiles(cutoffDate);

      // Log cleanup results
      await logUserAction(
        'system',
        'archival_cleanup_completed',
        {
          retentionDays: this.config.retentionDays,
          cutoffDate: cutoffDate,
          results: results
        }
      );

      return results;

    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'performCleanup'
      });
      throw error;
    }
  }

  // Clean audit trail data
  private async cleanAuditTrail(cutoffDate: string): Promise<number> {
    try {
      // First, archive old data if enabled
      if (this.config.archiveToFile) {
        await this.archiveAuditTrailToFile(cutoffDate);
      }

      // Delete old audit trail records
      const { data, error } = await supabase
        .from('audit_trail')
        .delete()
        .lt('created_at', cutoffDate)
        .select();

      if (error) {
        throw new Error(`Failed to clean audit trail: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'cleanAuditTrail',
        cutoffDate
      });
      return 0;
    }
  }

  // Clean security alerts
  private async cleanSecurityAlerts(cutoffDate: string): Promise<number> {
    try {
      // Archive old alerts if enabled
      if (this.config.archiveToFile) {
        await this.archiveSecurityAlertsToFile(cutoffDate);
      }

      // Delete old security alerts
      const { data, error } = await supabase
        .from('security_alerts')
        .delete()
        .lt('created_at', cutoffDate)
        .select();

      if (error) {
        throw new Error(`Failed to clean security alerts: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'cleanSecurityAlerts',
        cutoffDate
      });
      return 0;
    }
  }

  // Clean API key usage logs
  private async cleanApiKeyUsage(cutoffDate: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('api_key_usage')
        .delete()
        .lt('used_at', cutoffDate)
        .select();

      if (error) {
        throw new Error(`Failed to clean API key usage: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'cleanApiKeyUsage',
        cutoffDate
      });
      return 0;
    }
  }

  // Clean event counters
  private async cleanEventCounters(cutoffDate: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('event_counters')
        .delete()
        .lt('created_at', cutoffDate)
        .select();

      if (error) {
        throw new Error(`Failed to clean event counters: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'cleanEventCounters',
        cutoffDate
      });
      return 0;
    }
  }

  // Archive audit trail to file
  private async archiveAuditTrailToFile(cutoffDate: string): Promise<void> {
    try {
      // Get old audit trail records
      const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .lt('created_at', cutoffDate)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      // Create archive directory
      const archiveDir = path.join(process.cwd(), 'logs', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });

      // Create archive file with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const archiveFile = path.join(archiveDir, `audit_trail_${timestamp}.json`);

      // Write archive file
      await fs.writeFile(archiveFile, JSON.stringify(data, null, 2));

      console.log(`Archived ${data.length} audit trail records to ${archiveFile}`);
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'archiveAuditTrailToFile'
      });
    }
  }

  // Archive security alerts to file
  private async archiveSecurityAlertsToFile(cutoffDate: string): Promise<void> {
    try {
      // Get old security alerts
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .lt('created_at', cutoffDate)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      // Create archive directory
      const archiveDir = path.join(process.cwd(), 'logs', 'archive');
      await fs.mkdir(archiveDir, { recursive: true });

      // Create archive file with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const archiveFile = path.join(archiveDir, `security_alerts_${timestamp}.json`);

      // Write archive file
      await fs.writeFile(archiveFile, JSON.stringify(data, null, 2));

      console.log(`Archived ${data.length} security alerts to ${archiveFile}`);
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'archiveSecurityAlertsToFile'
      });
    }
  }

  // Clean old log files
  private async cleanLogFiles(cutoffDate: string): Promise<number> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      let cleanedCount = 0;

      // Check if logs directory exists
      try {
        await fs.access(logsDir);
      } catch {
        return 0; // Directory doesn't exist
      }

      const files = await fs.readdir(logsDir);
      const cutoffTime = new Date(cutoffDate).getTime();

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      await logError(error as Error, {
        service: 'ArchivalManager',
        operation: 'cleanLogFiles'
      });
      return 0;
    }
  }

  // Get cutoff date based on retention policy
  private getCutoffDate(): string {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    return cutoffDate.toISOString();
  }

  // Manual cleanup trigger
  public async triggerCleanup(): Promise<any> {
    return await this.performCleanup();
  }

  // Get cleanup statistics
  public async getCleanupStats(): Promise<{
    nextCleanup: string;
    retentionDays: number;
    recordCounts: {
      auditTrail: number;
      securityAlerts: number;
      apiKeyUsage: number;
      eventCounters: number;
    };
  }> {
    const cutoffDate = this.getCutoffDate();

    // Get current record counts that would be affected
    const [auditCount, alertsCount, usageCount, countersCount] = await Promise.all([
      this.getRecordCount('audit_trail', 'created_at', cutoffDate),
      this.getRecordCount('security_alerts', 'created_at', cutoffDate),
      this.getRecordCount('api_key_usage', 'used_at', cutoffDate),
      this.getRecordCount('event_counters', 'created_at', cutoffDate),
    ]);

    return {
      nextCleanup: new Date(Date.now() + this.config.cleanupInterval * 60 * 60 * 1000).toISOString(),
      retentionDays: this.config.retentionDays,
      recordCounts: {
        auditTrail: auditCount,
        securityAlerts: alertsCount,
        apiKeyUsage: usageCount,
        eventCounters: countersCount,
      }
    };
  }

  // Helper to get record count
  private async getRecordCount(table: string, dateColumn: string, cutoffDate: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .lt(dateColumn, cutoffDate);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }
}

// Global archival manager instance
export const archivalManager = new ArchivalManager({
  retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '7'),
  enabled: process.env.ARCHIVAL_ENABLED !== 'false',
});

// API endpoint for manual cleanup
export async function triggerManualCleanup(): Promise<any> {
  return await archivalManager.triggerCleanup();
}

// API endpoint for cleanup stats
export async function getCleanupStats(): Promise<any> {
  return await archivalManager.getCleanupStats();
}
