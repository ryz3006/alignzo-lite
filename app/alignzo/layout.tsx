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
  X,
  Home,
  User as UserIcon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { TimerProvider, useTimer } from '@/components/TimerContext';
import EnhancedTimerModal from '@/components/EnhancedTimerModal';
import TimerManagementModal from '@/components/TimerManagementModal';

function UserDashboardContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTimerManagementModal, setShowTimerManagementModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
    { name: 'Dashboard', href: '/alignzo', icon: Home, accessKey: 'access_dashboard' },
    { name: 'Work Report', href: '/alignzo/reports', icon: Clock, accessKey: 'access_work_report' },
    { 
      name: 'Analytics', 
      href: '/alignzo/analytics', 
      icon: TrendingUp, 
      accessKey: 'access_analytics',
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-large transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div className="flex items-center space-x-3">
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-neutral-900">Alignzo</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-modern">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-link ${
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-neutral-50">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="header">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-neutral-900">
                  {filteredNavigation.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              {/* Timer Actions */}
              <button
                onClick={() => setShowTimerModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Start Timer</span>
              </button>
              
              <button
                onClick={() => setShowTimerManagementModal(true)}
                className="relative p-3 text-neutral-600 hover:text-neutral-900 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all duration-200"
                title="Active Timers"
              >
                <Bell className="h-5 w-5" />
                {activeTimers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {activeTimers.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-modern">
          <div className="p-6">
            {children}
          </div>
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

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
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
