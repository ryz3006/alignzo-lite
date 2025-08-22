'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Project, ProjectCategory } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials } from '@/lib/jira';
import { X, Save, Search, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerData?: {
    project_id: string;
    ticket_id: string;
    task_detail: string;
    dynamic_category_selections?: Record<string, string>;
  };
}

interface JiraProjectMapping {
  id: string;
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

interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
  };
}

export default function EnhancedWorkLogModal({ isOpen, onClose, timerData }: WorkLogModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [jiraProjectMappings, setJiraProjectMappings] = useState<JiraProjectMapping[]>([]);
  const [hasJiraIntegration, setHasJiraIntegration] = useState(false);
  const [ticketSource, setTicketSource] = useState<'custom' | 'jira'>('custom');
  const [jiraTicketType, setJiraTicketType] = useState<'new' | 'existing'>('new');
  const [selectedJiraProject, setSelectedJiraProject] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<JiraTicket[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [formData, setFormData] = useState({
    ticket_id: '',
    task_detail: '',
    start_datetime: '',
    end_datetime: '',
    ticket_summary: '',
    dynamic_category_selections: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      checkJiraIntegration();
      setTicketCreated(false);
      
      // Set default datetime values (current time for end, 1 hour ago for start)
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      setFormData(prev => ({
        ...prev,
        start_datetime: oneHourAgo.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
        end_datetime: now.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
      }));

      if (timerData) {
        setSelectedProject(timerData.project_id);
        setFormData(prev => ({
          ...prev,
          ticket_id: timerData.ticket_id,
          task_detail: timerData.task_detail,
          dynamic_category_selections: timerData.dynamic_category_selections || {},
        }));
      }
    }
  }, [isOpen, timerData]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectCategories(selectedProject);
      loadJiraProjectMappings();
    } else {
      setProjectCategories([]);
      setJiraProjectMappings([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (ticketSource === 'custom') {
      setSelectedJiraProject('');
      setSearchResults([]);
      setShowSearchResults(false);
      setJiraTicketType('new');
      setTicketCreated(false);
    }
  }, [ticketSource]);

  useEffect(() => {
    if (jiraTicketType === 'existing') {
      setFormData(prev => ({ 
        ...prev, 
        ticket_summary: ''
      }));
      setTicketCreated(false);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        ticket_id: '',
        searchTerm: ''
      }));
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [jiraTicketType]);

  const checkJiraIntegration = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await supabaseClient.get('user_integrations', {
        select: 'is_verified',
        filters: { 
          user_email: currentUser.email,
          integration_type: 'jira'
        }
      });

      if (response.error) throw new Error(response.error);
      setHasJiraIntegration(response.data && response.data.length > 0 && response.data[0].is_verified);
    } catch (error) {
      console.error('Error checking Jira integration:', error);
      setHasJiraIntegration(false);
    }
  };

  const loadProjects = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Get user's team memberships
      const teamResponse = await supabaseClient.get('team_members', {
        select: 'team_id,users!inner(*)',
        filters: { 'users.email': currentUser.email }
      });

      if (teamResponse.error) throw new Error(teamResponse.error);

      // Get projects assigned to user's teams
      const userTeamIds = teamResponse.data?.map((membership: any) => membership.team_id) || [];
      
      if (userTeamIds.length > 0) {
        // Get projects assigned to user's teams
        const assignedResponse = await supabaseClient.get('team_project_assignments', {
          select: 'project_id,projects(*)',
          filters: { team_id: userTeamIds }
        });

        if (assignedResponse.error) throw new Error(assignedResponse.error);

        const projectIds = assignedResponse.data?.map((assignment: any) => assignment.project_id) || [];
        
        if (projectIds.length > 0) {
          const response = await supabaseClient.get('projects', {
            select: '*',
            filters: { id: projectIds },
            order: { column: 'name', ascending: true }
          });
          if (response.error) throw new Error(response.error);
          setProjects(response.data || []);
        } else {
          setProjects([]);
        }
      } else {
        // If user is not in any teams, show all projects (fallback)
        const response = await supabaseClient.get('projects', {
          select: '*',
          order: { column: 'name', ascending: true }
        });
        if (response.error) throw new Error(response.error);
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadProjectCategories = async (projectId: string) => {
    try {
      const response = await supabaseClient.get('project_categories', {
        select: '*',
        filters: { project_id: projectId }
      });

      if (response.error) throw new Error(response.error);
      setProjectCategories(response.data || []);
    } catch (error) {
      console.error('Error loading project categories:', error);
      toast.error('Failed to load project categories');
    }
  };

  const loadJiraProjectMappings = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await supabaseClient.get('jira_project_mappings', {
        select: '*,project:projects(*)',
        filters: { 
          dashboard_project_id: selectedProject,
          integration_user_email: currentUser.email
        }
      });

      if (response.error) throw new Error(response.error);
      setJiraProjectMappings(response.data || []);
    } catch (error) {
      console.error('Error loading Jira project mappings:', error);
    }
  };

  const searchJiraTickets = async () => {
    if (!searchTerm.trim() || !selectedJiraProject) return;

    setIsSearching(true);
    setShowSearchResults(false);
    setSearchResults([]);
    
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await fetch('/api/jira/search-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          projectKey: selectedJiraProject,
          searchTerm: searchTerm.trim(),
          maxResults: 20
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSearchResults(data.tickets || []);
        setShowSearchResults(true);
        
        if (data.tickets.length === 0) {
          toast('No tickets found matching your search term', { icon: '🔍' });
        } else {
          toast.success(`Found ${data.tickets.length} tickets`);
        }
      } else {
        // Handle JIRA API errors
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
        
        // Log detailed error for debugging
        if (data.details) {
          console.error('JIRA search error details:', data.details);
        }
        
        // Show rate limit info if available
        if (data.rateLimitInfo) {
          console.log('Rate limit info:', data.rateLimitInfo);
        }
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const createJiraTicket = async () => {
    if (!selectedJiraProject || !formData.ticket_summary.trim()) {
      toast.error('Please select a JIRA project and enter ticket summary');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Prepare description with category information
      let description = formData.task_detail || '';
      
      // Add category information to description if any categories are selected
      const selectedCategories = Object.entries(formData.dynamic_category_selections)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([category, value]) => `${category}: ${value}`);

      if (selectedCategories.length > 0) {
        const categoryInfo = `\n\n---\n**Categories:**\n${selectedCategories.map(cat => `- ${cat}`).join('\n')}`;
        description += categoryInfo;
      }

      const response = await fetch('/api/jira/create-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          projectKey: selectedJiraProject,
          summary: formData.ticket_summary,
          description: description,
          issueType: 'Task',
          priority: 'Medium'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const ticketKey = data.ticket.key;
        setFormData(prev => ({ ...prev, ticket_id: ticketKey }));
        setTicketCreated(true);
        toast.success(data.message || `JIRA ticket ${ticketKey} created successfully`);
      } else {
        // Handle JIRA API errors
        const errorMessage = data.error || 'Failed to create JIRA ticket';
        toast.error(errorMessage);
        
        // Log detailed error for debugging
        if (data.details) {
          console.error('JIRA create ticket error details:', data.details);
        }
        
        // Show rate limit info if available
        if (data.rateLimitInfo) {
          console.log('Rate limit info:', data.rateLimitInfo);
        }
      }
    } catch (error) {
      console.error('Error creating JIRA ticket:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const selectTicket = (ticket: JiraTicket) => {
    setFormData(prev => ({ ...prev, ticket_id: ticket.key }));
    setSearchTerm(ticket.key);
    setShowSearchResults(false);
  };

  const validateDateTime = () => {
    const startTime = new Date(formData.start_datetime);
    const endTime = new Date(formData.end_datetime);
    
    if (startTime >= endTime) {
      toast.error('Start time must be earlier than end time');
      return false;
    }
    
    return true;
  };

  const calculateDuration = () => {
    const startTime = new Date(formData.start_datetime);
    const endTime = new Date(formData.end_datetime);
    const durationMs = endTime.getTime() - startTime.getTime();
    return Math.round(durationMs / 1000); // Convert to seconds
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (ticketSource === 'jira' && jiraTicketType === 'new' && !ticketCreated) {
      if (!formData.ticket_summary.trim()) {
        toast.error('Please enter ticket summary');
        return;
      }
      // Create the ticket first
      await createJiraTicket();
      return; // The form will be submitted after ticket creation
    }

    if (!formData.ticket_id.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }

    if (!formData.task_detail.trim()) {
      toast.error('Please enter task details');
      return;
    }

    if (!formData.start_datetime || !formData.end_datetime) {
      toast.error('Please select both start and end times');
      return;
    }

    if (!validateDateTime()) {
      return;
    }

    setLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) {
        toast.error('User not authenticated');
        return;
      }

      const durationSeconds = calculateDuration();

      // Save work log to database
      const { error } = await supabaseClient.insert('work_logs', {
        user_email: currentUser.email,
        project_id: selectedProject,
        ticket_id: formData.ticket_id,
        task_detail: formData.task_detail,
        start_time: new Date(formData.start_datetime).toISOString(),
        end_time: new Date(formData.end_datetime).toISOString(),
        total_pause_duration_seconds: 0,
        logged_duration_seconds: durationSeconds,
        dynamic_category_selections: formData.dynamic_category_selections
      });

      if (error) throw error;

      toast.success('Work log saved successfully');

      // Reset form
      setFormData({
        ticket_id: '',
        task_detail: '',
        start_datetime: '',
        end_datetime: '',
        ticket_summary: '',
        dynamic_category_selections: {},
      });
      setSelectedProject('');
      setTicketSource('custom');
      setJiraTicketType('new');
      setSelectedJiraProject('');
      setSearchResults([]);
      setShowSearchResults(false);
      setTicketCreated(false);
      onClose();
    } catch (error) {
      console.error('Error saving work log:', error);
      toast.error('Failed to save work log');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dynamic_category_selections: {
        ...prev.dynamic_category_selections,
        [categoryName]: value,
      },
    }));
  };

  const getButtonText = () => {
    if (ticketSource === 'jira' && jiraTicketType === 'new' && !ticketCreated) {
      return isCreatingTicket ? 'Creating Ticket...' : 'Create Ticket';
    }
    return loading ? 'Saving...' : 'Save Work Log';
  };

  const isButtonDisabled = () => {
    if (ticketSource === 'jira' && jiraTicketType === 'new' && !ticketCreated) {
      return isCreatingTicket || !formData.ticket_summary.trim() || !selectedJiraProject;
    }
    return loading || !formData.ticket_id.trim() || !formData.task_detail.trim() || !formData.start_datetime || !formData.end_datetime;
  };

  const formatDuration = () => {
    if (!formData.start_datetime || !formData.end_datetime) return '';
    
    const durationSeconds = calculateDuration();
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        {/* Loading Overlay */}
        {isCreatingTicket && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-md">
            <div className="text-center">
              <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-neutral-600 font-medium">Creating JIRA ticket...</p>
              <p className="text-sm text-neutral-500 mt-1">Please wait while we process your request</p>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Work Log</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              required
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Source Selection */}
          {hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Source
              </label>
              <select
                value={ticketSource}
                onChange={(e) => setTicketSource(e.target.value as 'custom' | 'jira')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="custom">Custom</option>
                <option value="jira">JIRA</option>
              </select>
            </div>
          )}

          {/* JIRA Ticket Type Selection */}
          {ticketSource === 'jira' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JIRA Ticket Type
              </label>
              <select
                value={jiraTicketType}
                onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="new">New Ticket</option>
                <option value="existing">Existing Ticket</option>
              </select>
            </div>
          )}

          {/* JIRA Project Selection */}
          {ticketSource === 'jira' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JIRA Project *
              </label>
              <select
                required
                value={selectedJiraProject}
                onChange={(e) => setSelectedJiraProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a JIRA project</option>
                {jiraProjectMappings.map((mapping) => (
                  <option key={mapping.id} value={mapping.jira_project_key}>
                    {mapping.jira_project_name || mapping.jira_project_key}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Ticket Summary Field */}
          {ticketSource === 'jira' && jiraTicketType === 'new' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Summary *
              </label>
              <input
                type="text"
                required
                value={formData.ticket_summary}
                onChange={(e) => setFormData({ ...formData, ticket_summary: e.target.value })}
                placeholder="Enter ticket summary..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Existing Ticket Search */}
          {ticketSource === 'jira' && jiraTicketType === 'existing' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Existing Ticket
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyPress={(e) => e.key === 'Enter' && searchJiraTickets()}
                  />
                  <button
                    type="button"
                    onClick={searchJiraTickets}
                    disabled={isSearching || !searchTerm.trim() || !selectedJiraProject}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {showSearchResults && (
                <div className="mt-2">
                  {searchResults.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {searchResults.map((ticket) => (
                        <div
                          key={ticket.key}
                          onClick={() => selectTicket(ticket)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">{ticket.key}</div>
                              <div className="text-xs text-gray-600 truncate">{ticket.fields.summary}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {ticket.fields.status.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-md bg-gray-50">
                      No tickets found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ticket ID Display/Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket ID *
            </label>
            <input
              type="text"
              required
              value={formData.ticket_id}
              onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
              placeholder={ticketSource === 'jira' && jiraTicketType === 'new' ? "Will be populated automatically" : "e.g., TASK-123"}
              disabled={ticketSource === 'jira' && jiraTicketType === 'new'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>

          {/* Task Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {ticketSource === 'jira' && jiraTicketType === 'new' ? 'Task Description' : 'Task Detail'} *
            </label>
            <textarea
              required
              rows={3}
              maxLength={600}
              value={formData.task_detail}
              onChange={(e) => setFormData({ ...formData, task_detail: e.target.value })}
              placeholder={ticketSource === 'jira' && jiraTicketType === 'new' ? "Describe the task (will be used as ticket description)..." : "Describe what you worked on..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.task_detail.length}/600 characters
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.start_datetime}
              onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.end_datetime}
              onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Duration Display */}
          {formData.start_datetime && formData.end_datetime && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-600">Duration:</div>
              <div className="text-lg font-medium text-gray-900">{formatDuration()}</div>
            </div>
          )}

          {/* Dynamic Categories */}
          {projectCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-3">
                {projectCategories.map((category) => (
                  <div key={category.id}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {category.name}
                    </label>
                    <select
                      value={formData.dynamic_category_selections[category.name] || ''}
                      onChange={(e) => handleCategoryChange(category.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select {category.name}</option>
                      {category.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isButtonDisabled()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {getButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
