'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Settings,
  AlertCircle
} from 'lucide-react';

interface JiraIntegration {
  id?: string;
  base_url: string;
  user_email_integration: string;
  api_token: string;
  is_verified: boolean;
}

export default function IntegrationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [jiraIntegration, setJiraIntegration] = useState<JiraIntegration>({
    base_url: '',
    user_email_integration: '',
    api_token: '',
    is_verified: false
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await loadJiraIntegration(currentUser.email!);
      }
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const loadJiraIntegration = async (userEmail: string) => {
    try {
      const response = await fetch(`/api/integrations/jira?userEmail=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.integration) {
          setJiraIntegration({
            id: data.integration.id,
            base_url: data.integration.base_url || '',
            user_email_integration: data.integration.user_email_integration || '',
            api_token: data.integration.api_token || '',
            is_verified: data.integration.is_verified
          });
        }
      }
    } catch (error) {
      console.error('Failed to load JIRA integration:', error);
    }
  };

  const handleVerify = async () => {
    if (!jiraIntegration.base_url || !jiraIntegration.user_email_integration || !jiraIntegration.api_token) {
      setVerificationStatus('error');
      setVerificationMessage('Please fill in all fields before verifying.');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setVerificationMessage('');

    try {
      const response = await fetch('/api/integrations/jira/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: jiraIntegration.base_url,
          user_email: jiraIntegration.user_email_integration,
          api_token: jiraIntegration.api_token,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setVerificationMessage('JIRA connection verified successfully!');
        setJiraIntegration(prev => ({ ...prev, is_verified: true }));
      } else {
        setVerificationStatus('error');
        setVerificationMessage(data.message || 'Failed to verify JIRA connection. Please check your credentials.');
      }
    } catch (error) {
      setVerificationStatus('error');
      setVerificationMessage('An error occurred while verifying the connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!user?.email) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/integrations/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          base_url: jiraIntegration.base_url,
          user_email_integration: jiraIntegration.user_email_integration,
          api_token: jiraIntegration.api_token,
          is_verified: jiraIntegration.is_verified,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setJiraIntegration(prev => ({ ...prev, id: data.integration.id }));
        setShowModal(false);
        // Reload the integration data
        await loadJiraIntegration(user.email);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to save integration.');
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
      alert('An error occurred while saving the integration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setShowModal(true);
    setVerificationStatus('idle');
    setVerificationMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-2">
          Connect your external tools and services to enhance your workflow.
        </p>
      </div>

      {/* JIRA Integration Tile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">JIRA</h3>
              <p className="text-gray-600 text-sm">
                Connect to JIRA to sync issues and track work items
              </p>
              {jiraIntegration.is_verified && (
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">Connected</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {jiraIntegration.is_verified ? (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Settings className="w-4 h-4 mr-2 inline" />
                Edit
              </button>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Integrate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Integration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {jiraIntegration.is_verified ? 'Edit JIRA Integration' : 'Connect to JIRA'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JIRA URL (Base URL)
                  </label>
                  <input
                    type="url"
                    value={jiraIntegration.base_url}
                    onChange={(e) => setJiraIntegration(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://your-domain.atlassian.net"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    value={jiraIntegration.user_email_integration}
                    onChange={(e) => setJiraIntegration(prev => ({ ...prev, user_email_integration: e.target.value }))}
                    placeholder="your-email@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={jiraIntegration.api_token}
                    onChange={(e) => setJiraIntegration(prev => ({ ...prev, api_token: e.target.value }))}
                    placeholder="Enter your JIRA API token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can generate an API token in your Atlassian account settings.
                  </p>
                </div>

                {/* Verification Status */}
                {verificationStatus !== 'idle' && (
                  <div className={`p-3 rounded-md ${
                    verificationStatus === 'success' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {verificationStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      <span className={`text-sm ${
                        verificationStatus === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {verificationMessage}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Connection'}
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !jiraIntegration.is_verified}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Integration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
