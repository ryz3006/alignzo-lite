'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Activity,
  Target,
  Gauge
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  activeConnections: number;
}

interface CacheTrend {
  period: string;
  hitRate: number;
  responseTime: number;
  memoryUsage: number;
}

export default function CachePerformanceAnalytics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [trends, setTrends] = useState<CacheTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '6h' | '24h'>('1h');

  // Mock data for demonstration - in production, this would come from actual metrics
  useEffect(() => {
    const generateMockData = () => {
      const now = new Date();
      const mockMetrics: PerformanceMetrics[] = [];
      const mockTrends: CacheTrend[] = [];

      // Generate metrics for the last 24 hours
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        mockMetrics.push({
          timestamp: time.toISOString(),
          responseTime: Math.random() * 100 + 50, // 50-150ms
          cacheHits: Math.floor(Math.random() * 1000) + 500,
          cacheMisses: Math.floor(Math.random() * 200) + 50,
          memoryUsage: Math.random() * 15 + 5, // 5-20MB
          activeConnections: Math.floor(Math.random() * 50) + 10
        });
      }

      // Generate trends for different periods
      ['1h', '6h', '24h'].forEach(period => {
        mockTrends.push({
          period,
          hitRate: Math.random() * 30 + 70, // 70-100%
          responseTime: Math.random() * 50 + 75, // 75-125ms
          memoryUsage: Math.random() * 10 + 10 // 10-20MB
        });
      });

      setMetrics(mockMetrics);
      setTrends(mockTrends);
      setLoading(false);
    };

    generateMockData();
  }, []);

  const getCurrentMetrics = () => {
    if (metrics.length === 0) return null;
    return metrics[metrics.length - 1];
  };

  const getHitRate = () => {
    const current = getCurrentMetrics();
    if (!current) return 0;
    return (current.cacheHits / (current.cacheHits + current.cacheMisses)) * 100;
  };

  const getAverageResponseTime = () => {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.responseTime, 0);
    return sum / metrics.length;
  };

  const getMemoryTrend = () => {
    if (metrics.length < 2) return 'stable';
    const recent = metrics.slice(-5);
    const first = recent[0].memoryUsage;
    const last = recent[recent.length - 1].memoryUsage;
    if (last > first + 2) return 'increasing';
    if (last < first - 2) return 'decreasing';
    return 'stable';
  };

  const getPerformanceScore = () => {
    const hitRate = getHitRate();
    const avgResponseTime = getAverageResponseTime();
    const memoryEfficiency = 100 - (getCurrentMetrics()?.memoryUsage || 0) / 20 * 100;
    
    return Math.round((hitRate * 0.4 + (100 - avgResponseTime / 2) * 0.3 + memoryEfficiency * 0.3));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading performance analytics...</span>
        </div>
      </div>
    );
  }

  const currentMetrics = getCurrentMetrics();
  const performanceScore = getPerformanceScore();

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cache Performance Analytics</h2>
          </div>
          <div className="flex items-center space-x-2">
            {(['1h', '6h', '24h'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Performance Score */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Performance Score</h3>
                <p className="text-sm text-gray-600">
                  Based on cache hit rate, response time, and memory efficiency
                </p>
              </div>
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(performanceScore / 100) * 251.2} 251.2`}
                      className="text-purple-600 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-purple-600">{performanceScore}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Cache Hit Rate */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getHitRate().toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">
                  {currentMetrics?.cacheHits || 0} hits, {currentMetrics?.cacheMisses || 0} misses
                </p>
              </div>
            </div>
          </div>

          {/* Average Response Time */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getAverageResponseTime().toFixed(0)}ms
                </p>
                <p className="text-sm text-gray-500">
                  Current: {currentMetrics?.responseTime.toFixed(0)}ms
                </p>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Gauge className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentMetrics?.memoryUsage.toFixed(1)}MB
                </p>
                <div className="flex items-center space-x-1">
                  {getMemoryTrend() === 'increasing' && <TrendingUp className="w-4 h-4 text-red-500" />}
                  {getMemoryTrend() === 'decreasing' && <TrendingDown className="w-4 h-4 text-green-500" />}
                  <span className={`text-sm ${
                    getMemoryTrend() === 'increasing' ? 'text-red-500' : 
                    getMemoryTrend() === 'decreasing' ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {getMemoryTrend()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Connections */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Connections</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentMetrics?.activeConnections || 0}
                </p>
                <p className="text-sm text-gray-500">Active now</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trends.map((trend) => (
              <div key={trend.period} className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 capitalize">
                  Last {trend.period}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Hit Rate</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {trend.hitRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {trend.responseTime.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {trend.memoryUsage.toFixed(1)}MB
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Performance Insights</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {getHitRate() > 90 && (
              <p>✅ Excellent cache hit rate! Your caching strategy is working very well.</p>
            )}
            {getHitRate() < 70 && (
              <p>⚠️ Cache hit rate is below optimal. Consider adjusting TTL values or cache more frequently accessed data.</p>
            )}
            {getAverageResponseTime() > 100 && (
              <p>⚠️ Response time is higher than ideal. Monitor for potential performance bottlenecks.</p>
            )}
            {getMemoryTrend() === 'increasing' && (
              <p>📈 Memory usage is trending upward. Monitor for potential memory pressure.</p>
            )}
            {performanceScore > 85 && (
              <p>🎯 Outstanding performance! Your cache system is operating at peak efficiency.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
