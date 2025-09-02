'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signInWithGoogle, checkUserAccess, signOutUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import { Chrome, Shield, Users, Clock, TrendingUp, BarChart3, ArrowRight, CheckCircle, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeContext';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const { theme, toggleTheme } = useTheme();
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="max-w-md w-full mx-4">
          <div className="card text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-danger-600 dark:text-danger-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
            <img src="/ALIGNZO_Name.png" alt="Alignzo" className="h-6 w-auto" />
          </div>
          <div className="flex items-center space-x-6">
            <a href="#features" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">Features</a>
            <button
              onClick={toggleTheme}
              className="p-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

             {/* Hero Section */}
       <section className="relative pt-24 pb-16 px-6">
         <div className="max-w-7xl mx-auto">
           <div className="text-center max-w-4xl mx-auto">
             <div className="inline-flex items-center px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-6">
               <CheckCircle className="h-4 w-4 mr-2" />
               Professional Work Tracking Platform
             </div>
             
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
               Welcome to{' '}
               <img src="/ALIGNZO_Name.png" alt="Alignzo" className="inline h-12 md:h-16 lg:h-20 w-auto" />
             </h1>
             
             <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
               Professional work log tracking and productivity monitoring platform designed for modern teams.
             </p>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <button
                 onClick={handleGoogleSignIn}
                 className="btn-primary text-lg px-8 py-4 flex items-center justify-center space-x-3"
               >
                 <Chrome className="h-5 w-5" />
                 <span>Get Started with Google</span>
                 <ArrowRight className="h-5 w-5" />
               </button>
               
               <Link
                 href="/admin/login"
                 className="btn-secondary text-lg px-8 py-4"
               >
                 Admin Access
               </Link>
             </div>

             
           </div>
         </div>
       </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-6 bg-white dark:bg-neutral-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need for productive work tracking
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Comprehensive tools designed to help teams track time, manage projects, and boost productivity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card card-hover text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Time Tracking
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Track your work hours with precision using our intuitive timer system and detailed analytics.
              </p>
            </div>

            <div className="card card-hover text-center">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Analytics & Reports
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Get detailed insights into your productivity patterns and project performance metrics.
              </p>
            </div>

            <div className="card card-hover text-center">
              <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Team Management
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage team schedules, shifts, and availability in one centralized platform.
              </p>
            </div>

            <div className="card card-hover text-center">
              <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-danger-600 dark:text-danger-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Performance Insights
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Monitor productivity trends and identify areas for improvement with actionable insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
                         <div className="flex items-center justify-center space-x-3 mb-6">
               <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
               <img src="/ALIGNZO_Name.png" alt="Alignzo" className="h-6 w-auto" />
             </div>
            <p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
              Professional work log tracking and productivity monitoring platform designed for modern teams.
            </p>
            
            <div className="flex justify-center space-x-8 mb-8">
              <a
                href="https://github.com/ryz3006/alignzo-lite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>View Source Code</span>
              </a>
              <a
                href="https://github.com/ryz3006"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Developer Profile</span>
              </a>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 pt-8 text-center">
                         <p className="text-sm text-neutral-400">
               &copy; {new Date().getFullYear()} All rights reserved.
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
