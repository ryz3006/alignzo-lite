'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Project, ProjectCategory } from '@/lib/supabase';
import { useTimer } from './TimerContext';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials } from '@/lib/jira';
import { getProjectCategoriesWithCache } from '@/lib/kanban-api-enhanced-client';
import { getUserProjectsWithCache } from '@/lib/kanban-api-enhanced-client';
import { X, Play, Search, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function EnhancedTimerModal({ isOpen, onClose }: TimerModalProps) {
  const { startTimer } = useTimer();
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
    ticket_summary: '',
    dynamic_category_selections: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      checkJiraIntegration();
      setTicketCreated(false);
    }
  }, [isOpen]);

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
      // Get current user email
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) {
        console.error('No authenticated user found');
        return;
      }

      // Use enhanced cached API for user projects
      const projects = await getUserProjectsWithCache(currentUser.email);
      setProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadProjectCategories = async (projectId: string) => {
    try {
      // Use enhanced cached API for project categories
      const categories = await getProjectCategoriesWithCache(projectId);
      setProjectCategories(categories);
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

    setLoading(true);

    try {
      // Start the timer immediately (like legacy timer)
      await startTimer({
        project_id: selectedProject,
        ticket_id: formData.ticket_id,
        task_detail: formData.task_detail,
        dynamic_category_selections: formData.dynamic_category_selections,
      });

      // If we have category selections, save them to the new table
      if (Object.keys(formData.dynamic_category_selections).length > 0) {
        const categorySelections = [];
        
        for (const [categoryName, selectedValue] of Object.entries(formData.dynamic_category_selections)) {
          if (selectedValue && selectedValue.trim() !== '') {
            // Find the category by name
            const category = projectCategories.find(cat => cat.name === categoryName);
            if (category) {
              // Find the selected option
              const selectedOption = category.options?.find(opt => opt.option_value === selectedValue);
              if (selectedOption) {
                categorySelections.push({
                  category_id: category.id,
                  selected_option_value: selectedValue
                });
              }
            }
          }
        }

        // Save category selections to the new table
        if (categorySelections.length > 0) {
          try {
            // Get the most recent timer for this user and project
            const currentUser = await getCurrentUser();
            if (currentUser?.email) {
              const response = await fetch(`/api/timers?userEmail=${currentUser.email}&projectId=${selectedProject}&limit=1`, {
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-email': currentUser.email,
                },
              });
              if (response.ok) {
                const timers = await response.json();
                if (timers.length > 0) {
                  const latestTimer = timers[0];
                  await fetch('/api/timers/category-selections', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-user-email': currentUser.email,
                    },
                    body: JSON.stringify({
                      timer_id: latestTimer.id,
                      category_selections: categorySelections
                    })
                  });
                }
              }
            }
          } catch (error) {
            console.warn('Failed to save category selections to new table:', error);
            // Don't fail the timer creation if this fails
          }
        }
      }

      // Reset form
      setFormData({
        ticket_id: '',
        task_detail: '',
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
      console.error('Error starting timer:', error);
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
    return loading ? 'Starting...' : 'Start Timer';
  };

  const isButtonDisabled = () => {
    if (ticketSource === 'jira' && jiraTicketType === 'new' && !ticketCreated) {
      return isCreatingTicket || !formData.ticket_summary.trim() || !selectedJiraProject;
    }
    return loading || !formData.ticket_id.trim() || !formData.task_detail.trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-neutral-800 dark:border-neutral-600">
        {/* Loading Overlay */}
        {isCreatingTicket && (
          <div className="absolute inset-0 bg-white dark:bg-neutral-800 bg-opacity-90 flex items-center justify-center z-10 rounded-md">
            <div className="text-center">
              <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">Creating JIRA ticket...</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Please wait while we process your request</p>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Start New Timer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Project *
            </label>
            <select
              required
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Ticket Source
              </label>
              <select
                value={ticketSource}
                onChange={(e) => setTicketSource(e.target.value as 'custom' | 'jira')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
              >
                <option value="custom">Custom</option>
                <option value="jira">JIRA</option>
              </select>
            </div>
          )}

          {/* JIRA Ticket Type Selection */}
          {ticketSource === 'jira' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                JIRA Ticket Type
              </label>
              <select
                value={jiraTicketType}
                onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
              >
                <option value="new">New Ticket</option>
                <option value="existing">Existing Ticket</option>
              </select>
            </div>
          )}

          {/* JIRA Project Selection */}
          {ticketSource === 'jira' && hasJiraIntegration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                JIRA Project *
              </label>
              <select
                required
                value={selectedJiraProject}
                onChange={(e) => setSelectedJiraProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Ticket Summary *
              </label>
              <input
                type="text"
                required
                value={formData.ticket_summary}
                onChange={(e) => setFormData({ ...formData, ticket_summary: e.target.value })}
                placeholder="Enter ticket summary..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && searchJiraTickets()}
                  />
                  <button
                    type="button"
                    onClick={searchJiraTickets}
                    disabled={isSearching || !searchTerm.trim() || !selectedJiraProject}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-300 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {showSearchResults && (
                <div className="mt-2">
                  {searchResults.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700">
                      {searchResults.map((ticket) => (
                        <div
                          key={ticket.key}
                          onClick={() => selectTicket(ticket)}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-600 cursor-pointer border-b border-gray-100 dark:border-neutral-600 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm text-gray-900 dark:text-white">{ticket.key}</div>
                              <div className="text-xs text-gray-600 dark:text-neutral-400 truncate">{ticket.fields.summary}</div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-neutral-400">
                              {ticket.fields.status.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-neutral-400 text-sm border border-gray-200 dark:border-neutral-600 rounded-md bg-gray-50 dark:bg-neutral-700">
                      No tickets found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ticket ID Display/Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Ticket ID *
            </label>
            <input
              type="text"
              required
              value={formData.ticket_id}
              onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
              placeholder={ticketSource === 'jira' && jiraTicketType === 'new' ? "Will be populated automatically" : "e.g., TASK-123"}
              disabled={ticketSource === 'jira' && jiraTicketType === 'new'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 dark:disabled:bg-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Task Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              {ticketSource === 'jira' && jiraTicketType === 'new' ? 'Task Description' : 'Task Detail'} *
            </label>
            <textarea
              required
              rows={3}
              maxLength={600}
              value={formData.task_detail}
              onChange={(e) => setFormData({ ...formData, task_detail: e.target.value })}
              placeholder={ticketSource === 'jira' && jiraTicketType === 'new' ? "Describe the task (will be used as ticket description)..." : "Describe what you're working on..."}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
            />
            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              {formData.task_detail.length}/600 characters
            </div>
          </div>

          {/* Dynamic Categories */}
          {projectCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Categories
              </label>
              <div className="space-y-3">
                {projectCategories.map((category) => (
                  <div key={category.id}>
                    <label className="block text-sm text-gray-600 dark:text-neutral-400 mb-1">
                      {category.name}
                    </label>
                    <select
                      value={formData.dynamic_category_selections[category.name] || ''}
                      onChange={(e) => handleCategoryChange(category.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select {category.name}</option>
                      {category.options?.map((option) => (
                        <option key={option.id} value={option.option_value}>
                          {option.option_name}
                        </option>
                      )) || []}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-gray-200 dark:bg-neutral-600 rounded-md hover:bg-gray-300 dark:hover:bg-neutral-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isButtonDisabled()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {getButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
