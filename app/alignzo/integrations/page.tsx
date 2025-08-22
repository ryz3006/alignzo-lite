'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { User } from 'firebase/auth';
import { supabaseClient } from '@/lib/supabase-client';
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
  Trash2,
  FolderOpen
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

interface JiraProjectMapping {
  id?: string;
  dashboard_project_id: string;
  jira_project_key: string;
  jira_project_name?: string;
  integration_user_email: string;
  project?: {
    id: string;
    name: string;
    product: string;
    country: string;
  };
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
  
  // Project mapping states
  const [projectMappings, setProjectMappings] = useState<JiraProjectMapping[]>([]);
  const [loadingProjectMappings, setLoadingProjectMappings] = useState(false);
  const [dashboardProjects, setDashboardProjects] = useState<any[]>([]);
  const [showProjectMappingModal, setShowProjectMappingModal] = useState(false);
  const [editingProjectMapping, setEditingProjectMapping] = useState<JiraProjectMapping | null>(null);

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
      const response = await supabaseClient.get('user_integrations', {
        select: '*',
        filters: { 
          user_email: userEmail,
          integration_type: 'jira'
        }
      });

      if (response.error) {
        console.error('Error loading JIRA integration:', response.error);
        throw new Error(response.error);
      }

      const data = response.data?.[0]; // Get first result since we expect single

