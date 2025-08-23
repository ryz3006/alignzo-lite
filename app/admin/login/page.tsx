'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAsAdmin } from '@/lib/auth';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInAsAdmin(email, password);
      toast.success('Login successful!');
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      console.log('Admin login attempt failed');
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Main Login */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to main login</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Admin Access
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Sign in to access the administrative panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="email" className="form-label dark:text-neutral-200">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-modern dark:bg-neutral-700 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-400"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label dark:text-neutral-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input-modern pr-12 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white dark:placeholder-neutral-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign in to Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl border border-warning-200 dark:border-warning-800">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-warning-600 dark:text-warning-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-warning-700 dark:text-warning-300">
                <p className="font-medium mb-1">Security Notice</p>
                <p>Admin credentials are configured server-side for enhanced security. Contact your system administrator for access.</p>
              </div>
            </div>
          </div>

          {/* Additional Security Info */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl">
              <Lock className="h-6 w-6 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Encrypted</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">End-to-end encryption</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl">
              <Shield className="h-6 w-6 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Secure</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">Role-based access</p>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleTheme}
            className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
}
