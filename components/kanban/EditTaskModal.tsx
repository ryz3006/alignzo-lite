'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings, MessageSquare } from 'lucide-react';
import { UpdateTaskForm, KanbanTaskWithDetails, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskComment } from '@/lib/kanban-types';
import { supabaseClient } from '@/lib/supabase-client';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, updates: UpdateTaskForm) => void;
  task: KanbanTaskWithDetails;
  projectData: ProjectWithCategories | null;
  userEmail?: string | null;
}

interface JiraProjectMapping {
  id: string;
  project_key: string;
  project_name: string;
  jira_project_key: string;
  jira_project_name: string;
}

interface JiraTicket {
  key: string;
  summary: string;
  status: {
    name: string;
  };
  priority?: {
    name: string;
  };
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  projectData,
  userEmail
}: EditTaskModalProps) {
  const [formData, setFormData] = useState<UpdateTaskForm>({
    title: task.title,
    description: task.description || '',
    category_id: task.category_id,
    category_option_id: task.category_option_id || '',
    column_id: task.column_id,
    priority: task.priority,
    estimated_hours: task.estimated_hours || undefined,
    actual_hours: task.actual_hours || undefined,
    due_date: task.due_date || '',
    jira_ticket_id: task.jira_ticket_id || '',
    jira_ticket_key: task.jira_ticket_key || '',
    assigned_to: task.assigned_to || '',
    status: task.status
  });

  const [errors, setErrors] = useState<Record<keyof UpdateTaskForm, string | undefined>>({} as Record<keyof UpdateTaskForm, string | undefined>);
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

  // Comments states
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');

  // Initialize form data and load initial data when modal opens
  useEffect(() => {
    if (isOpen && task && projectData) {
      // Set form data first
      setFormData({
        title: task.title,
        description: task.description || '',
        category_id: task.category_id,
        category_option_id: task.category_option_id || '',
        column_id: task.column_id,
        priority: task.priority,
        estimated_hours: task.estimated_hours || undefined,
        actual_hours: task.actual_hours || undefined,
        due_date: task.due_date || '',
        jira_ticket_id: task.jira_ticket_id || '',
        jira_ticket_key: task.jira_ticket_key || '',
        assigned_to: task.assigned_to || '',
        status: task.status
      });
      
      // Then load additional data
      loadInitialData();
    }
  }, [isOpen, task, projectData]);

  const loadInitialData = async () => {
    if (!projectData) return;
    
    setLocalCategories(projectData.categories);
    await loadTeamMembers();
    await checkJiraIntegration();
    await loadComments();
  };

  const loadTeamMembers = async () => {
    if (!projectData?.id) return;
    
    setIsLoadingTeamMembers(true);
    try {
      const response = await supabaseClient.get('team_members', {
        select: 'id,user_email,users!inner(id,email,full_name,avatar_url)',
        filters: {
          project_id: projectData.id,
          status: 'active'
        }
      });

      if (response.error) throw new Error(response.error);
      
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const checkJiraIntegration = async () => {
    if (!projectData?.id) return;
    
    try {
      const response = await supabaseClient.get('jira_project_mappings', {
        filters: {
          project_id: projectData.id,
          is_active: true
        }
      });

      if (response.error) throw new Error(response.error);
      
      if (response.data && response.data.length > 0) {
        setHasJiraIntegration(true);
        setJiraProjectMappings(response.data);
        setSelectedJiraProject(response.data[0].id);
      }
    } catch (error) {
      console.error('Error checking JIRA integration:', error);
    }
  };

  const searchJiraTickets = async () => {
    if (!jiraSearchQuery.trim() || !selectedJiraProject) {
      toast.error('Please enter a search term and select a JIRA project');
      return;
    }

    setJiraSearching(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await fetch('/api/jira/search-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: jiraSearchQuery,
          projectMappingId: selectedJiraProject,
          userEmail: currentUser.email
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJiraSearchResults(data.tickets || []);
        
        if (data.tickets.length === 0) {
          toast('No tickets found matching your search term', { icon: '🔍' });
        } else {
          toast.success(`Found ${data.tickets.length} tickets`);
        }
      } else {
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
        
        if (data.details) {
          console.error('JIRA search error details:', data.details);
        }
        
        if (data.rateLimitInfo) {
          console.log('Rate limit info:', data.rateLimitInfo);
        }
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setJiraSearching(false);
    }
  };

  const createJiraTicket = async () => {
    if (!selectedJiraProject || !formData.title?.trim()) {
      toast.error('Please select a JIRA project and enter task title');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      let description = formData.description || '';
      
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
          projectMappingId: selectedJiraProject,
          summary: formData.title,
          description: description,
          priority: formData.priority,
          userEmail: currentUser.email
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          jira_ticket_id: data.ticket.id,
          jira_ticket_key: data.ticket.key
        }));
        setTicketCreated(true);
        toast.success(`JIRA ticket ${data.ticket.key} created successfully!`);
      } else {
        toast.error(data.error || 'Failed to create JIRA ticket');
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
    toast.success(`Linked to JIRA ticket ${ticket.key}`);
  };

  const loadComments = async () => {
    if (!task?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/kanban/task-comments?taskId=${task.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComments(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.id || !userEmail) return;

    setSubmittingComment(true);
    try {
      const response = await fetch('/api/kanban/task-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          comment: newComment.trim(),
          userEmail: userEmail
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNewComment('');
          toast.success('Comment added successfully');
          await loadComments(); // Refresh comments
        } else {
          toast.error(data.error || 'Failed to add comment');
        }
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<keyof UpdateTaskForm, string | undefined> = {} as Record<keyof UpdateTaskForm, string | undefined>;

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.column_id) {
      newErrors.column_id = 'Column is required';
    }

    if (formData.estimated_hours && formData.estimated_hours <= 0) {
      newErrors.estimated_hours = 'Estimated hours must be greater than 0';
    }

    if (formData.actual_hours && formData.actual_hours <= 0) {
      newErrors.actual_hours = 'Actual hours must be greater than 0';
    }

    if (formData.due_date && new Date(formData.due_date) < new Date()) {
      newErrors.due_date = 'Due date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      onSubmit(task.id, formData);
    }
  };

  const handleInputChange = (field: keyof UpdateTaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Edit Task
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Update task details and settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Tabs */}
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="flex space-x-8">
              {[
                { id: 'details', label: 'Task Details' },
                { id: 'comments', label: 'Comments' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'details' | 'comments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {activeTab === 'details' && (
            <>
              {/* Basic Information */}
              <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Basic Information
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.title 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="Enter task title"
                />
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Assign To
                </label>
                <select
                  value={formData.assigned_to || ''}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.user_email}>
                      {member.users.full_name} ({member.user_email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                placeholder="Enter task description"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Categories
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.category_id 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                >
                  <option value="">Select Category</option>
                  {localCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.category_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Category Option
                </label>
                <select
                  value={formData.category_option_id || ''}
                  onChange={(e) => handleInputChange('category_option_id', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  disabled={!formData.category_id}
                >
                  <option value="">Select Category Option</option>
                  {(localCategories.find(cat => cat.id === formData.category_id)?.options || []).map(option => (
                    <option key={option.id} value={option.id}>
                      {option.option_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Task Details
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Column *
                </label>
                <select
                  value={formData.column_id || ''}
                  onChange={(e) => handleInputChange('column_id', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.column_id 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                >
                  <option value="">Select Column</option>
                  {projectData?.columns.map(column => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
                {errors.column_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.column_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority || 'medium'}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.estimated_hours 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="0.0"
                />
                {errors.estimated_hours && (
                  <p className="mt-2 text-sm text-red-600">{errors.estimated_hours}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Actual Hours
                </label>
                <input
                  type="number"
                  value={formData.actual_hours || ''}
                  onChange={(e) => handleInputChange('actual_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min="0"
                  step="0.5"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.actual_hours 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="0.0"
                />
                {errors.actual_hours && (
                  <p className="mt-2 text-sm text-red-600">{errors.actual_hours}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date || ''}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.due_date 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                />
                {errors.due_date && (
                  <p className="mt-2 text-sm text-red-600">{errors.due_date}</p>
                )}
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
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  JIRA Integration
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      JIRA Project
                    </label>
                    <select
                      value={selectedJiraProject}
                      onChange={(e) => setSelectedJiraProject(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      {jiraProjectMappings.map(mapping => (
                        <option key={mapping.id} value={mapping.id}>
                          {mapping.jira_project_name} ({mapping.jira_project_key})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Ticket Type
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
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Link Existing</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="new"
                          checked={jiraTicketType === 'new'}
                          onChange={(e) => setJiraTicketType(e.target.value as 'new' | 'existing')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Create New</span>
                      </label>
                    </div>
                  </div>
                </div>

                {jiraTicketType === 'existing' ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={formData.jira_ticket_key || ''}
                        onChange={(e) => handleInputChange('jira_ticket_key', e.target.value)}
                        className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        placeholder="e.g., PROJ-123"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJiraSearch(!showJiraSearch)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                      </button>
                    </div>

                    {showJiraSearch && (
                      <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-700">
                        <div className="flex space-x-3 mb-4">
                          <input
                            type="text"
                            value={jiraSearchQuery}
                            onChange={(e) => setJiraSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                            placeholder="Search JIRA tickets..."
                          />
                          <button
                            type="button"
                            onClick={searchJiraTickets}
                            disabled={jiraSearching}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                          >
                            {jiraSearching ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Searching...</span>
                              </>
                            ) : (
                              <>
                                <Search className="h-4 w-4" />
                                <span>Search</span>
                              </>
                            )}
                          </button>
                        </div>

                        {jiraSearchResults.length > 0 && (
                          <div className="space-y-3">
                            {jiraSearchResults.map((ticket, index) => (
                              <div
                                key={index}
                                onClick={() => selectJiraTicket(ticket)}
                                className="p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-500 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {ticket.key}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor((ticket.priority?.name || 'medium').toLowerCase())}`}>
                                    {ticket.priority?.name || 'Medium'}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
                                  {ticket.summary}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Status: {ticket.status.name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-700">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        A new JIRA ticket will be created with the task details.
                      </p>
                      <button
                        type="button"
                        onClick={createJiraTicket}
                        disabled={isCreatingTicket}
                        className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isCreatingTicket ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>Create JIRA Ticket</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {formData.jira_ticket_key && (
                  <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        Linked to JIRA ticket: {formData.jira_ticket_key}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {ticketCreated ? 'New ticket created' : 'Existing ticket linked'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Task</span>
              )}
            </button>
          </div>
            </>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Comments</h3>
              
              {/* Add Comment */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-700/50">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {submittingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        <span>Add Comment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-400" />
                  <p className="text-neutral-600 dark:text-neutral-400">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 bg-white dark:bg-neutral-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-neutral-400" />
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {comment.user_email}
                          </span>
                        </div>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-600 rounded-lg p-3">
                        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No comments yet</p>
                  <p className="text-sm">Be the first to add a comment to this task.</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
