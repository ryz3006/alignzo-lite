'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings } from 'lucide-react';
import { CreateTaskForm, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskCategorySelection } from '@/lib/kanban-types';
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
    category_option_id: '',
    column_id: '',
    priority: 'medium',
    estimated_hours: undefined,
    due_date: '',
    jira_ticket_id: '',
    jira_ticket_key: '',
    scope: 'project',
    assigned_to: ''
  });

  // Add state for multiple category selections
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<keyof CreateTaskForm, string | undefined>>({} as Record<keyof CreateTaskForm, string | undefined>);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [localCategories, setLocalCategories] = useState<ProjectCategory[]>([]);
  
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

  // Memoized function to load categories with options
  const loadCategoriesForProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    setIsLoadingCategories(true);
    try {
      // Use the simplified API endpoint to get categories with options
      const response = await fetch(`/api/categories/project-options?projectId=${projectId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
          // Transform the data to match the expected format
          const categoriesWithOptions = data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            project_id: projectId,
            sort_order: cat.sort_order || 0,
            is_active: cat.is_active !== false,
            options: (cat.options || []).map((opt: any) => ({
              id: opt.id,
              category_id: cat.id,
              option_name: opt.option_name,
              option_value: opt.option_value,
              sort_order: opt.sort_order || 0,
              is_active: opt.is_active !== false
            }))
          }));
          
          setLocalCategories(categoriesWithOptions);
        } else {
          setLocalCategories([]);
        }
      } else {
        console.error('API failed to load categories');
        toast.error('Failed to load categories. Please try again.');
        setLocalCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories for project:', error);
      toast.error('Failed to load categories. Please try again.');
      setLocalCategories([]);
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

  // Format date for datetime-local input (remove timezone info)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Initialize modal when it opens
  useEffect(() => {
    if (isOpen) {
      
      // Reset form data
      setFormData({
        title: '',
        description: '',
        project_id: projectData?.id || '',
        category_id: '',
        category_option_id: '',
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
      setCategorySelections({}); // Reset category selections
      setTicketCreated(false);
      setShowJiraSearch(false);
      setJiraSearchQuery('');
      setJiraSearchResults([]);
      
      // Show loading state immediately
      setIsLoading(true);
      
      // Load data in parallel
      const loadData = async () => {
        try {
          await Promise.all([
            // Always load categories to ensure we have the latest data with options
            projectData?.id ? loadCategoriesForProject(projectData.id) : Promise.resolve(),
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

  // Get available categories (prioritize local state as it has the latest data with options)
  const availableCategories = localCategories.length > 0 
    ? localCategories 
    : (projectData?.categories || []);

  // Handle category change and reset category option
  useEffect(() => {
    // Reset category option when category changes
    if (formData.category_option_id) {
      const selectedCategory = availableCategories.find(c => c.id === formData.category_id);
      const optionExists = selectedCategory?.options?.some(opt => opt.id === formData.category_option_id);
      
      if (!optionExists) {
        setFormData(prev => ({ ...prev, category_option_id: '' }));
      }
    }
  }, [formData.category_id, availableCategories]);

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
        // Handle JIRA API errors
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
        
        // Log detailed error for debugging
        if (data.details) {
          console.error('JIRA search error details:', data.details);
        }
        
        // Show rate limit info if available

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

    // Check if ALL categories have been selected (mandatory)
    const availableCategoryIds = availableCategories.map(cat => cat.id);
    const selectedCategoryIds = Object.keys(categorySelections).filter(catId => 
      categorySelections[catId] && categorySelections[catId].trim() !== ''
    );
    
    if (selectedCategoryIds.length !== availableCategoryIds.length) {
      newErrors.category_id = 'All categories are mandatory and must be selected';
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
      // Convert category selections to the new format
      const categories: TaskCategorySelection[] = Object.entries(categorySelections)
        .filter(([categoryId, optionId]) => optionId && optionId.trim() !== '')
        .map(([categoryId, optionId], index) => ({
          category_id: categoryId,
          category_option_id: optionId,
          is_primary: false, // No primary concept
          sort_order: index
        }));

      // Get the first selected category and option for backward compatibility
      const selectedCategoryEntry = Object.entries(categorySelections).find(([categoryId, optionId]) => optionId && optionId.trim() !== '');
      const selectedCategoryId = selectedCategoryEntry ? selectedCategoryEntry[0] : '';
      const selectedOptionId = selectedCategoryEntry ? selectedCategoryEntry[1] : '';

      // Fix timestamp issue: convert empty string to null for due_date
      const formDataToSubmit = {
        ...formData,
        category_id: selectedCategoryId,
        category_option_id: selectedOptionId,
        categories: categories, // Add the new categories array
        due_date: formData.due_date || null
      };
      
      console.log('📝 CreateTaskModal - Submitting form data:', {
        formData: formData,
        categorySelections: categorySelections,
        categories: categories,
        formDataToSubmit: formDataToSubmit
      });
      
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
      category_option_id: '',
      column_id: '',
      priority: 'medium',
      estimated_hours: undefined,
      due_date: '',
      jira_ticket_id: '',
      jira_ticket_key: '',
      scope: 'project',
      assigned_to: ''
    });
    setCategorySelections({});
    setErrors({} as Record<keyof CreateTaskForm, string | undefined>);
    setLocalCategories([]);
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

  // Get available columns (from projectData)
  const availableColumns = projectData?.columns || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-neutral-800 dark:to-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Create New Task</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Add a new task to your project</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading task form...</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.title ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="Enter task title"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="Enter task description"
                />
              </div>
            </div>
          </div>

          {/* Project and Category Selection */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Project & Categories</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Project *
                </label>
                <input
                  type="text"
                  value={projectData?.name || ''}
                  disabled
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400"
                />
              </div>

              {/* Column */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Column *
                </label>
                <select
                  value={formData.column_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, column_id: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.column_id ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                >
                  <option value="">Select a column</option>
                  {availableColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
                {errors.column_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.column_id}</p>
                )}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Categories * (All Required)
              </label>
              <div className="space-y-4">
                {isLoadingCategories ? (
                  <div className="flex items-center space-x-3 text-neutral-500 p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading categories...</span>
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="text-neutral-500 p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl">No categories available for this project</div>
                ) : (
                  availableCategories.map((category) => (
                    <div key={category.id} className="border border-neutral-200 dark:border-neutral-600 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-700/50">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        {category.name} *
                      </label>
                      <select
                        value={categorySelections[category.id] || ''}
                        onChange={(e) => setCategorySelections(prev => ({
                          ...prev,
                          [category.id]: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        required
                      >
                        <option value="">Select an option (required)</option>
                        {(category.options || []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.option_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
              {errors.category_id && (
                <p className="mt-2 text-sm text-red-600">{errors.category_id}</p>
              )}
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Task Details</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="0.0"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Assign To
                </label>
                <div className="relative">
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* JIRA Integration */}
          {hasJiraIntegration && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Link className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">JIRA Integration</h3>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* JIRA Project Selection */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      JIRA Project
                    </label>
                    <select
                      value={selectedJiraProject}
                      onChange={(e) => setSelectedJiraProject(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      JIRA Ticket Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="existing"
                          checked={jiraTicketType === 'existing'}
                          onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Link Existing Ticket</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="new"
                          checked={jiraTicketType === 'new'}
                          onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Create New Ticket</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* JIRA Ticket Search/Creation */}
                {selectedJiraProject && (
                  <div className="space-y-4">
                    {jiraTicketType === 'existing' ? (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Search JIRA Tickets
                        </label>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={jiraSearchQuery}
                            onChange={(e) => setJiraSearchQuery(e.target.value)}
                            placeholder="Search tickets..."
                            className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={searchJiraTickets}
                            disabled={!jiraSearchQuery.trim() || jiraSearching}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                          >
                            {jiraSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </button>
                        </div>
                        
                        {/* JIRA Search Results */}
                        {showJiraSearch && (
                          <div className="mt-3 max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700">
                            {jiraSearchResults.length === 0 ? (
                              <p className="p-4 text-sm text-neutral-500">No tickets found</p>
                            ) : (
                              jiraSearchResults.map((ticket) => (
                                <button
                                  key={ticket.key}
                                  type="button"
                                  onClick={() => selectJiraTicket(ticket)}
                                  className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-600 border-b border-neutral-200 dark:border-neutral-600 last:border-b-0 transition-colors"
                                >
                                  <div className="font-medium text-sm text-neutral-900 dark:text-white">{ticket.key}</div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{ticket.fields.summary}</div>
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
                          className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                        >
                          {isCreatingTicket ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Creating JIRA Ticket...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Create JIRA Ticket</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked JIRA Ticket Display */}
                {(formData.jira_ticket_key || formData.jira_ticket_id) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <label className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Linked JIRA Ticket
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {formData.jira_ticket_key || formData.jira_ticket_id}
                        </span>
                        {ticketCreated && (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
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
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
          <div className="flex justify-end space-x-4 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
