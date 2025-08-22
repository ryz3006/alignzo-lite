import { supabaseClient } from './supabase-client';
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
  private static instance: ArchivalManager;

  private constructor() {}

  public static getInstance(): ArchivalManager {
    if (!ArchivalManager.instance) {
      ArchivalManager.instance = new ArchivalManager();
    }
    return ArchivalManager.instance;
  }

  async archiveOldRecords(tableName: string, cutoffDate: Date): Promise<number> {
    try {
      // Get records older than cutoff date
      const response = await supabaseClient.get(tableName, {
        select: 'id',
        filters: {
          created_at: { lt: cutoffDate.toISOString() }
        }
      });

      if (response.error) {
        throw new Error(`Failed to fetch old records: ${response.error}`);
      }

      const oldRecords = response.data || [];
      let archivedCount = 0;

      // Archive each old record
      for (const record of oldRecords) {
        try {
          // Move to archive table
          const archiveResponse = await supabaseClient.insert(`${tableName}_archive`, record);
          
          if (!archiveResponse.error) {
            // Delete from original table
            await supabaseClient.delete(tableName, record.id);
            archivedCount++;
          }
        } catch (error) {
          console.error(`Failed to archive record ${record.id}:`, error);
        }
      }

      return archivedCount;
    } catch (error) {
      console.error('Error in archival process:', error);
      throw error;
    }
  }

  async cleanupArchiveTables(cutoffDate: Date): Promise<number> {
    try {
      let totalCleaned = 0;
      
      // List of tables to clean
      const archiveTables = [
        'users_archive',
        'projects_archive',
        'teams_archive',
        'work_logs_archive',
        'timers_archive'
      ];

      for (const tableName of archiveTables) {
        try {
          const response = await supabaseClient.get(tableName, {
            select: 'id',
            filters: {
              created_at: { lt: cutoffDate.toISOString() }
            }
          });

          if (!response.error && response.data) {
            // Delete old archived records
            for (const record of response.data) {
              await supabaseClient.delete(tableName, record.id);
              totalCleaned++;
            }
          }
        } catch (error) {
          console.error(`Failed to clean archive table ${tableName}:`, error);
        }
      }

      return totalCleaned;
    } catch (error) {
      console.error('Error in archive cleanup:', error);
      throw error;
    }
  }
}

// Global archival manager instance
export const archivalManager = ArchivalManager.getInstance();

// Helper function to get cleanup statistics
export async function getCleanupStats(): Promise<{
  totalArchived: number;
  totalCleaned: number;
  lastCleanup: string;
  nextScheduledCleanup: string;
}> {
  try {
    // Get current archival status
    const now = new Date();
    const nextCleanup = new Date(now.getTime() + (defaultArchivalConfig.cleanupInterval * 60 * 60 * 1000));
    
    // For now, return default stats - in a real implementation, you'd query the database
    return {
      totalArchived: 0,
      totalCleaned: 0,
      lastCleanup: now.toISOString(),
      nextScheduledCleanup: nextCleanup.toISOString()
    };
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    throw error;
  }
}

// Helper function to trigger manual cleanup
export async function triggerManualCleanup(): Promise<{
  success: boolean;
  archivedCount: number;
  cleanedCount: number;
  message: string;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - defaultArchivalConfig.retentionDays);
    
    // Archive old records from main tables
    const archivedCount = await archivalManager.archiveOldRecords('users', cutoffDate);
    
    // Clean up old archived records
    const cleanedCount = await archivalManager.cleanupArchiveTables(cutoffDate);
    
    return {
      success: true,
      archivedCount,
      cleanedCount,
      message: `Manual cleanup completed: ${archivedCount} records archived, ${cleanedCount} records cleaned`
    };
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    throw error;
  }
}

// API endpoint for manual cleanup
export async function POST(request: Request) {
  try {
    const { action, tableName, cutoffDate } = await request.json();
    
    if (action === 'archive') {
      const archivedCount = await archivalManager.archiveOldRecords(
        tableName, 
        new Date(cutoffDate)
      );
      return Response.json({ 
        success: true, 
        archivedCount,
        message: `Archived ${archivedCount} records from ${tableName}`
      });
    }
    
    if (action === 'cleanup') {
      const cleanedCount = await archivalManager.cleanupArchiveTables(
        new Date(cutoffDate)
      );
      return Response.json({ 
        success: true, 
        cleanedCount,
        message: `Cleaned ${cleanedCount} archived records`
      });
    }
    
    return Response.json({ 
      error: 'Invalid action. Use "archive" or "cleanup"' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Archival API error:', error);
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
