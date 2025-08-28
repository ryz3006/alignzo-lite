import { Suspense } from 'react';
import { Metadata } from 'next';
import EnhancedCacheDashboard from '@/components/EnhancedCacheDashboard';
import CachePerformanceAnalytics from '@/components/CachePerformanceAnalytics';
import CacheManagementControls from '@/components/CacheManagementControls';
import { Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cache Management Dashboard - Admin',
  description: 'Redis cache management and performance monitoring dashboard for administrators',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center space-x-2 text-gray-500 p-8">
      <Activity className="w-5 h-5 animate-spin" />
      <span>Loading cache dashboard...</span>
    </div>
  );
}

export default function AdminCacheDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Cache Management Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor Redis performance, manage cache settings, and optimize your application's caching strategy
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Enhanced Cache Dashboard */}
          <Suspense fallback={<LoadingFallback />}>
            <EnhancedCacheDashboard />
          </Suspense>

          {/* Performance Analytics */}
          <Suspense fallback={<LoadingFallback />}>
            <CachePerformanceAnalytics />
          </Suspense>

          {/* Cache Management Controls */}
          <Suspense fallback={<LoadingFallback />}>
            <CacheManagementControls />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
