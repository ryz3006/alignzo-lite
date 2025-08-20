'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, checkUserAccess, signOutUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import Link from 'next/link';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  LogOut,
  Plus,
  Bell,
  Settings
} from 'lucide-react';
import { TimerProvider, useTimer } from '@/components/TimerContext';
import EnhancedTimerModal from '@/components/EnhancedTimerModal';
import TimerManagementModal from '@/components/TimerManagementModal';

function UserDashboardContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTimerManagementModal, setShowTimerManagementModal] = useState(false);
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
    { name: 'Dashboard', href: '/alignzo', icon: BarChart3 },
    { name: 'Work Report', href: '/alignzo/reports', icon: Clock },
    { name: 'Analytics', href: '/alignzo/analytics', icon: TrendingUp },
    { name: 'Integrations', href: '/alignzo/integrations', icon: Settings },
  ];

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
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
              <h1 className="text-xl font-semibold text-gray-900">Alignzo Lite</h1>
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
              
              <div className="flex items-center space-x-3">
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
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
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
