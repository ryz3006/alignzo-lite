// =====================================================
// PERFORMANCE MONITORING UTILITY
// =====================================================

import React, { useRef, useEffect } from 'react';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  timestamp: string;
  metrics: Record<string, {
    average: number;
    min: number;
    max: number;
    count: number;
  }>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private isEnabled: boolean = true;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  startTimer(operation: string): () => void {
    if (!this.isEnabled) {
      return () => {}; // No-op if disabled
    }

    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number): void {
    if (!this.isEnabled) return;

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMetrics(operation: string): number[] {
    return this.metrics.get(operation) || [];
  }

  clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }

  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    this.metrics.forEach((times, operation) => {
      if (times.length > 0) {
        report.metrics[operation] = {
          average: this.getAverageTime(operation),
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
      }
    });

    return report;
  }

  // Send metrics to server for analysis
  async sendMetricsToServer(projectId?: string, userEmail?: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const report = this.generateReport();
      
      // Only send if there are metrics
      if (Object.keys(report.metrics).length === 0) return;

      const response = await fetch('/api/kanban/performance-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          project_id: projectId,
          user_email: userEmail
        }),
      });

      if (!response.ok) {
        console.error('Failed to send performance metrics');
      }
    } catch (error) {
      console.error('Error sending performance metrics:', error);
    }
  }

  // Get performance insights
  getPerformanceInsights(): string[] {
    const insights: string[] = [];
    const report = this.generateReport();

    for (const [operation, metric] of Object.entries(report.metrics)) {
      if (metric.average > 1000) {
        insights.push(`${operation} is slow (avg: ${metric.average.toFixed(2)}ms)`);
      }
      if (metric.max > 5000) {
        insights.push(`${operation} has very slow operations (max: ${metric.max.toFixed(2)}ms)`);
      }
      if (metric.count > 100) {
        insights.push(`${operation} is called frequently (${metric.count} times)`);
      }
    }

    return insights;
  }
}

// =====================================================
// REACT HOOK FOR PERFORMANCE MONITORING
// =====================================================

export const usePerformanceMonitor = (operation: string, enabled: boolean = true) => {
  const monitor = useRef(PerformanceMonitor.getInstance());
  const stopTimer = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (enabled) {
      stopTimer.current = monitor.current.startTimer(operation);
    }

    return () => {
      if (stopTimer.current) {
        stopTimer.current();
      }
    };
  }, [operation, enabled]);

  return {
    recordMetric: (duration: number) => monitor.current.recordMetric(operation, duration),
    getAverageTime: () => monitor.current.getAverageTime(operation),
    getMetrics: () => monitor.current.getMetrics(operation)
  };
};

// =====================================================
// HIGHER-ORDER COMPONENT FOR PERFORMANCE MONITORING
// =====================================================

// Note: HOC temporarily disabled due to TypeScript issues
// Use usePerformanceMonitor hook instead for component-level monitoring

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const measureAsync = async <T>(
  operation: string,
  asyncFn: () => Promise<T>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance();
  const stopTimer = monitor.startTimer(operation);
  
  try {
    const result = await asyncFn();
    return result;
  } finally {
    stopTimer();
  }
};

export const measureSync = <T>(
  operation: string,
  syncFn: () => T
): T => {
  const monitor = PerformanceMonitor.getInstance();
  const stopTimer = monitor.startTimer(operation);
  
  try {
    const result = syncFn();
    return result;
  } finally {
    stopTimer();
  }
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
