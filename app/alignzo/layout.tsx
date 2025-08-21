'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, checkUserAccess, signOutUser, getUserAccessControls } from '@/lib/auth';
import { User } from 'firebase/auth';
import Link from 'next/link';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  LogOut,
  Plus,
  Bell,
  Settings,
  Upload,
  Database,
  Users,
  Menu,
  X
} from 'lucide-react';
import { TimerProvider, useTimer } from '@/components/TimerContext';
import EnhancedTimerModal from '@/components/EnhancedTimerModal';
import TimerManagementModal from '@/components/TimerManagementModal';

function UserDashboardContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTimerManagementModal, setShowTimerManagementModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { activeTimers } = useTimer();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        router.push('/');
        return;
      }

      const hasAccess = await checkUserAccess(currentUser.email!);
      if (!hasAccess) {
        router.push('/');
        return;
      }

      // Get user access controls
      const accessControls = await getUserAccessControls(currentUser.email!);
      setUserAccess(accessControls);

      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/alignzo', icon: BarChart3, accessKey: 'access_dashboard' },
    { name: 'Work Report', href: '/alignzo/reports', icon: Clock, accessKey: 'access_work_report' },
    { 
      name: 'Analytics', 
      href: '/alignzo/analytics', 
      icon: TrendingUp, 
      accessKey: 'access_analytics',
      // Analytics tab should only show if user has access to at least one analytics sub-module
      subAccessKeys: [
        'access_analytics_workload',
        'access_analytics_project_health', 
        'access_analytics_tickets',
        'access_analytics_operational',
        'access_analytics_team_insights',
        'access_analytics_remedy'
      ]
    },
    { name: 'Upload Tickets', href: '/alignzo/upload-tickets', icon: Upload, accessKey: 'access_upload_tickets' },
    { name: 'Uploaded Tickets', href: '/alignzo/uploaded-tickets', icon: Database, accessKey: 'access_upload_tickets' },
    { name: 'Master Mappings', href: '/alignzo/master-mappings', icon: Users, accessKey: 'access_master_mappings' },
    { name: 'Integrations', href: '/alignzo/integrations', icon: Settings, accessKey: 'access_integrations' },
  ];

  // Filter navigation based on user access
  const filteredNavigation = navigation.filter(item => {
    if (!userAccess) return item.accessKey === 'access_dashboard'; // Only show dashboard if no access data
    
    // Check main access key
    const hasMainAccess = userAccess[item.accessKey];
    
    // For analytics, also check if user has access to at least one sub-module
    if (item.accessKey === 'access_analytics' && item.subAccessKeys) {
      const hasSubAccess = item.subAccessKeys.some(subKey => userAccess[subKey]);
      return hasMainAccess && hasSubAccess;
    }
    
    return hasMainAccess;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Full logo for bigger screens */}
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="hidden sm:block h-12 w-auto" />
              {/* Icon only for smaller screens */}
              <img src="/android-chrome-192x192.png" alt="Alignzo Icon" className="sm:hidden h-8 w-8" />
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTimerModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
                title="Start Timer"
              >
                <Plus className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowTimerManagementModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 relative"
                title="Active Timers"
              >
                <Bell className="h-5 w-5" />
                {activeTimers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {activeTimers.length}
                  </span>
                )}
              </button>
              
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-sm text-gray-700">
                  {user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 text-gray-400 hover:text-gray-600"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <div className="text-sm text-gray-700 border-b border-gray-200 pb-2">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 overflow-x-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                    <span className="sm:hidden">{item.name.split(' ')[0]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>
          {children}
        </main>
      </div>

      {/* Timer Modals */}
      <EnhancedTimerModal 
        isOpen={showTimerModal} 
        onClose={() => setShowTimerModal(false)} 
      />
      <TimerManagementModal 
        isOpen={showTimerManagementModal} 
        onClose={() => setShowTimerManagementModal(false)} 
      />
    </div>
  );
}

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <UserDashboardContent>
        {children}
      </UserDashboardContent>
    </TimerProvider>
  );
}
