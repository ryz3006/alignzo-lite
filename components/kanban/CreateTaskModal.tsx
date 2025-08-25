'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink } from 'lucide-react';
import { CreateTaskForm, ProjectWithCategories, ProjectCategory, ProjectSubcategory, KanbanColumn } from '@/lib/kanban-types';
import { supabaseClient } from '@/lib/supabase-client';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: CreateTaskForm) => void;
  projectData: ProjectWithCategories | null;
  userEmail: string | null;
  selectedTeam: string;
  columnId?: string;
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

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  projectData,
  userEmail,
  selectedTeam,
  columnId
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskForm>({
    title: '',
    description: '',
    project_id: '',
    category_id: '',
    subcategory_id: '',
    column_id: '',
    priority: 'medium',
    estimated_hours: undefined,
    due_date: '',
    jira_ticket_id: '',
    jira_ticket_key: '',
    scope: 'project',
    assigned_to: ''
  });

  const [errors, setErrors] = useState<Record<keyof CreateTaskForm, string | undefined>>({} as Record<keyof CreateTaskForm, string | undefined>);
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // JIRA Integration states
  const [hasJiraIntegration, setHasJiraIntegration] = useState(false);
  const [jiraProjectMappings, setJiraProjectMappings] = useState<JiraProjectMapping[]>([]);
  const [selectedJiraProject, setSelectedJiraProject] = useState<string>('');
  const [jiraTicketType, setJiraTicketType] = useState<'new' | 'existing'>('existing');
  const [showJiraSearch, setShowJiraSearch] = useState(false);
  const [jiraSearchQuery, setJiraSearchQuery] = useState('');
  const [jiraSearchResults, setJiraSearchResults] = useState<JiraTicket[]>([]);
  const [jiraSearching, setJiraSearching] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkJiraIntegration();
      setTicketCreated(false);
      if (selectedTeam) {
        loadTeamMembers();
      }
    }
  }, [isOpen, selectedTeam]);

  useEffect(() => {
    if (projectData) {
      setFormData(prev => ({
        ...prev,
        project_id: projectData.id,
        column_id: columnId || projectData.columns[0]?.id || ''
      }));
      loadJiraProjectMappings();
    }
  }, [projectData, columnId]);

  useEffect(() => {
    if (formData.category_id && projectData) {
      const category = projectData.categories.find(c => c.id === formData.category_id);
      if (category) {
        const categorySubcategories = projectData.subcategories.filter(s => s.category_id === formData.category_id);
        setSubcategories(categorySubcategories);
      }
    } else {
      setSubcategories([]);
    }
    
    // Reset subcategory when category changes
    if (formData.subcategory_id && !subcategories.find(s => s.id === formData.subcategory_id)) {
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [formData.category_id, projectData]);

  useEffect(() => {
    if (jiraTicketType === 'existing') {
      setFormData(prev => ({ 
        ...prev, 
        jira_ticket_key: ''
      }));
      setTicketCreated(false);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        jira_ticket_id: '',
        jira_ticket_key: ''
      }));
      setJiraSearchResults([]);
      setShowJiraSearch(false);
    }
  }, [jiraTicketType]);

  // Auto-submit form after JIRA ticket creation
  useEffect(() => {
    if (ticketCreated && jiraTicketType === 'new') {
      // Submit the form after a short delay to ensure the ticket is properly linked
      const timer = setTimeout(() => {
        onSubmit(formData);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [ticketCreated, jiraTicketType, formData, onSubmit]);

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

  const loadTeamMembers = async () => {
    try {
      if (!selectedTeam) return;

      const response = await fetch(`/api/teams/team-members?teamId=${selectedTeam}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadJiraProjectMappings = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email || !projectData?.id) return;

      const response = await supabaseClient.get('jira_project_mappings', {
        select: '*,project:projects(*)',
        filters: { 
          dashboard_project_id: projectData.id,
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
    if (!jiraSearchQuery.trim() || !selectedJiraProject) return;

    setJiraSearching(true);
    setShowJiraSearch(false);
    setJiraSearchResults([]);
    
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
          searchTerm: jiraSearchQuery.trim(),
          maxResults: 20
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJiraSearchResults(data.tickets || []);
        setShowJiraSearch(true);
        
        if (data.tickets.length === 0) {
          toast('No tickets found matching your search term', { icon: '🔍' });
        } else {
          toast.success(`Found ${data.tickets.length} tickets`);
        }
      } else {
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setJiraSearching(false);
    }
  };

  const createJiraTicket = async () => {
    if (!selectedJiraProject || !formData.title.trim()) {
      toast.error('Please select a JIRA project and enter task title');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Prepare description with task details
      let description = formData.description || '';
      
      // Add task details to description
      if (formData.description) {
        description += '\n\n---\n**Task Details:**\n';
        description += `- Priority: ${formData.priority}\n`;
        if (formData.estimated_hours) {
          description += `- Estimated Hours: ${formData.estimated_hours}\n`;
        }
        if (formData.due_date) {
          description += `- Due Date: ${new Date(formData.due_date).toLocaleDateString()}\n`;
        }
      }

      const response = await fetch('/api/jira/create-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentUser.email,
          projectKey: selectedJiraProject,
          summary: formData.title,
          description: description,
          issueType: 'Task',
          priority: formData.priority === 'urgent' ? 'Highest' : 
                   formData.priority === 'high' ? 'High' : 
                   formData.priority === 'medium' ? 'Medium' : 'Low'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const ticketKey = data.ticket.key;
        setFormData(prev => ({ 
          ...prev, 
          jira_ticket_id: ticketKey,
          jira_ticket_key: ticketKey 
        }));
        setTicketCreated(true);
        toast.success(data.message || `JIRA ticket ${ticketKey} created successfully`);
      } else {
        const errorMessage = data.error || 'Failed to create JIRA ticket';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating JIRA ticket:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const selectJiraTicket = (ticket: JiraTicket) => {
    setFormData(prev => ({
      ...prev,
      jira_ticket_id: ticket.key,
      jira_ticket_key: ticket.key
    }));
    setShowJiraSearch(false);
    setJiraSearchQuery('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<keyof CreateTaskForm, string | undefined> = {} as Record<keyof CreateTaskForm, string | undefined>;

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }



    if (formData.estimated_hours && formData.estimated_hours <= 0) {
      newErrors.estimated_hours = 'Estimated hours must be greater than 0';
    }

    if (formData.due_date && new Date(formData.due_date) < new Date()) {
      newErrors.due_date = 'Due date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If JIRA integration is enabled and creating new ticket, create it first
    if (hasJiraIntegration && jiraTicketType === 'new' && !ticketCreated) {
      if (!selectedJiraProject) {
        toast.error('Please select a JIRA project');
        return;
      }
      if (!formData.title.trim()) {
        toast.error('Please enter task title');
        return;
      }
      // Create the ticket first
      await createJiraTicket();
      return; // The form will be submitted after ticket creation
    }

    // Submit the form
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreateTaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Create New Task
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Basic Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-neutral-300 dark:border-neutral-600'
                } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                placeholder="Enter task title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                placeholder="Enter task description"
              />
            </div>
          </div>

          {/* Project and Scope */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Project & Scope
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Project
                </label>
                <div className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {projectData ? `${projectData.name} - ${projectData.product} (${projectData.country})` : 'No project selected'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Scope *
                </label>
                <select
                  value={formData.scope}
                  onChange={(e) => handleInputChange('scope', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="project">Project</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Categories
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.category_id 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                >
                  <option value="">Select Category</option>
                  {projectData?.categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Subcategory
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  disabled={!formData.category_id}
                >
                  <option value="">Select Subcategory</option>
                  {subcategories.map(subcategory => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Task Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => handleInputChange('estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min="0"
                  step="0.5"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.estimated_hours 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="0.0"
                />
                {errors.estimated_hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.due_date 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Assign To
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.first_name} {member.last_name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* JIRA Integration */}
          {hasJiraIntegration && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                JIRA Integration
              </h3>
              
              <div className="space-y-4">
                {/* JIRA Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    JIRA Project
                  </label>
                  {jiraProjectMappings.length > 0 ? (
                    <select
                      value={selectedJiraProject}
                      onChange={(e) => setSelectedJiraProject(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      <option value="">Select JIRA Project</option>
                      {jiraProjectMappings.map(mapping => (
                        <option key={mapping.id} value={mapping.jira_project_key}>
                          {mapping.jira_project_key} - {mapping.jira_project_name || mapping.jira_project_key}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      No JIRA projects mapped for this project
                    </div>
                  )}
                </div>

                {/* Ticket Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Ticket Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="existing"
                        checked={jiraTicketType === 'existing'}
                        onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Link Existing Ticket</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="new"
                        checked={jiraTicketType === 'new'}
                        onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Create New Ticket</span>
                    </label>
                  </div>
                </div>

                {/* Existing Ticket Search */}
                {jiraTicketType === 'existing' && selectedJiraProject && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={formData.jira_ticket_key}
                        onChange={(e) => handleInputChange('jira_ticket_key', e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        placeholder="e.g., PROJ-123 or search for tickets..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowJiraSearch(!showJiraSearch)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>

                    {showJiraSearch && (
                      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-700">
                        <div className="flex space-x-2 mb-3">
                          <input
                            type="text"
                            value={jiraSearchQuery}
                            onChange={(e) => setJiraSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                            placeholder="Search JIRA tickets..."
                          />
                          <button
                            type="button"
                            onClick={searchJiraTickets}
                            disabled={jiraSearching}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {jiraSearching ? 'Searching...' : 'Search'}
                          </button>
                        </div>

                        {jiraSearchResults.length > 0 && (
                          <div className="space-y-2">
                            {jiraSearchResults.map((ticket, index) => (
                              <div
                                key={index}
                                onClick={() => selectJiraTicket(ticket)}
                                className="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-500 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {ticket.key}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.fields.priority?.name || 'medium')}`}>
                                    {ticket.fields.priority?.name || 'Medium'}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                                  {ticket.fields.summary}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                  Status: {ticket.fields.status.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* New Ticket Creation */}
                {jiraTicketType === 'new' && selectedJiraProject && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">
                        A new JIRA ticket will be created with the task details
                      </span>
                      <button
                        type="button"
                        onClick={createJiraTicket}
                        disabled={isCreatingTicket || !formData.title.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isCreatingTicket ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>Create Ticket</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {ticketCreated && formData.jira_ticket_key && (
                      <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-800 dark:text-green-200">
                            JIRA ticket <strong>{formData.jira_ticket_key}</strong> created successfully!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