      if (data) {
        setJiraIntegration({
          id: data.id,
          base_url: data.base_url || '',
          user_email_integration: data.user_email_integration || '',
          api_token: data.api_token || '',
          is_verified: data.is_verified || false
        });
        
        // Load project mappings if integration is verified
        if (data.is_verified) {
          await loadProjectMappings(userEmail);
        }
      }
    } catch (error) {
      console.error('Error loading JIRA integration:', error);
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

  // Project mapping functions
  const loadProjectMappings = async (integrationUserEmail: string) => {
    try {
      setLoadingProjectMappings(true);
      const response = await fetch(`/api/integrations/jira/project-mapping?integrationUserEmail=${encodeURIComponent(integrationUserEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setProjectMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Failed to load project mappings:', error);
    } finally {
      setLoadingProjectMappings(false);
    }
  };

  const loadDashboardProjects = async () => {
    try {
      const response = await supabaseClient.getProjects({
        order: { column: 'name', ascending: true }
      });

      if (response.error) {
        console.error('Error loading dashboard projects:', response.error);
        throw new Error(response.error);
      }
      setDashboardProjects(response.data || []);
    } catch (error) {
      console.error('Failed to load dashboard projects:', error);
    }
  };

  const handleProjectMapping = () => {
    setShowProjectMappingModal(true);
    setEditingProjectMapping(null);
    loadDashboardProjects();
  };

  const handleSaveProjectMapping = async (mapping: Omit<JiraProjectMapping, 'integration_user_email'>) => {
    if (!user?.email) return;

    try {
      const response = await fetch('/api/integrations/jira/project-mapping', {
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
        await loadProjectMappings(user.email);
        setShowProjectMappingModal(false);
        setEditingProjectMapping(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save project mapping.');
      }
    } catch (error) {
      console.error('Failed to save project mapping:', error);
      alert('An error occurred while saving the project mapping.');
    }
  };

  const handleDeleteProjectMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this project mapping?')) return;

    try {
      const response = await fetch(`/api/integrations/jira/project-mapping?mappingId=${mappingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadProjectMappings(user!.email!);
      } else {
        alert('Failed to delete project mapping.');
      }
    } catch (error) {
      console.error('Failed to delete project mapping:', error);
      alert('An error occurred while deleting the project mapping.');
    }
  };

  const handleEditProjectMapping = (mapping: JiraProjectMapping) => {
    setEditingProjectMapping(mapping);
    setShowProjectMappingModal(true);
    loadDashboardProjects();
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
                  onClick={handleProjectMapping}
                  className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FolderOpen className="w-4 h-4 mr-2 inline" />
                  Project Mapping
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

      {/* Project Mappings Section */}
      {jiraIntegration.is_verified && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FolderOpen className="w-5 h-5 mr-2 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">JIRA Project Mappings</h3>
            </div>
            <button
              onClick={handleProjectMapping}
              className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </button>
          </div>
          
          {loadingProjectMappings ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : projectMappings.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No project mappings configured yet.</p>
              <p className="text-sm text-gray-400">Map your dashboard projects to JIRA projects to enable filtered analytics.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JIRA Project Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JIRA Project Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectMappings.map((mapping) => (
                    <tr key={mapping.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {mapping.project?.name || 'Unknown Project'}
                        </div>
                        <div className="text-sm text-gray-500">{mapping.project?.product} • {mapping.project?.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.jira_project_key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.jira_project_name || mapping.jira_project_key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditProjectMapping(mapping)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProjectMapping(mapping.id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      {/* Project Mapping Modal */}
      {showProjectMappingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProjectMapping ? 'Edit Project Mapping' : 'Add Project Mapping'}
                </h3>
                <button
                  onClick={() => {
                    setShowProjectMappingModal(false);
                    setEditingProjectMapping(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <ProjectMappingForm
                dashboardProjects={dashboardProjects}
                mapping={editingProjectMapping}
                onSave={handleSaveProjectMapping}
                onCancel={() => {
                  setShowProjectMappingModal(false);
                  setEditingProjectMapping(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Project Mapping Form Component
interface ProjectMappingFormProps {
  dashboardProjects: any[];
  mapping: JiraProjectMapping | null;
  onSave: (mapping: Omit<JiraProjectMapping, 'integration_user_email'>) => void;
  onCancel: () => void;
}

function ProjectMappingForm({ dashboardProjects, mapping, onSave, onCancel }: ProjectMappingFormProps) {
  const [formData, setFormData] = useState({
    dashboardProjectId: mapping?.dashboard_project_id || '',
    jiraProjectKey: mapping?.jira_project_key || '',
    jiraProjectName: mapping?.jira_project_name || ''
  });
  const [jiraProjects, setJiraProjects] = useState<any[]>([]);
  const [loadingJiraProjects, setLoadingJiraProjects] = useState(false);
  const [showJiraProjectDropdown, setShowJiraProjectDropdown] = useState(false);
  const [jiraProjectSearchTerm, setJiraProjectSearchTerm] = useState('');
  const [jiraProjectsError, setJiraProjectsError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle clicks outside the form to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowJiraProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize search term when mapping changes
  useEffect(() => {
    if (mapping) {
      setJiraProjectSearchTerm(mapping.jira_project_name || mapping.jira_project_key);
    }
  }, [mapping]);

  const fetchJiraProjects = async (searchQuery = '') => {
    try {
      setLoadingJiraProjects(true);
      setJiraProjectsError(null);
      
      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.email;
      if (!userEmail) return;

      const params = new URLSearchParams({ userEmail });
      if (searchQuery) {
        params.append('query', searchQuery);
      }

      const response = await fetch(`/api/integrations/jira/projects?${params}`);
      const data = await response.json();

      if (response.ok) {
        setJiraProjects(data.projects || []);
        if (data.error) {
          setJiraProjectsError(data.error);
        }
      } else {
        console.error('JIRA projects API error:', data);
        setJiraProjectsError(data.error || 'Failed to fetch JIRA projects');
      }
    } catch (error) {
      console.error('Error fetching JIRA projects:', error);
      setJiraProjectsError('Failed to fetch JIRA projects');
    } finally {
      setLoadingJiraProjects(false);
    }
  };

  // Manual search function triggered by search icon click
  const handleManualSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      fetchJiraProjects(searchQuery);
      setShowJiraProjectDropdown(true);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchJiraProjects();
  }, []);

  const handleJiraProjectSelect = (project: {key: string, name: string}) => {
    setFormData(prev => ({ 
      ...prev, 
      jiraProjectKey: project.key,
      jiraProjectName: project.name
    }));
    setJiraProjectSearchTerm(project.name);
    setShowJiraProjectDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dashboardProjectId || !formData.jiraProjectKey) {
      alert('Please select both dashboard project and JIRA project.');
      return;
    }

    onSave({
      dashboard_project_id: formData.dashboardProjectId,
      jira_project_key: formData.jiraProjectKey,
      jira_project_name: formData.jiraProjectName
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dashboard Project <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.dashboardProjectId}
          onChange={(e) => setFormData(prev => ({ ...prev, dashboardProjectId: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          required
        >
          <option value="">Select a dashboard project</option>
          {dashboardProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JIRA Project <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={jiraProjectSearchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setJiraProjectSearchTerm(value);
                setFormData(prev => ({ ...prev, jiraProjectKey: value }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSearch(jiraProjectSearchTerm);
                }
              }}
              onFocus={() => setShowJiraProjectDropdown(true)}
              placeholder="Type JIRA project name or key..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                onClick={() => handleManualSearch(jiraProjectSearchTerm)}
                className="px-3 py-1 mx-1 text-green-600 hover:text-green-800 focus:outline-none"
                title="Search JIRA projects"
              >
                🔍
              </button>
              <button
                type="button"
                onClick={() => setShowJiraProjectDropdown(!showJiraProjectDropdown)}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Show/hide dropdown"
              >
                ▼
              </button>
            </div>
          </div>
          {showJiraProjectDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {loadingJiraProjects ? (
                <div className="p-3 text-center text-gray-500">Loading JIRA projects...</div>
              ) : jiraProjectsError ? (
                <div className="p-3 text-center">
                  <div className="text-orange-600 text-sm mb-2">{jiraProjectsError}</div>
                </div>
              ) : jiraProjects.length > 0 ? (
                <>
                  {jiraProjects
                    .filter(project => 
                      project.name.toLowerCase().includes(jiraProjectSearchTerm.toLowerCase()) ||
                      project.key.toLowerCase().includes(jiraProjectSearchTerm.toLowerCase())
                    )
                    .slice(0, 10) // Limit to 10 results for better performance
                    .map((project) => (
                      <button
                        key={project.key}
                        type="button"
                        onClick={() => handleJiraProjectSelect(project)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.key} • {project.description}</div>
                      </button>
                    ))}
                </>
              ) : (
                <div className="p-3 text-center text-gray-500">No JIRA projects found</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Type a project name or key, then click 🔍 or press Enter to search JIRA projects
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
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          {mapping ? 'Update Mapping' : 'Save Mapping'}
        </button>
      </div>
    </form>
  );
}
