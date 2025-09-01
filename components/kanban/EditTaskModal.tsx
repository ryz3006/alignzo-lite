'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings, MessageSquare } from 'lucide-react';
import { UpdateTaskForm, KanbanTaskWithDetails, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskComment, TaskCategorySelection } from '@/lib/kanban-types';
import { supabaseClient } from '@/lib/supabase-client';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, updates: UpdateTaskForm) => void;
  task: KanbanTaskWithDetails;
  projectData: ProjectWithCategories;
  userEmail: string;
  teamId?: string;
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
  fields: {
    summary: string;
    description?: string;
  };
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  projectData,
  userEmail,
  teamId
}: EditTaskModalProps) {
  const [formData, setFormData] = useState<UpdateTaskForm>({
    title: '',
    description: '',
    category_id: '',
    category_option_id: '',
    column_id: '',
    priority: 'medium',
    status: 'active',
    estimated_hours: undefined,
    actual_hours: undefined,
    due_date: '',
    jira_ticket_key: '',
    assigned_to: ''
  });

  // Store original form data for change detection
  const [originalFormData, setOriginalFormData] = useState<UpdateTaskForm>({
    title: '',
    description: '',
    category_id: '',
    category_option_id: '',
    column_id: '',
    priority: 'medium',
    status: 'active',
    estimated_hours: undefined,
    actual_hours: undefined,
    due_date: '',
    jira_ticket_key: '',
    assigned_to: ''
  });

  // Store original categories for change detection
  const [originalCategories, setOriginalCategories] = useState<TaskCategorySelection[]>([]);

  const [errors, setErrors] = useState<Record<keyof UpdateTaskForm, string | undefined>>({} as Record<keyof UpdateTaskForm, string | undefined>);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  
  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // JIRA integration state
  const [hasJiraIntegration, setHasJiraIntegration] = useState(false);
  const [jiraProjectMappings, setJiraProjectMappings] = useState<JiraProjectMapping[]>([]);
  const [selectedJiraProject, setSelectedJiraProject] = useState('');
  const [jiraTicketType, setJiraTicketType] = useState<'existing' | 'new'>('existing');
  const [showJiraSearch, setShowJiraSearch] = useState(false);
  const [jiraSearchQuery, setJiraSearchQuery] = useState('');
  const [jiraSearchResults, setJiraSearchResults] = useState<JiraTicket[]>([]);
  const [jiraSearching, setJiraSearching] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);

  // Categories state
  const [availableCategories, setAvailableCategories] = useState<ProjectCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<TaskCategorySelection[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Task age calculation
  const taskAgeInfo = useMemo(() => {
    if (!task?.created_at) return null;
    
    const createdDate = new Date(task.created_at);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let ageText: string;
    let ageColor: string;

    if (diffMinutes < 1) {
      ageText = 'Just now';
      ageColor = 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (diffMinutes < 60) {
      ageText = `${diffMinutes} min ago`;
      ageColor = 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (diffHours < 24) {
      ageText = `${diffHours} hr ago`;
      ageColor = diffHours < 6 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    } else if (diffDays < 7) {
      ageText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      ageColor = diffDays < 3 
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    } else {
      ageText = `${diffDays} days ago`;
      ageColor = 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }

    return { ageText, ageColor };
  }, [task?.created_at]);

  // Load categories and task-specific categories when modal opens
  useEffect(() => {
    if (isOpen && projectData?.id) {
      loadCategories();
    }
  }, [isOpen, projectData?.id]);

  // Load task categories when task changes
  useEffect(() => {
    if (isOpen && task?.id) {
      loadTaskCategories();
    }
  }, [isOpen, task?.id]);

  // Memoized function to load categories
  const loadCategories = useCallback(async () => {
    if (!projectData?.id) return;
    
    setIsLoadingCategories(true);
    try {
      // Use the simplified API endpoint to get categories with options
      const response = await fetch(`/api/categories/project-options?projectId=${projectData.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
          // Transform the data to match the expected format
          const categoriesWithOptions = data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            project_id: projectData.id,
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
          
          setAvailableCategories(categoriesWithOptions);
        } else {
          setAvailableCategories([]);
        }
      } else {
        console.error('API failed to load categories');
        toast.error('Failed to load categories. Please try again.');
        setAvailableCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories for project:', error);
      toast.error('Failed to load categories. Please try again.');
      setAvailableCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [projectData?.id]);

  // Load task-specific categories from the mapping table
  const loadTaskCategories = useCallback(async () => {
    if (!task?.id) return;
    
    try {
      const response = await fetch(`/api/kanban/task-categories?taskId=${task.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.categories) {
          // Transform to the selection format
          const categorySelections = data.categories.map((cat: any) => ({
            category_id: cat.category_id,
            category_option_id: cat.category_option_id || undefined,
            is_primary: cat.is_primary,
            sort_order: cat.sort_order
          }));
          
          setSelectedCategories(categorySelections);
          setOriginalCategories(categorySelections);
        } else {
          setSelectedCategories([]);
          setOriginalCategories([]);
        }
      } else {
        console.error('API failed to load task categories');
        setSelectedCategories([]);
        setOriginalCategories([]);
      }
    } catch (error) {
      console.error('Error loading task categories:', error);
      setSelectedCategories([]);
      setOriginalCategories([]);
    }
  }, [task?.id]);

  // Format date for datetime-local input (handle timezone properly)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      // For datetime-local inputs, we need to format as YYYY-MM-DDTHH:mm
      // The input will be interpreted in the user's local timezone
      const date = new Date(dateString);
      
      // Use toISOString and slice to get YYYY-MM-DDTHH:mm format
      // This preserves the original time but formats it for the input
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Initialize form data and load initial data when modal opens
  useEffect(() => {
    if (isOpen && task) {
      // Set form data first
      setFormData({
        title: task.title || '',
        description: task.description || '',
        category_id: task.category_id || '',
        category_option_id: task.category_option_id || '',
        column_id: task.column_id || '',
        priority: task.priority || 'medium',
        status: task.status || 'active',
        estimated_hours: task.estimated_hours || undefined,
        actual_hours: task.actual_hours || undefined,
        due_date: formatDateForInput(task.due_date),
        jira_ticket_key: task.jira_ticket_key || '',
        assigned_to: task.assigned_to || ''
      });
      setOriginalFormData({
        title: task.title || '',
        description: task.description || '',
        category_id: task.category_id || '',
        category_option_id: task.category_option_id || '',
        column_id: task.column_id || '',
        priority: task.priority || 'medium',
        status: task.status || 'active',
        estimated_hours: task.estimated_hours || undefined,
        actual_hours: task.actual_hours || undefined,
        due_date: formatDateForInput(task.due_date),
        jira_ticket_key: task.jira_ticket_key || '',
        assigned_to: task.assigned_to || ''
      });
             // Original categories will be set when loadTaskCategories is called
      setErrors({} as Record<keyof UpdateTaskForm, string | undefined>);
      
      // Then load additional data
      loadInitialData();
    }
  }, [isOpen, task?.id]); // Only depend on task.id to prevent re-initialization on other changes

  const loadInitialData = async () => {
    if (!projectData) return;

    try {
      // Load categories with options using the same API as CreateTaskModal
      // setIsLoadingCategories(true); // This is now handled by the useEffect
      const response = await fetch(`/api/categories/project-options?projectId=${projectData.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
          // Transform the data to match the expected format
          const categoriesWithOptions = data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            project_id: projectData.id,
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
          
          // setAvailableCategories(categoriesWithOptions); // This is now handled by the useEffect
        } else {
          // setAvailableCategories([]); // This is now handled by the useEffect
        }
      } else {
        console.error('API failed to load categories');
        toast.error('Failed to load categories. Please try again.');
        // setAvailableCategories([]); // This is now handled by the useEffect
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories. Please try again.');
      // setAvailableCategories([]); // This is now handled by the useEffect
    } finally {
      // setIsLoadingCategories(false); // This is now handled by the useEffect
    }

    // Load team members
    setIsLoadingTeamMembers(true);
    try {
      if (teamId) {
        // Use the API endpoint to get team members
        const response = await fetch(`/api/teams/team-members?teamId=${teamId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.teamMembers && data.teamMembers.length > 0) {
            setTeamMembers(data.teamMembers);
            
            // Ensure assigned_to is properly set if it exists in the task
            if (task.assigned_to && data.teamMembers.some((member: any) => member.email === task.assigned_to)) {
              setFormData(prev => ({ ...prev, assigned_to: task.assigned_to }));
            }
          } else {
            setTeamMembers([]);
          }
        } else {
          console.error('Failed to load team members');
          setTeamMembers([]);
        }
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setIsLoadingTeamMembers(false);
    }

    // Check JIRA integration
    try {
      const integrationResponse = await supabaseClient.get('user_integrations', {
        filters: { user_email: userEmail, integration_type: 'jira', is_verified: true }
      });
      
      if (integrationResponse.data && integrationResponse.data.length > 0) {
        setHasJiraIntegration(true);
        await loadJiraProjectMappings();
      }
    } catch (error) {
      console.error('Error checking JIRA integration:', error);
    }

    // Load comments
    await loadComments();
  };

  const loadJiraProjectMappings = async () => {
    try {
      const mappingsResponse = await supabaseClient.get('jira_project_mappings', {
        filters: { integration_user_email: userEmail }
      });
      
      if (mappingsResponse.data) {
        setJiraProjectMappings(mappingsResponse.data);
        if (mappingsResponse.data.length > 0) {
          setSelectedJiraProject(mappingsResponse.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading JIRA project mappings:', error);
    }
  };

  const loadComments = async () => {
    if (!task) return;
    
    setLoadingComments(true);
    try {
      const commentsResponse = await supabaseClient.get('task_comments', {
        filters: { task_id: task.id },
        order: { column: 'created_at', ascending: true }
      });
      
      if (commentsResponse.data) {
        setComments(commentsResponse.data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    setSubmittingComment(true);
    try {
      const response = await supabaseClient.insert('task_comments', {
        task_id: task.id,
        user_email: userEmail,
        comment: newComment.trim()
      });

      if (response.error) throw new Error(response.error);

      setNewComment('');
      toast.success('Comment added successfully');
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const searchJiraTickets = async () => {
    if (!jiraSearchQuery.trim() || !selectedJiraProject) return;

    setJiraSearching(true);
    try {
      const response = await fetch('/api/jira/search-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          projectKey: selectedJiraProject,
          searchTerm: jiraSearchQuery.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJiraSearchResults(data.tickets || []);
      } else {
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
        setJiraSearchResults([]);
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
          summary: formData.title || '',
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
    const newErrors: Record<keyof UpdateTaskForm, string | undefined> = {} as Record<keyof UpdateTaskForm, string | undefined>;

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.column_id) {
      newErrors.column_id = 'Column is required';
    }

    // Check if ALL categories have been selected (mandatory)
    const availableCategoryIds = availableCategories.map(cat => cat.id);
    const selectedCategoryIds = selectedCategories.map(sc => sc.category_id);
    
    if (selectedCategoryIds.length !== availableCategoryIds.length) {
      newErrors.category_id = 'All categories are mandatory and must be selected';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  // Check if there are any changes in the form
  const hasChanges = useMemo(() => {
    // Check form data changes
    const formDataChanged = Object.keys(formData).some(key => {
      const field = key as keyof UpdateTaskForm;
      const originalValue = originalFormData[field];
      const currentValue = formData[field];
      
      // Handle undefined/null comparisons
      if (originalValue === undefined && currentValue === undefined) return false;
      if (originalValue === null && currentValue === null) return false;
      if (originalValue === '' && currentValue === '') return false;
      
      return originalValue !== currentValue;
    });

    // Check categories changes
    const categoriesChanged = selectedCategories.length !== originalCategories.length ||
      selectedCategories.some((cat, index) => {
        const originalCat = originalCategories[index];
        if (!originalCat) return true;
        return cat.category_id !== originalCat.category_id ||
               cat.category_option_id !== originalCat.category_option_id ||
               cat.is_primary !== originalCat.is_primary ||
               cat.sort_order !== originalCat.sort_order;
      });

    return formDataChanged || categoriesChanged;
  }, [formData, originalFormData, selectedCategories, originalCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasChanges) {
      toast('No changes detected. Task remains unchanged.');
      onClose();
      return;
    }
    
    if (validateForm()) {
      setIsLoading(true);
      
      try {
        // Update task categories first
        if (selectedCategories.length > 0) {
          const categoriesResponse = await fetch('/api/kanban/task-categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: task.id,
              categories: selectedCategories,
              userEmail: userEmail
            }),
          });

          if (!categoriesResponse.ok) {
            throw new Error('Failed to update task categories');
          }
        }
        
        // Call the onSubmit callback with the form data
        await onSubmit(task.id, formData);
        
        // Close the modal on success
        onClose();
        
        // Show success message
        toast.success('Task updated successfully!');
        
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Failed to update task. Please try again.');
      } finally {
        setIsLoading(false);
      }
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
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Task</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Update task details and settings
              </p>
              {/* Change indicator */}
              {hasChanges && (
                <div className="flex items-center space-x-2 mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Changes detected
                  </span>
                </div>
              )}
            </div>
            
            {/* Task Age Badge */}
            {taskAgeInfo && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Created:</span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${taskAgeInfo.ageColor}`}>
                  {taskAgeInfo.ageText}
                </span>
              </div>
            )}
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
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
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
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
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
                      Project
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
                      value={formData.column_id || ''}
                      onChange={(e) => handleInputChange('column_id', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.column_id ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
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
                      <div className="space-y-4">
                        {availableCategories.map((category) => {
                          const selectedCategory = selectedCategories.find(sc => sc.category_id === category.id);
                          
                          return (
                            <div key={category.id} className="border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-700/50">
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                {category.name} *
                              </label>
                              <select
                                value={selectedCategory?.category_option_id || ''}
                                onChange={(e) => {
                                  const optionId = e.target.value || undefined;
                                  setSelectedCategories(prev => {
                                    const existing = prev.find(sc => sc.category_id === category.id);
                                    if (existing) {
                                      // Update existing selection
                                      return prev.map(sc => 
                                        sc.category_id === category.id 
                                          ? { ...sc, category_option_id: optionId }
                                          : sc
                                      );
                                    } else {
                                      // Add new selection
                                      return [
                                        ...prev,
                                        {
                                          category_id: category.id,
                                          category_option_id: optionId,
                                          is_primary: false, // No primary concept
                                          sort_order: prev.length
                                        }
                                      ];
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {errors.category_id && (
                    <p className="mt-2 text-sm text-red-600">{errors.category_id}</p>
                  )}
                </div>
              </div>

              {/* Task Settings */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Task Settings</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Priority */}
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

                  {/* Status */}
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

                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Assigned To
                    </label>
                    <div className="relative">
                      <select
                        value={formData.assigned_to || ''}
                        onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        disabled={isLoadingTeamMembers}
                      >
                        <option value="">Unassigned</option>
                        {isLoadingTeamMembers ? (
                          <option value="" disabled>Loading team members...</option>
                        ) : teamMembers.length === 0 ? (
                          <option value="" disabled>No team members found</option>
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Estimated Hours */}
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
                        errors.estimated_hours ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
                      } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                      placeholder="0.0"
                    />
                    {errors.estimated_hours && (
                      <p className="mt-2 text-sm text-red-600">{errors.estimated_hours}</p>
                    )}
                  </div>

                  {/* Actual Hours */}
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
                        errors.actual_hours ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
                      } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                      placeholder="0.0"
                    />
                    {errors.actual_hours && (
                      <p className="mt-2 text-sm text-red-600">{errors.actual_hours}</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.due_date || ''}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.due_date ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-600'
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
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">JIRA Integration</h3>
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
                                placeholder="Search JIRA tickets..."
                                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={searchJiraTickets}
                                disabled={jiraSearching || !jiraSearchQuery.trim() || !selectedJiraProject}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {jiraSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                              </button>
                            </div>

                            {jiraSearchResults.length > 0 && (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {jiraSearchResults.map((ticket) => (
                                  <div
                                    key={ticket.key}
                                    onClick={() => selectJiraTicket(ticket)}
                                    className="p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer"
                                  >
                                    <div className="font-medium text-sm">{ticket.key}</div>
                                    <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{ticket.fields.summary}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Ticket Summary
                          </label>
                          <input
                            type="text"
                            value={formData.title || ''}
                            disabled
                            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={createJiraTicket}
                          disabled={isCreatingTicket || !selectedJiraProject || !formData.title?.trim()}
                          className="w-full px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          {isCreatingTicket ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Creating Ticket...</span>
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
                </div>
              )}
            </>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Comments</h3>
              </div>

              {/* Add Comment */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Add Comment
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="Add a comment to this task..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
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

              {/* Comments List */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-neutral-900 dark:text-white">Recent Comments</h4>
                {loadingComments ? (
                  <div className="flex items-center space-x-3 text-neutral-500 p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-neutral-500 p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl">No comments yet</div>
                ) : (
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {comment.user_email}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : !hasChanges ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>No Changes</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Update Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
