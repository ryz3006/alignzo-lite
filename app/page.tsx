'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signInWithGoogle, checkUserAccess, signOutUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import { Chrome, Shield, Users, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

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

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success('Logged out successfully');
      setAccessDenied(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-md w-full mx-4">
          <div className="card text-center">
            <div className="w-16 h-16 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-danger-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Access Denied
            </h2>
            <p className="text-neutral-600 mb-8">
              Your email is not registered in the system. Please contact your administrator to be added.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="btn-danger w-full"
              >
                Logout & Clear Session
              </button>
              <button
                onClick={() => {
                  setAccessDenied(false);
                  setUser(null);
                }}
                className="btn-secondary w-full"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800 transform -skew-y-6 origin-top-left"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-16 w-auto" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome to Alignzo
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Professional work log tracking and productivity monitoring platform
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Login Section */}
            <div className="card max-w-md mx-auto lg:mx-0">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                  Sign In to Your Account
                </h2>
                <p className="text-neutral-600">
                  Access your workspace and start tracking your productivity
                </p>
              </div>

              <div className="space-y-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-neutral-200 hover:border-neutral-300 text-neutral-700 font-medium px-6 py-4 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium"
                >
                  <Chrome className="h-5 w-5" />
                  <span>Continue with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-neutral-500">or</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    href="/admin/login"
                    className="btn-secondary w-full"
                  >
                    Admin Login
                  </Link>
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary-50 rounded-xl border border-primary-200">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-primary-700">
                    <p className="font-medium mb-1">Secure Authentication</p>
                    <p>Your data is protected with enterprise-grade security measures.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-6">
                  Everything you need for productive work tracking
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="card card-hover">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                    Time Tracking
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Track your work hours with precision using our intuitive timer system.
                  </p>
                </div>

                <div className="card card-hover">
                  <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-success-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                    Analytics & Reports
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Get detailed insights into your productivity patterns and project performance.
                  </p>
                </div>

                <div className="card card-hover">
                  <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-warning-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                    Team Management
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Manage team schedules, shifts, and availability in one centralized platform.
                  </p>
                </div>

                <div className="card card-hover">
                  <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-danger-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                    Performance Insights
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Monitor productivity trends and identify areas for improvement.
                  </p>
                </div>
              </div>

              <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">
                      Enterprise Security
                    </h4>
                    <p className="text-primary-100 text-sm">
                      Bank-level security with role-based access controls and audit trails.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
                <span className="text-xl font-bold">Alignzo</span>
              </div>
              <p className="text-neutral-400 text-sm">
                Professional work log tracking and productivity monitoring platform designed for modern teams.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>Time Tracking</li>
                <li>Team Management</li>
                <li>Analytics & Reports</li>
                <li>Shift Scheduling</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li>Documentation</li>
                <li>Contact Support</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-sm text-neutral-400">
            <p>&copy; 2024 Alignzo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
