'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
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

export default function CreateTaskModalOptimized({
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
  const [localCategories, setLocalCategories] = useState<ProjectCategory[]>([]);
  const [localSubcategories, setLocalSubcategories] = useState<ProjectSubcategory[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [isLoadingJira, setIsLoadingJira] = useState(false);
  
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

  // Memoized function to load categories
  const loadCategoriesForProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    setIsLoadingCategories(true);
    try {
      console.log('Loading categories for project:', projectId);
      
      // Load categories
      const categoriesResponse = await supabaseClient.get('project_categories', {
        select: '*',
        filters: { project_id: projectId, is_active: true },
        order: { column: 'sort_order', ascending: true }
      });

      if (categoriesResponse.error) throw new Error(categoriesResponse.error);
      
      const categories = categoriesResponse.data || [];
      console.log('Loaded categories:', categories);

      // Load subcategories for all categories
      const categoryIds = categories.map((cat: any) => cat.id);
      let subcategories: any[] = [];
      
      if (categoryIds.length > 0) {
        const subcategoriesResponse = await supabaseClient.get('project_subcategories', {
          select: '*',
          filters: { category_id: categoryIds, is_active: true },
          order: { column: 'sort_order', ascending: true }
        });

        if (subcategoriesResponse.error) throw new Error(subcategoriesResponse.error);
        subcategories = subcategoriesResponse.data || [];
      }

      console.log('Loaded subcategories:', subcategories);
      
      // Update local state with loaded categories and subcategories
      setLocalCategories(categories);
      setLocalSubcategories(subcategories);
    } catch (error) {
      console.error('Error loading categories for project:', error);
      toast.error('Failed to load categories. Please try again.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Memoized function to load team members
  const loadTeamMembers = useCallback(async () => {
    if (!selectedTeam) return;
    
    setIsLoadingTeamMembers(true);
    try {
      const response = await fetch(`/api/teams/team-members?teamId=${selectedTeam}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoadingTeamMembers(false);
    }
  }, [selectedTeam]);

  // Memoized function to check JIRA integration
  const checkJiraIntegration = useCallback(async () => {
    setIsLoadingJira(true);
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
    } finally {
      setIsLoadingJira(false);
    }
  }, []);

  // Memoized function to load JIRA project mappings
  const loadJiraProjectMappings = useCallback(async () => {
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
  }, [projectData?.id]);

  // Initialize modal when it opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      console.log('CreateTaskModal opened with projectData:', projectData);
      console.log('Categories:', projectData?.categories);
      console.log('Subcategories:', projectData?.subcategories);
      
      // Reset form data
      setFormData({
        title: '',
        description: '',
        project_id: projectData?.id || '',
        category_id: '',
        subcategory_id: '',
        column_id: columnId || (projectData?.columns && projectData.columns[0]?.id) || '',
        priority: 'medium',
        estimated_hours: undefined,
        due_date: '',
        jira_ticket_id: '',
        jira_ticket_key: '',
        scope: 'project',
        assigned_to: ''
      });
      
      setErrors({} as Record<keyof CreateTaskForm, string | undefined>);
      setTicketCreated(false);
      setShowJiraSearch(false);
      setJiraSearchQuery('');
      setJiraSearchResults([]);
      
      // Load data in parallel
      const loadData = async () => {
        try {
          await Promise.all([
            // Load categories if not available in projectData
            projectData?.id && (!projectData.categories || (projectData.categories && projectData.categories.length === 0)) 
              ? loadCategoriesForProject(projectData.id) 
              : Promise.resolve(),
            // Load team members
            selectedTeam ? loadTeamMembers() : Promise.resolve(),
            // Check JIRA integration
            checkJiraIntegration(),
            // Load JIRA project mappings
            loadJiraProjectMappings()
          ]);
        } catch (error) {
          console.error('Error loading modal data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, projectData, selectedTeam, columnId, loadCategoriesForProject, loadTeamMembers, checkJiraIntegration, loadJiraProjectMappings]);

  // Update form data when project data changes
  useEffect(() => {
    if (projectData) {
      setFormData(prev => ({
        ...prev,
        project_id: projectData.id,
        column_id: columnId || (projectData.columns && projectData.columns[0]?.id) || ''
      }));
    }
  }, [projectData, columnId]);

  // Handle category change and load subcategories
  useEffect(() => {
    if (formData.category_id) {
      let categorySubcategories: ProjectSubcategory[] = [];
      
      // First try to get subcategories from projectData
      if (projectData && projectData.categories) {
        const category = projectData.categories.find(c => c.id === formData.category_id);
        if (category && projectData.subcategories) {
          categorySubcategories = projectData.subcategories.filter(s => s.category_id === formData.category_id);
        }
      }
      
      // If no subcategories found in projectData, try local subcategories
      if (categorySubcategories.length === 0) {
        categorySubcategories = localSubcategories.filter(s => s.category_id === formData.category_id);
      }
      
      setSubcategories(categorySubcategories);
    } else {
      setSubcategories([]);
    }
    
    // Reset subcategory when category changes
    if (formData.subcategory_id && !subcategories.find(s => s.id === formData.subcategory_id)) {
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [formData.category_id, projectData, localSubcategories]);

  // Handle JIRA ticket type change
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

    if (!formData.column_id) {
      newErrors.column_id = 'Column is required';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Fix timestamp issue: convert empty string to null for due_date
      const formDataToSubmit = {
        ...formData,
        due_date: formData.due_date || null
      };
      
      onSubmit(formDataToSubmit);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to create task. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
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
    setErrors({} as Record<keyof CreateTaskForm, string | undefined>);
    setSubcategories([]);
    setLocalCategories([]);
    setLocalSubcategories([]);
    setTeamMembers([]);
    setJiraProjectMappings([]);
    setSelectedJiraProject('');
    setJiraTicketType('existing');
    setShowJiraSearch(false);
    setJiraSearchQuery('');
    setJiraSearchResults([]);
    setTicketCreated(false);
    onClose();
  };

  // Get available categories (from projectData or local state)
  const availableCategories = (projectData?.categories && projectData.categories.length > 0)
    ? projectData.categories 
    : localCategories;

  // Get available columns (from projectData)
  const availableColumns = projectData?.columns || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Task</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading task form...</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h3>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Enter task title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter task description"
              />
            </div>
          </div>

          {/* Project and Category Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Project & Category</h3>
            
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project *
              </label>
              <input
                type="text"
                value={projectData?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <div className="relative">
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value, subcategory_id: '' }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  disabled={isLoadingCategories}
                >
                  <option value="">Select a category</option>
                  {isLoadingCategories ? (
                    <option value="" disabled>Loading categories...</option>
                  ) : availableCategories.length === 0 ? (
                    <option value="" disabled>No categories available</option>
                  ) : (
                    availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
                {isLoadingCategories && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
              )}
            </div>

            {/* Subcategory */}
            {formData.category_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subcategory
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a subcategory (optional)</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Column *
              </label>
              <select
                value={formData.column_id}
                onChange={(e) => setFormData(prev => ({ ...prev, column_id: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.column_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              >
                <option value="">Select a column</option>
                {availableColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
              {errors.column_id && (
                <p className="mt-1 text-sm text-red-600">{errors.column_id}</p>
              )}
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Task Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.0"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                                 <input
                   type="date"
                   value={formData.due_date || ''}
                   onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                 />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign To
                </label>
                <div className="relative">
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={isLoadingTeamMembers}
                  >
                    <option value="">Unassigned</option>
                    {isLoadingTeamMembers ? (
                      <option value="" disabled>Loading team members...</option>
                    ) : (
                      teamMembers.map((member) => (
                        <option key={member.id} value={member.email}>
                          {member.full_name || member.email}
                        </option>
                      ))
                    )}
                  </select>
                  {isLoadingTeamMembers && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* JIRA Integration */}
          {hasJiraIntegration && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">JIRA Integration</h3>
              
              <div className="space-y-4">
                {/* JIRA Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    JIRA Project
                  </label>
                  <select
                    value={selectedJiraProject}
                    onChange={(e) => setSelectedJiraProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select JIRA project</option>
                    {jiraProjectMappings.map((mapping) => (
                      <option key={mapping.id} value={mapping.jira_project_key}>
                        {mapping.jira_project_name || mapping.jira_project_key}
                      </option>
                    ))}
                  </select>
                </div>

                {/* JIRA Ticket Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    JIRA Ticket Type
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">Link Existing Ticket</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="new"
                        checked={jiraTicketType === 'new'}
                        onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Create New Ticket</span>
                    </label>
                  </div>
                </div>

                {/* JIRA Ticket Search/Creation */}
                {selectedJiraProject && (
                  <div className="space-y-4">
                    {jiraTicketType === 'existing' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Search JIRA Tickets
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={jiraSearchQuery}
                            onChange={(e) => setJiraSearchQuery(e.target.value)}
                            placeholder="Search tickets..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={searchJiraTickets}
                            disabled={!jiraSearchQuery.trim() || jiraSearching}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {jiraSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </button>
                        </div>
                        
                        {/* JIRA Search Results */}
                        {showJiraSearch && (
                          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                            {jiraSearchResults.length === 0 ? (
                              <p className="p-2 text-sm text-gray-500">No tickets found</p>
                            ) : (
                              jiraSearchResults.map((ticket) => (
                                <button
                                  key={ticket.key}
                                  type="button"
                                  onClick={() => selectJiraTicket(ticket)}
                                  className="w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                                >
                                  <div className="font-medium text-sm">{ticket.key}</div>
                                  <div className="text-xs text-gray-500">{ticket.fields.summary}</div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={createJiraTicket}
                          disabled={!formData.title.trim() || isCreatingTicket}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCreatingTicket ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Creating JIRA Ticket...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create JIRA Ticket
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked JIRA Ticket Display */}
                {(formData.jira_ticket_key || formData.jira_ticket_id) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Linked JIRA Ticket
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {formData.jira_ticket_key || formData.jira_ticket_id}
                        </span>
                        {ticketCreated && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Created
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, jira_ticket_id: '', jira_ticket_key: '' }));
                          setTicketCreated(false);
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
