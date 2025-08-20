'use client';

import { useState, useEffect } from 'react';
import { supabase, Project, ProjectCategory } from '@/lib/supabase';
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
  const [formData, setFormData] = useState({
    ticket_id: '',
    task_detail: '',
    time_spent: '',
    ticket_summary: '',
    ticket_description: '',
    dynamic_category_selections: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      checkJiraIntegration();
      if (timerData) {
        setSelectedProject(timerData.project_id);
        setFormData({
          ticket_id: timerData.ticket_id,
          task_detail: timerData.task_detail,
          time_spent: '',
          ticket_summary: '',
          ticket_description: '',
          dynamic_category_selections: timerData.dynamic_category_selections || {},
        });
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
    }
  }, [ticketSource]);

  useEffect(() => {
    if (jiraTicketType === 'existing') {
      setFormData(prev => ({ 
        ...prev, 
        ticket_summary: '',
        ticket_description: ''
      }));
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

      const credentials = await getJiraCredentials(currentUser.email);
      setHasJiraIntegration(!!credentials);
    } catch (error) {
      console.error('Error checking JIRA integration:', error);
      setHasJiraIntegration(false);
    }
  };

  const loadProjects = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Get user's team memberships
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          users!inner(*)
        `)
        .eq('users.email', currentUser.email);

      if (teamError) throw teamError;

      // Get projects assigned to user's teams
      const userTeamIds = teamMemberships?.map(membership => membership.team_id) || [];
      
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .order('name');

      if (userTeamIds.length > 0) {
        // Get projects assigned to user's teams
        const { data: assignedProjects, error: assignedError } = await supabase
          .from('team_project_assignments')
          .select(`
            project_id,
            projects (*)
          `)
          .in('team_id', userTeamIds);

        if (assignedError) throw assignedError;

        const projectIds = assignedProjects?.map(assignment => assignment.project_id) || [];
        
        if (projectIds.length > 0) {
          const { data, error } = await projectsQuery.in('id', projectIds);
          if (error) throw error;
          setProjects(data || []);
        } else {
          setProjects([]);
        }
      } else {
        // If user is not in any teams, show all projects (fallback)
        const { data, error } = await projectsQuery;
        if (error) throw error;
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadProjectCategories = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setProjectCategories(data || []);
    } catch (error) {
      console.error('Error loading project categories:', error);
    }
  };

  const loadJiraProjectMappings = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email || !selectedProject) return;

      const response = await fetch(`/api/integrations/jira/project-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const mappings = data.mappings || [];
        // Filter mappings for the selected project
        const projectMappings = mappings.filter((mapping: JiraProjectMapping) => 
          mapping.dashboard_project_id === selectedProject
        );
        setJiraProjectMappings(projectMappings);
      }
    } catch (error) {
      console.error('Error loading JIRA project mappings:', error);
    }
  };

  const searchJiraTickets = async () => {
    if (!searchTerm.trim() || !selectedJiraProject) return;

    setIsSearching(true);
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

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.tickets || []);
        setShowSearchResults(true);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to search tickets');
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Failed to search tickets');
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
      let description = formData.ticket_description || '';
      
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

      if (response.ok) {
        const data = await response.json();
        const ticketKey = data.ticket.key;
        setFormData(prev => ({ ...prev, ticket_id: ticketKey }));
        toast.success(`JIRA ticket ${ticketKey} created successfully`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create JIRA ticket');
      }
    } catch (error) {
      console.error('Error creating JIRA ticket:', error);
      toast.error('Failed to create JIRA ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const selectTicket = (ticket: JiraTicket) => {
    setFormData(prev => ({ ...prev, ticket_id: ticket.key }));
    setSearchTerm(ticket.key);
    setShowSearchResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (ticketSource === 'jira' && jiraTicketType === 'new') {
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

    if (!formData.time_spent.trim()) {
      toast.error('Please enter time spent');
      return;
    }

    setLoading(true);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) {
        toast.error('User not authenticated');
        return;
      }

      // Parse time spent (expecting format like "2h 30m" or "2.5h")
      const timeSpentHours = parseTimeSpent(formData.time_spent);
      if (timeSpentHours === null) {
        toast.error('Invalid time format. Please use format like "2h 30m" or "2.5h"');
        return;
      }

      // Save work log to database
      const { error } = await supabase
        .from('work_logs')
        .insert({
          user_email: currentUser.email,
          project_id: selectedProject,
          ticket_id: formData.ticket_id,
          task_detail: formData.task_detail,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          total_pause_duration_seconds: 0,
          logged_duration_seconds: Math.round(timeSpentHours * 3600), // Convert hours to seconds
          dynamic_category_selections: formData.dynamic_category_selections
        });

      if (error) throw error;

      toast.success('Work log saved successfully');

      // Reset form
      setFormData({
        ticket_id: '',
        task_detail: '',
        time_spent: '',
        ticket_summary: '',
        ticket_description: '',
        dynamic_category_selections: {},
      });
      setSelectedProject('');
      setTicketSource('custom');
      setJiraTicketType('new');
      setSelectedJiraProject('');
      setSearchResults([]);
      setShowSearchResults(false);
      onClose();
    } catch (error) {
      console.error('Error saving work log:', error);
      toast.error('Failed to save work log');
    } finally {
      setLoading(false);
    }
  };

  const parseTimeSpent = (timeString: string): number | null => {
    const trimmed = timeString.trim().toLowerCase();
    
    // Handle formats like "2h 30m", "2.5h", "30m", "2h"
    const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
    const minuteMatch = trimmed.match(/(\d+)\s*m/);
    
    let hours = 0;
    let minutes = 0;
    
    if (hourMatch) {
      hours = parseFloat(hourMatch[1]);
    }
    
    if (minuteMatch) {
      minutes = parseInt(minuteMatch[1]);
    }
    
    if (hours === 0 && minutes === 0) {
      return null;
    }
    
    return hours + (minutes / 60);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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

          {/* New Ticket Fields */}
          {ticketSource === 'jira' && jiraTicketType === 'new' && hasJiraIntegration && (
            <>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Description
                </label>
                <textarea
                  rows={3}
                  value={formData.ticket_description}
                  onChange={(e) => setFormData({ ...formData, ticket_description: e.target.value })}
                  placeholder="Enter ticket description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
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
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
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
              placeholder={ticketSource === 'jira' ? "Will be populated automatically" : "e.g., TASK-123"}
              disabled={ticketSource === 'jira' && jiraTicketType === 'new'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>

          {/* Task Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Detail *
            </label>
            <textarea
              required
              rows={3}
              maxLength={600}
              value={formData.task_detail}
              onChange={(e) => setFormData({ ...formData, task_detail: e.target.value })}
              placeholder="Describe what you worked on..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.task_detail.length}/600 characters
            </div>
          </div>

          {/* Time Spent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Spent *
            </label>
            <input
              type="text"
              required
              value={formData.time_spent}
              onChange={(e) => setFormData({ ...formData, time_spent: e.target.value })}
              placeholder="e.g., 2h 30m or 2.5h"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Format: 2h 30m, 2.5h, 30m, etc.
            </div>
          </div>

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
              disabled={loading || isCreatingTicket}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isCreatingTicket ? 'Creating Ticket...' : 'Save Work Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
