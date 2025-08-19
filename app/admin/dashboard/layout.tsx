'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, isAdminUser, signOutUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import Link from 'next/link';
import { 
  Users, 
  Users as Teams, 
  FolderOpen, 
  FileText, 
  LogOut,
  Settings
} from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
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
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
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

          <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Admin</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
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

        {/* Main content */}
        <div className="flex-1">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
