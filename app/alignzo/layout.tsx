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
  ChevronRight,
  Sun,
  Moon,
  ChevronLeft
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const pathname = usePathname();
  const { activeTimers } = useTimer();

  useEffect(() => {
    checkAuth();
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
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

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const navigation = [
    { name: 'Dashboard', href: '/alignzo', icon: Home, accessKey: 'access_dashboard' },
    { name: 'Kanban Board', href: '/alignzo/kanban-board', icon: BarChart3, accessKey: 'access_dashboard' },
    { name: 'My Work Logs', href: '/alignzo/reports', icon: Clock, accessKey: 'access_work_report' },
    { name: 'Work Report', href: '/alignzo/work-reports', icon: BarChart3, accessKey: 'access_team_work_reports' },
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
    { name: 'Shift Schedule', href: '/alignzo/shift-schedule', icon: Clock, accessKey: 'access_shift_schedule' },
    { name: 'Google Drive', href: '/alignzo/google-drive', icon: Folder, accessKey: 'access_dashboard' },
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-800 shadow-large transform transition-all duration-300 ease-in-out lg:static lg:inset-0 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`border-b border-neutral-200 dark:border-neutral-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {sidebarCollapsed ? (
              /* Collapsed Layout - Stack vertically */
              <div className="flex flex-col items-center space-y-2">
                <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-6 w-6 flex-shrink-0" />
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:block p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* Expanded Layout - Horizontal */
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-8 flex-shrink-0" />
                  <img src="/ALIGNZO_Name.png" alt="Alignzo" className="h-6 w-auto" />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:block p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
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
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                  {!sidebarCollapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className={`border-t border-neutral-200 dark:border-neutral-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {sidebarCollapsed ? (
              /* Collapsed Layout - Stack vertically */
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* Expanded Layout - Horizontal */
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="header dark:bg-neutral-800 dark:border-neutral-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
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
                className="relative p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200"
                title="Active Timers"
              >
                <Bell className="h-5 w-5" />
                {activeTimers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {activeTimers.length}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
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
