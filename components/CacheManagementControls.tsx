'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Database, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface CacheKey {
  key: string;
  ttl: number;
  size: string;
  lastAccessed: string;
  type: string;
}

interface TTLConfig {
  category: string;
  currentTTL: number;
  recommendedTTL: number;
  usage: number;
}

export default function CacheManagementControls() {
  const [cacheKeys, setCacheKeys] = useState<CacheKey[]>([]);
  const [ttlConfigs, setTtlConfigs] = useState<TTLConfig[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState<{
    type: string;
    message: string;
    success: boolean;
  } | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      const mockKeys: CacheKey[] = [
        {
          key: 'kanban:board:project-123:team-456',
          ttl: 300,
          size: '2.3MB',
          lastAccessed: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          type: 'kanban'
        },
        {
          key: 'user:projects:user@example.com',
          ttl: 1800,
          size: '1.8MB',
          lastAccessed: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          type: 'user'
        },
        {
          key: 'project:categories:project-123',
          ttl: 600,
          size: '0.5MB',
          lastAccessed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'project'
        }
      ];

      const mockTTLConfigs: TTLConfig[] = [
        {
          category: 'kanban',
          currentTTL: 300,
          recommendedTTL: 180,
          usage: 85
        },
        {
          category: 'user',
          currentTTL: 1800,
          recommendedTTL: 900,
          usage: 92
        },
        {
          category: 'project',
          currentTTL: 600,
          recommendedTTL: 300,
          usage: 78
        }
      ];

      setCacheKeys(mockKeys);
      setTtlConfigs(mockTTLConfigs);
      setLoading(false);
    };

    generateMockData();
  }, []);

  const handleSelectAll = () => {
    if (selectedKeys.length === cacheKeys.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(cacheKeys.map(k => k.key));
    }
  };

  const handleSelectKey = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter(k => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedKeys.length === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedKeys.length} selected cache keys?`)) {
      setLoading(true);
      try {
        // In production, this would call the actual API
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        setCacheKeys(cacheKeys.filter(k => !selectedKeys.includes(k.key)));
        setSelectedKeys([]);
        setOperationStatus({
          type: 'delete',
          message: `Successfully deleted ${selectedKeys.length} cache keys`,
          success: true
        });
      } catch (error) {
        setOperationStatus({
          type: 'delete',
          message: 'Failed to delete cache keys',
          success: false
        });
      } finally {
        setLoading(false);
        setTimeout(() => setOperationStatus(null), 3000);
      }
    }
  };

  const handleFlushAll = async () => {
    if (confirm('Are you sure you want to flush ALL cache data? This action cannot be undone.')) {
      setLoading(true);
      try {
        const response = await fetch('/api/redis/flush', { method: 'POST' });
        if (response.ok) {
          setCacheKeys([]);
          setSelectedKeys([]);
          setOperationStatus({
            type: 'flush',
            message: 'Cache flushed successfully',
            success: true
          });
        } else {
          throw new Error('Flush failed');
        }
      } catch (error) {
        setOperationStatus({
          type: 'flush',
          message: 'Failed to flush cache',
          success: false
        });
      } finally {
        setLoading(false);
        setTimeout(() => setOperationStatus(null), 3000);
      }
    }
  };

  const handleRefreshTTL = async (category: string, newTTL: number) => {
    try {
      // In production, this would call the actual API to update TTL
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      setTtlConfigs(ttlConfigs.map(config => 
        config.category === category 
          ? { ...config, currentTTL: newTTL }
          : config
      ));

      setOperationStatus({
        type: 'ttl',
        message: `TTL updated for ${category} to ${newTTL}s`,
        success: true
      });
    } catch (error) {
      setOperationStatus({
        type: 'ttl',
        message: `Failed to update TTL for ${category}`,
        success: false
      });
    } finally {
      setTimeout(() => setOperationStatus(null), 3000);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'kanban':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      case 'project':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTTLStatus = (config: TTLConfig) => {
    if (config.currentTTL === config.recommendedTTL) {
      return { status: 'optimal', icon: CheckCircle, color: 'text-green-600' };
    } else if (config.currentTTL > config.recommendedTTL) {
      return { status: 'high', icon: AlertTriangle, color: 'text-yellow-600' };
    } else {
      return { status: 'low', icon: Clock, color: 'text-blue-600' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <Activity className="w-5 h-5 animate-spin" />
          <span>Loading cache management...</span>
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
            <Settings className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cache Management Controls</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedKeys.length === 0}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedKeys.length})</span>
            </button>
            <button
              onClick={handleFlushAll}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Database className="w-4 h-4" />
              <span>Flush All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operation Status */}
      {operationStatus && (
        <div className={`px-6 py-3 ${
          operationStatus.success ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {operationStatus.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              operationStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {operationStatus.message}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {/* TTL Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">TTL Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ttlConfigs.map((config) => {
              const ttlStatus = getTTLStatus(config);
              const IconComponent = ttlStatus.icon;
              
              return (
                <div key={config.category} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 capitalize">
                      {config.category}
                    </h4>
                    <IconComponent className={`w-4 h-4 ${ttlStatus.color}`} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current TTL</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {config.currentTTL}s
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Recommended</span>
                      <span className="text-sm text-gray-500">
                        {config.recommendedTTL}s
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Usage</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {config.usage}%
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        onClick={() => handleRefreshTTL(config.category, config.recommendedTTL)}
                        className="w-full px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Optimize TTL
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cache Keys Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cache Keys</h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {cacheKeys.length} keys total
              </span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedKeys.length === cacheKeys.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedKeys.length === cacheKeys.length && cacheKeys.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TTL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Accessed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cacheKeys.map((cacheKey) => (
                  <tr key={cacheKey.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(cacheKey.key)}
                        onChange={() => handleSelectKey(cacheKey.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {cacheKey.key}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(cacheKey.type)}`}>
                        {cacheKey.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cacheKey.ttl}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cacheKey.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cacheKey.lastAccessed).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
