'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface CacheStatus {
  status: string;
  memory: {
    used: string;
    max: string;
    percentage: string;
    status: string;
  };
  cache: {
    keys: number;
    hitRate: string;
  };
}

export default function CacheStatus() {
  const [status, setStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/cache-stats');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch cache status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Activity className="w-4 h-4 animate-spin" />
        <span>Checking cache...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <XCircle className="w-4 h-4" />
        <span>Cache unavailable</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (status.memory.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-gray-600">Cache</span>
      </div>
      
      <div className="text-gray-500">
        {status.memory.used} / {status.memory.max}
      </div>
      
      <div className="text-gray-400">
        {status.cache.keys} keys
      </div>
    </div>
  );
}
