'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Settings,
  AlertCircle,
  Users,
  MapPin,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';

interface JiraIntegration {
  id?: string;
  base_url: string;
  user_email_integration: string;
  api_token: string;
  is_verified: boolean;
}

interface JiraUserMapping {
  id?: string;
  user_email: string;
  jira_assignee_name: string;
  jira_reporter_name?: string;
  jira_project_key?: string;
  integration_user_email: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export default function IntegrationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
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
  
  // User mapping states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userMappings, setUserMappings] = useState<JiraUserMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [editingMapping, setEditingMapping] = useState<JiraUserMapping | null>(null);

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
          
          // Load team members and user mappings if integration is verified
          if (data.integration.is_verified) {
            await loadTeamMembers();
            await loadUserMappings(userEmail);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load JIRA integration:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');
      
      if (error) throw error;
      setTeamMembers(users || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const loadUserMappings = async (integrationUserEmail: string) => {
    try {
      setLoadingMappings(true);
      const response = await fetch(`/api/integrations/jira/user-mapping?integrationUserEmail=${encodeURIComponent(integrationUserEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setUserMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Failed to load user mappings:', error);
    } finally {
      setLoadingMappings(false);
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
      const response = await fetch('/api/jira/verify-credentials', {
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

  const handleUserMapping = () => {
    setShowMappingModal(true);
    setEditingMapping(null);
  };

  const handleSaveMapping = async (mapping: Omit<JiraUserMapping, 'integration_user_email'>) => {
    if (!user?.email) return;

    try {
      const response = await fetch('/api/integrations/jira/user-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...mapping,
          integration_user_email: user.email,
        }),
      });

      if (response.ok) {
        await loadUserMappings(user.email);
        setShowMappingModal(false);
        setEditingMapping(null);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to save mapping.');
      }
    } catch (error) {
      console.error('Failed to save mapping:', error);
      alert('An error occurred while saving the mapping.');
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      const response = await fetch(`/api/integrations/jira/user-mapping?id=${mappingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadUserMappings(user!.email!);
      } else {
        alert('Failed to delete mapping.');
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      alert('An error occurred while deleting the mapping.');
    }
  };

  const handleEditMapping = (mapping: JiraUserMapping) => {
    setEditingMapping(mapping);
    setShowMappingModal(true);
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
              <>
                <button
                  onClick={handleUserMapping}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <MapPin className="w-4 h-4 mr-2 inline" />
                  User Mapping
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Settings className="w-4 h-4 mr-2 inline" />
                  Edit
                </button>
              </>
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

      {/* User Mappings Section */}
      {jiraIntegration.is_verified && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">JIRA User Mappings</h3>
            </div>
            <button
              onClick={handleUserMapping}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </button>
          </div>
          
          {loadingMappings ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : userMappings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No user mappings configured yet.</p>
              <p className="text-sm text-gray-400">Map your team members' emails to JIRA assignee/reporter names to enable enhanced analytics.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JIRA Assignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JIRA Reporter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userMappings.map((mapping) => (
                    <tr key={mapping.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {teamMembers.find(m => m.email === mapping.user_email)?.full_name || mapping.user_email}
                        </div>
                        <div className="text-sm text-gray-500">{mapping.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.jira_assignee_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.jira_reporter_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.jira_project_key || 'All Projects'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditMapping(mapping)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMapping(mapping.id!)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      {/* User Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMapping ? 'Edit User Mapping' : 'Add User Mapping'}
                </h3>
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    setEditingMapping(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <UserMappingForm
                teamMembers={teamMembers}
                mapping={editingMapping}
                onSave={handleSaveMapping}
                onCancel={() => {
                  setShowMappingModal(false);
                  setEditingMapping(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Mapping Form Component
interface UserMappingFormProps {
  teamMembers: TeamMember[];
  mapping: JiraUserMapping | null;
  onSave: (mapping: Omit<JiraUserMapping, 'integration_user_email'>) => void;
  onCancel: () => void;
}

function UserMappingForm({ teamMembers, mapping, onSave, onCancel }: UserMappingFormProps) {
  const [formData, setFormData] = useState({
    userEmail: mapping?.user_email || '',
    jiraAssigneeName: mapping?.jira_assignee_name || '',
    jiraReporterName: mapping?.jira_reporter_name || '',
    jiraProjectKey: mapping?.jira_project_key || ''
  });

  // Initialize search terms when mapping changes
  useEffect(() => {
    setAssigneeSearchTerm(mapping?.jira_assignee_name || '');
    setReporterSearchTerm(mapping?.jira_reporter_name || '');
  }, [mapping]);
  
  const [jiraUsers, setJiraUsers] = useState<Array<{id: string, name: string, email: string, username: string}>>([]);
  const [loadingJiraUsers, setLoadingJiraUsers] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showReporterDropdown, setShowReporterDropdown] = useState(false);
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState('');
  const [reporterSearchTerm, setReporterSearchTerm] = useState('');
  const [jiraUsersError, setJiraUsersError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle clicks outside the form to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
        setShowReporterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch JIRA users for suggestions
  const fetchJiraUsers = async (searchQuery = '') => {
    try {
      setLoadingJiraUsers(true);
      const currentUser = await getCurrentUser();
      if (currentUser?.email) {
        console.log('Fetching JIRA users for:', currentUser.email, 'with query:', searchQuery);
        let url = `/api/integrations/jira/users?userEmail=${encodeURIComponent(currentUser.email)}`;
        if (searchQuery.trim()) {
          url += `&query=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(url);
        console.log('JIRA users API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('JIRA users data:', data);
          setJiraUsers(data.users || []);
          setJiraUsersError(data.error || null);
        } else {
          const errorData = await response.json();
          console.error('JIRA users API error:', errorData);
          setJiraUsersError(errorData.error || 'Failed to fetch JIRA users');
        }
      }
    } catch (error) {
      console.error('Failed to fetch JIRA users:', error);
    } finally {
      setLoadingJiraUsers(false);
    }
  };

  // Manual search function triggered by search icon click
  const handleManualSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      fetchJiraUsers(searchQuery);
      setShowAssigneeDropdown(true);
      setShowReporterDropdown(true);
    }
  };

  // Initial fetch on component mount (without search query)
  useEffect(() => {
    fetchJiraUsers();
  }, []);

  const handleAssigneeSelect = (user: {name: string, username: string}) => {
    setFormData(prev => ({ ...prev, jiraAssigneeName: user.name }));
    setAssigneeSearchTerm(user.name);
    setShowAssigneeDropdown(false);
  };

  const handleReporterSelect = (user: {name: string, username: string}) => {
    setFormData(prev => ({ ...prev, jiraReporterName: user.name }));
    setReporterSearchTerm(user.name);
    setShowReporterDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userEmail || !formData.jiraAssigneeName) {
      alert('Please fill in all required fields.');
      return;
    }
    // Transform camelCase keys to snake_case to match JiraUserMapping interface
    onSave({
      user_email: formData.userEmail,
      jira_assignee_name: formData.jiraAssigneeName,
      jira_reporter_name: formData.jiraReporterName,
      jira_project_key: formData.jiraProjectKey
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Team Member Email <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.userEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select a team member</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.email}>
              {member.full_name} ({member.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JIRA Assignee Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={assigneeSearchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setAssigneeSearchTerm(value);
                setFormData(prev => ({ ...prev, jiraAssigneeName: value }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSearch(assigneeSearchTerm);
                }
              }}
              onFocus={() => setShowAssigneeDropdown(true)}
              placeholder="Type JIRA user name or email..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                onClick={() => handleManualSearch(assigneeSearchTerm)}
                className="px-3 py-1 mx-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                title="Search JIRA users"
              >
                🔍
              </button>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Show/hide dropdown"
              >
                ▼
              </button>
            </div>
          </div>
                     {showAssigneeDropdown && (
             <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
               {loadingJiraUsers ? (
                 <div className="p-3 text-center text-gray-500">Loading JIRA users...</div>
               ) : jiraUsersError ? (
                 <div className="p-3 text-center">
                   <div className="text-orange-600 text-sm mb-2">{jiraUsersError}</div>
                   <div className="text-gray-500 text-xs">Showing sample data for testing</div>
                 </div>
               ) : jiraUsers.length > 0 ? (
                 <>
                   {jiraUsers
                     .filter(user => 
                       user.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                       user.username.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(assigneeSearchTerm.toLowerCase())
                     )
                     .slice(0, 10) // Limit to 10 results for better performance
                     .map((user) => (
                       <button
                         key={user.id}
                         type="button"
                         onClick={() => handleAssigneeSelect(user)}
                         className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                       >
                         <div className="font-medium">{user.name}</div>
                         <div className="text-sm text-gray-500">@{user.username} • {user.email}</div>
                       </button>
                     ))}
                 </>
               ) : (
                 <div className="p-3 text-center text-gray-500">No JIRA users found</div>
               )}
             </div>
           )}
        </div>
                 <p className="text-xs text-gray-500 mt-1">
           Type a name or email, then click 🔍 or press Enter to search JIRA users
         </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JIRA Reporter Name
        </label>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={reporterSearchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setReporterSearchTerm(value);
                setFormData(prev => ({ ...prev, jiraReporterName: value }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSearch(reporterSearchTerm);
                }
              }}
              onFocus={() => setShowReporterDropdown(true)}
              placeholder="Type JIRA user name or email (optional)..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                onClick={() => handleManualSearch(reporterSearchTerm)}
                className="px-3 py-1 mx-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                title="Search JIRA users"
              >
                🔍
              </button>
              <button
                type="button"
                onClick={() => setShowReporterDropdown(!showReporterDropdown)}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Show/hide dropdown"
              >
                ▼
              </button>
            </div>
          </div>
                     {showReporterDropdown && (
             <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
               {loadingJiraUsers ? (
                 <div className="p-3 text-center text-gray-500">Loading JIRA users...</div>
               ) : jiraUsersError ? (
                 <div className="p-3 text-center">
                   <div className="text-orange-600 text-sm mb-2">{jiraUsersError}</div>
                   <div className="text-gray-500 text-xs">Showing sample data for testing</div>
                 </div>
               ) : jiraUsers.length > 0 ? (
                 <>
                   {jiraUsers
                     .filter(user => 
                       user.name.toLowerCase().includes(reporterSearchTerm.toLowerCase()) ||
                       user.username.toLowerCase().includes(reporterSearchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(reporterSearchTerm.toLowerCase())
                     )
                     .slice(0, 10) // Limit to 10 results for better performance
                     .map((user) => (
                       <button
                         key={user.id}
                         type="button"
                         onClick={() => handleReporterSelect(user)}
                         className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                       >
                         <div className="font-medium">{user.name}</div>
                         <div className="text-sm text-gray-500">@{user.username} • {user.email}</div>
                       </button>
                     ))}
                 </>
               ) : (
                 <div className="p-3 text-center text-gray-500">No JIRA users found</div>
               )}
             </div>
           )}
        </div>
                 <p className="text-xs text-gray-500 mt-1">
           Optional: Type a name or email, then click 🔍 or press Enter to search JIRA users
         </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JIRA Project Key
        </label>
        <input
          type="text"
          value={formData.jiraProjectKey}
          onChange={(e) => setFormData(prev => ({ ...prev, jiraProjectKey: e.target.value }))}
          placeholder="e.g., PROJ, DEV (leave empty for all projects)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Specific JIRA project key. Leave empty to apply to all projects.
        </p>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {mapping ? 'Update Mapping' : 'Save Mapping'}
        </button>
      </div>
    </form>
  );
}
