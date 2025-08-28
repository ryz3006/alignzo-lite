'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, getCurrentAdmin, isAdminUser, signOutUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import Link from 'next/link';
import { 
  Users, 
  Users as Teams, 
  FolderOpen, 
  FileText, 
  LogOut,
  Settings,
  Menu,
  X,
  Calendar,
  Shield,
  Activity,
  Database
} from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [adminSession, setAdminSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check admin session first
      const currentAdmin = getCurrentAdmin();
      if (currentAdmin) {
        setAdminSession(currentAdmin);
        setLoading(false);
        return;
      }

      // Fallback to Firebase user check
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        router.push('/admin/login');
        return;
      }

      if (!isAdminUser(currentUser)) {
        router.push('/admin');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const navigation = [
    { name: 'Users', href: '/admin/dashboard/users', icon: Users },
    { name: 'Teams', href: '/admin/dashboard/teams', icon: Teams },
    { name: 'Projects', href: '/admin/dashboard/projects', icon: FolderOpen },
    { name: 'Work Reports', href: '/admin/dashboard/reports', icon: FileText },
    { name: 'Shift Schedule', href: '/admin/dashboard/shift-schedule', icon: Calendar },
    { name: 'Audit Trail', href: '/admin/dashboard/audit-trail', icon: Activity },
    { name: 'Cache Dashboard', href: '/admin/cache-dashboard', icon: Database },
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
      <div className="flex h-screen">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
            <div className="flex items-center space-x-2">
              {/* Full logo for bigger screens */}
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="hidden sm:block h-8 w-auto" />
              {/* Icon only for smaller screens */}
              <img src="/android-chrome-192x192.png" alt="Alignzo Icon" className="sm:hidden h-6 w-6" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="flex-1 mt-8 overflow-y-auto">
            <div className="px-4 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            {/* User info section */}
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary-700">
                  {(adminSession?.email || user?.email)?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700">Admin</p>
                <p className="text-xs text-gray-500 truncate">{adminSession?.email || user?.email}</p>
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile header */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <img src="/android-chrome-192x192.png" alt="Alignzo Icon" className="h-6 w-6" />
                <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              </div>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>
          </div>

          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
