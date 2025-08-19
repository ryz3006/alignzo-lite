'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signInWithGoogle, checkUserAccess } from '@/lib/auth';
import { User } from 'firebase/auth';
import { Chrome } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Check if user has access to the system
        const hasAccess = await checkUserAccess(currentUser.email!);
        if (hasAccess) {
          router.push('/alignzo');
        } else {
          setAccessDenied(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      const hasAccess = await checkUserAccess(user.email!);
      
      if (hasAccess) {
        toast.success('Login successful!');
        router.push('/alignzo');
      } else {
        setAccessDenied(true);
        toast.error('Access denied. Please contact your administrator.');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Sign in failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email is not registered in the system. Please contact your administrator to be added.
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => {
                setAccessDenied(false);
                setUser(null);
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Different Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Chrome className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Alignzo Lite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional work log tracking and reporting
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Chrome className="h-5 w-5 mr-2" />
            Sign in with Google
          </button>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Admin access? <a href="/admin" className="text-primary-600 hover:text-primary-500">Go to admin panel</a>
          </p>
        </div>
      </div>
    </div>
  );
}
