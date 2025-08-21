'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getCurrentAdmin, isAdminUser, signOutUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';

interface ConfigStatus {
  admin: boolean;
  firebase: boolean;
  supabase: boolean;
  database: boolean;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [adminSession, setAdminSession] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    admin: false,
    firebase: false,
    supabase: false,
    database: false,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Check admin session first
      const currentAdmin = getCurrentAdmin();
      console.log('Admin check:', { currentAdmin, envVars: {
        adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD ? '***' : 'NOT_SET'
      }});
      
      if (currentAdmin) {
        setAdminSession(currentAdmin);
        setConfigStatus(prev => ({ ...prev, admin: true }));
        setLoading(false);
        // Skip further checks and redirect to dashboard
        router.push('/admin/dashboard');
        return;
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Check if user is admin
      const isAdmin = isAdminUser(currentUser);
      setConfigStatus(prev => ({ ...prev, admin: isAdmin }));

      // Check Firebase config
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      const firebaseConfigured = Object.values(firebaseConfig).every(value => value);
      setConfigStatus(prev => ({ ...prev, firebase: firebaseConfigured }));

      // Check Supabase config
          const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
      const supabaseConfigured = !!(supabaseUrl && supabaseKey);
      setConfigStatus(prev => ({ ...prev, supabase: supabaseConfigured }));

      // Check database tables
      if (supabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

          if (!error) {
            setConfigStatus(prev => ({ ...prev, database: true }));
          }
        } catch (error) {
          console.error('Database check failed:', error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Configuration check failed:', error);
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    router.push('/admin/login');
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success('Logged out successfully');
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user && !adminSession) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-full">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto flex items-center justify-center">
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-16 w-auto" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Access Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please log in to access the admin panel
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={handleAdminLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Admin Login
            </button>
          </div>
          
          {/* Go back to user login link */}
          <div className="text-center mt-4">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors underline"
            >
              ← Go back to user login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!configStatus.admin && !adminSession) {
    return (
      <div className="flex items-center justify-center bg-gray-50 min-h-full">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto flex items-center justify-center">
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-16 w-auto" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You don't have admin privileges
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <button
              onClick={handleLogout}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout & Clear Session
            </button>
            <button
              onClick={handleAdminLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Login
            </button>
          </div>
          
          {/* Go back to user login link */}
          <div className="text-center mt-4">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors underline"
            >
              ← Go back to user login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const allConfigured = Object.values(configStatus).every(Boolean);

  if (!allConfigured) {
    return (
      <div className="bg-gray-50 py-12 min-h-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Configuration Setup Required
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your application needs to be configured before you can access the admin panel.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration Status</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${configStatus.admin ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Admin Authentication</span>
                <span className="ml-auto text-sm text-gray-500">
                  {configStatus.admin ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${configStatus.firebase ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Firebase Configuration</span>
                <span className="ml-auto text-sm text-gray-500">
                  {configStatus.firebase ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${configStatus.supabase ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Supabase Configuration</span>
                <span className="ml-auto text-sm text-gray-500">
                  {configStatus.supabase ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-3 ${configStatus.database ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">Database Tables</span>
                <span className="ml-auto text-sm text-gray-500">
                  {configStatus.database ? 'Created' : 'Not created'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Setup Instructions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">1. Environment Variables</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Add the following environment variables to your deployment platform (Vercel/Netlify):
                </p>
                <div className="bg-gray-100 p-4 rounded-md text-sm font-mono">
                  <div>ADMIN_EMAIL=your-admin-email@example.com</div>
                  <div>ADMIN_PASSWORD=your-admin-password</div>
                  <div>NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key</div>
                  <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com</div>
                  <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id</div>
                  <div>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com</div>
                  <div>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789</div>
                  <div>NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id</div>
                                  <div>SUPABASE_URL=https://your-project.supabase.co</div>
                <div>SUPABASE_ANON_KEY=your-supabase-anon-key</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2. Firebase Setup</h3>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Firebase Console</a></li>
                  <li>Create a new project or select an existing one</li>
                  <li>Enable Authentication and add Google provider</li>
                  <li>Enable Email/Password authentication for admin login</li>
                  <li>Create a web app and copy the configuration</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3. Supabase Setup</h3>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Supabase</a></li>
                  <li>Create a new project</li>
                  <li>Go to Settings → API to get your URL and anon key</li>
                  <li>Go to SQL Editor and run the database schema</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">4. Database Schema</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Copy and run this SQL in your Supabase SQL Editor:
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`-- Copy the contents of database/schema.sql`);
                    toast.success('SQL copied to clipboard!');
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700"
                >
                  Copy SQL Schema
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={checkConfiguration}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Check Configuration Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If everything is configured, redirect to admin dashboard
  router.push('/admin/dashboard');
  return null;
}
