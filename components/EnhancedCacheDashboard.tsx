'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Database, 
  HardDrive, 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Trash2
} from 'lucide-react';

interface CacheStats {
  timestamp: string;
  memory: {
    used: string;
    max: string;
    percentage: string;
    status: string;
  };
  cache: {
    status: string;
    keys: number;
    hitRate: string;
  };
  recommendations: string[];
}

interface RedisHealth {
  status: string;
  message: string;
}

export default function EnhancedCacheDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [redisHealth, setRedisHealth] = useState<RedisHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        fetch('/api/cache-stats'),
        fetch('/api/redis-health')
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setCacheStats(stats);
      }

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setRedisHealth(health.redis);
      }
    } catch (error) {
      console.error('Failed to fetch cache data:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const handleFlushCache = async () => {
    if (confirm('Are you sure you want to flush all cache data? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/redis/flush', { method: 'POST' });
        if (response.ok) {
          alert('Cache flushed successfully');
          fetchData(); // Refresh data
        } else {
          alert('Failed to flush cache');
        }
      } catch (error) {
        console.error('Cache flush error:', error);
        alert('Error flushing cache');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading cache dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Redis Cache Dashboard</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleFlushCache}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4" />
              <span>Flush Cache</span>
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-refresh (30s)</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Redis Health Status */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Redis Status</p>
                <div className="flex items-center space-x-2">
                  {redisHealth && getStatusIcon(redisHealth.status)}
                  <span className={`text-sm font-semibold ${getStatusColor(redisHealth?.status || 'error').split(' ')[0]}`}>
                    {redisHealth?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
            <HardDrive className="w-5 h-5 text-green-600" />
          </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cacheStats?.memory.used || '0MB'} / {cacheStats?.memory.max || '0MB'}
                </p>
                <p className="text-sm text-gray-500">
                  {cacheStats?.memory.percentage || '0%'} used
                </p>
              </div>
            </div>
          </div>

          {/* Cache Keys */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Keys</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cacheStats?.cache.keys || 0}
                </p>
                <p className="text-sm text-gray-500">Active keys</p>
              </div>
            </div>
          </div>

          {/* Hit Rate */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {cacheStats?.cache.hitRate || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">Cache efficiency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Usage Bar */}
        {cacheStats && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Memory Usage</h3>
              <span className="text-sm text-gray-500">
                {cacheStats.memory.percentage} used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  cacheStats.memory.status === 'healthy' 
                    ? 'bg-green-500' 
                    : cacheStats.memory.status === 'warning' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}
                style={{ width: `${cacheStats.memory.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0MB</span>
              <span>{cacheStats.memory.max}</span>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {cacheStats && cacheStats.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recommendations</h3>
            <div className="space-y-2">
              {cacheStats.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Cache Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${getStatusColor(cacheStats?.cache.status || 'error').split(' ')[0]}`}>
                  {cacheStats?.cache.status || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm text-gray-900">
                  {cacheStats ? new Date(cacheStats.timestamp).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">System Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="text-sm text-gray-900">
                  {process.env.NODE_ENV || 'development'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-refresh</span>
                <span className="text-sm text-gray-900">
                  {autoRefresh ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
