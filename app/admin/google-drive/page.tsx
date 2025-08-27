'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
}

export default function AdminGoogleDrivePage() {
  const [configData, setConfigData] = useState<GoogleDriveConfig>({
    clientId: '',
    clientSecret: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/google-drive/config');
      const data = await response.json();
      
      if (data.configured) {
        setIsConfigured(true);
        // Note: We don't load the actual secret for security
        setConfigData(prev => ({ ...prev, clientId: '••••••••••••••••••••••••••••••••' }));
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Error checking configuration:', error);
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!configData.clientId || !configData.clientSecret) {
      toast.error('Please provide both Client ID and Client Secret');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/google-drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Google Drive configuration saved successfully');
        setIsConfigured(true);
        setConfigData(prev => ({ ...prev, clientId: '••••••••••••••••••••••••••••••••' }));
        setConfigData(prev => ({ ...prev, clientSecret: '' }));
        setTestResult(null);
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConfiguration = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/google-drive/auth');
      const data = await response.json();
      
      if (data.success) {
        setTestResult({
          success: true,
          message: 'Configuration is valid! OAuth URL generated successfully.'
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Configuration test failed'
        });
      }
    } catch (error) {
      console.error('Error testing configuration:', error);
      setTestResult({
        success: false,
        message: 'Failed to test configuration'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const resetConfiguration = async () => {
    if (!confirm('Are you sure you want to reset the Google Drive configuration? This will remove all stored credentials.')) {
      return;
    }

    try {
      const response = await fetch('/api/google-drive/config', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Configuration reset successfully');
        setIsConfigured(false);
        setConfigData({ clientId: '', clientSecret: '' });
        setTestResult(null);
      } else {
        toast.error('Failed to reset configuration');
      }
    } catch (error) {
      console.error('Error resetting configuration:', error);
      toast.error('Error resetting configuration');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Google Drive Configuration
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Manage Google Drive OAuth credentials and integration settings
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {isConfigured && (
                <>
                  <button
                    onClick={testConfiguration}
                    disabled={testLoading}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    {testLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span>Test Configuration</span>
                  </button>
                  <button
                    onClick={resetConfiguration}
                    className="btn-danger"
                  >
                    Reset Configuration
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        {isConfigured && (
          <div className="mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Google Drive is configured
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Users can now access Google Drive integration
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <div className="mb-6">
            <div className={`${
              testResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              } border rounded-lg p-4`}
            >
              <div className="flex items-center">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                )}
                <div>
                  <h3 className={`text-sm font-medium ${
                    testResult.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {testResult.success ? 'Test Successful' : 'Test Failed'}
                  </h3>
                  <p className={`text-sm ${
                    testResult.success 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                OAuth 2.0 Credentials
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                Configure Google Cloud OAuth 2.0 credentials for Drive API access
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={configData.clientId}
                onChange={(e) => setConfigData(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Google OAuth Client ID"
                disabled={isConfigured}
              />
              {isConfigured && (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Client ID is configured (hidden for security)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={configData.clientSecret}
                  onChange={(e) => setConfigData(prev => ({ ...prev, clientSecret: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your Google OAuth Client Secret"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={saveConfiguration}
                disabled={saving || !configData.clientId || !configData.clientSecret}
                className="btn-primary flex items-center space-x-2"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-4">Setup Instructions:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Google Cloud Console Setup:</h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                  <li>2. Create a new project or select existing one</li>
                  <li>3. Enable Google Drive API</li>
                  <li>4. Configure OAuth consent screen</li>
                  <li>5. Create OAuth 2.0 credentials</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Authorized Redirect URIs:</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>Add these redirect URIs to your OAuth 2.0 credentials:</p>
                  <code className="block bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-xs mt-2">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/google-drive/auth/callback` : 'your-domain.com/api/google-drive/auth/callback'}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Security Notice
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Client secrets are securely hashed before storage. Only authorized administrators 
                  can access and modify these credentials. Keep your Google Cloud credentials secure.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
