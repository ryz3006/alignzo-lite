// =====================================================
// MODERN EDIT TASK MODAL
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings, MessageSquare, Edit3, Save, X } from 'lucide-react';
import { UpdateTaskForm, KanbanTaskWithDetails, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskComment, TaskCategorySelection } from '@/lib/kanban-types';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';
import ModernModal from './ModernModal';

interface ModernEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, updates: UpdateTaskForm) => void;
  task: KanbanTaskWithDetails;
  projectData: ProjectWithCategories;
  userEmail: string;
  teamId?: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
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

export default function ModernEditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  projectData,
  userEmail,
  teamId
}: ModernEditTaskModalProps) {
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

  // Add state for multiple category selections
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<keyof UpdateTaskForm, string | undefined>>({} as Record<keyof UpdateTaskForm, string | undefined>);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [localCategories, setLocalCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && task) {
      // Initialize form data from task
      const initialFormData: UpdateTaskForm = {
        title: task.title || '',
        description: task.description || '',
        category_id: task.category_id || '',
        category_option_id: task.category_option_id || '',
        column_id: task.column_id || '',
        priority: task.priority || 'medium',
        status: task.status || 'active',
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        jira_ticket_key: task.jira_ticket_key || '',
        assigned_to: task.assigned_to || ''
      };

      setFormData(initialFormData);
      setErrors({} as Record<keyof UpdateTaskForm, string | undefined>);
      
      // Initialize category selections from task categories
      if (task.categories && task.categories.length > 0) {
        const selections: Record<string, string> = {};
        task.categories.forEach(cat => {
          if (cat.category_option_id) {
            selections[cat.category_id] = cat.category_option_id;
          }
        });
        setCategorySelections(selections);
      }

      loadTeamMembers();
      loadCategories();
      loadTaskCategories();

      // JIRA integration
      checkJiraIntegration();
      loadJiraProjectMappings();
      setJiraTicketType('existing');
      setShowJiraSearch(false);
      setJiraSearchQuery('');
      setJiraSearchResults([]);
      setTicketCreated(false);
    }
  }, [isOpen, task, teamId]);

  // Reload JIRA mappings if project changes while open
  useEffect(() => {
    if (isOpen) {
      loadJiraProjectMappings();
    }
  }, [isOpen, projectData?.id]);

  // Load task-specific categories from mapping API to ensure preselection
  const loadTaskCategories = async () => {
    if (!task?.id) return;

    try {
      const response = await fetch(`/api/kanban/task-categories?taskId=${task.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.categories)) {
          const selections: Record<string, string> = {};
          data.categories.forEach((c: any) => {
            if (c.category_id && c.category_option_id) {
              selections[c.category_id] = c.category_option_id;
            }
          });
          if (Object.keys(selections).length > 0) {
            setCategorySelections(selections);
          }
        }
      }
    } catch (err) {
      // silent fail - fall back to task.categories if present
    }
  };

  const loadTeamMembers = async () => {
    if (!teamId) return;
    
    setIsLoadingTeamMembers(true);
    try {
      const response = await fetch(`/api/teams/team-members?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        const apiMembers: TeamMember[] = (data.teamMembers || []).filter((m: any) => m && m.email);

        // Ensure current user is included as a fallback option
        const currentUser = await getCurrentUser();
        const selfMember: TeamMember | null = currentUser?.email
          ? {
              id: 'self',
              email: currentUser.email,
              full_name: currentUser.email,
            }
          : null;

        const withSelf = selfMember && !apiMembers.some((m) => m.email === selfMember.email)
          ? [selfMember, ...apiMembers]
          : apiMembers;

        setTeamMembers(withSelf);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const loadCategories = async () => {
    if (!projectData?.id) return;
    
    setIsLoadingCategories(true);
    try {
      const response = await fetch(`/api/categories/project-options?projectId=${projectData.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.categories && data.categories.length > 0) {
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
          
          setLocalCategories(categoriesWithOptions);
        } else {
          setLocalCategories([]);
        }
      } else {
        console.error('API failed to load categories');
        setLocalCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories for project:', error);
      setLocalCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // JIRA: Check user integration
  const checkJiraIntegration = useCallback(async () => {
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
  }, []);

  // JIRA: Load project mappings for selected dashboard project
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
      if (response.data && response.data.length > 0) {
        setSelectedJiraProject(response.data[0].jira_project_key);
      } else {
        setSelectedJiraProject('');
      }
    } catch (error) {
      console.error('Error loading Jira project mappings:', error);
    }
  }, [projectData?.id]);

  // JIRA: Search tickets
  const searchJiraTickets = async () => {
    if (!jiraSearchQuery.trim() || !selectedJiraProject) return;
    setJiraSearching(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await fetch('/api/jira/search-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if ((data.tickets || []).length === 0) {
          toast('No tickets found matching your search', { icon: '🔍' });
        } else {
          toast.success(`Found ${data.tickets.length} tickets`);
        }
      } else {
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
        setJiraSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setJiraSearching(false);
    }
  };

  // JIRA: Create ticket
  const createJiraTicket = async () => {
    if (!selectedJiraProject || !formData.title?.trim()) {
      toast.error('Select a JIRA project and enter task title');
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
        if (formData.estimated_hours) description += `- Estimated Hours: ${formData.estimated_hours}\n`;
        if (formData.due_date) description += `- Due Date: ${new Date(formData.due_date).toLocaleDateString()}\n`;
      }

      const response = await fetch('/api/jira/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setFormData(prev => ({ ...prev, jira_ticket_key: ticketKey }));
        setTicketCreated(true);
        toast.success(data.message || `JIRA ticket ${ticketKey} created`);
      } else {
        const errorMessage = data.error || 'Failed to create JIRA ticket';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating JIRA ticket:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const selectJiraTicket = (ticket: JiraTicket) => {
    setFormData(prev => ({ ...prev, jira_ticket_key: ticket.key }));
    setShowJiraSearch(false);
    setJiraSearchQuery('');
  };

  // Update formData.category_id and category_option_id when categorySelections change
  useEffect(() => {
    const categoryIds = Object.keys(categorySelections);
    if (categoryIds.length > 0) {
      const primaryCategoryId = categoryIds[0];
      const primaryCategoryOptionId = categorySelections[primaryCategoryId];
      
      setFormData(prev => ({
        ...prev,
        category_id: primaryCategoryId,
        category_option_id: primaryCategoryOptionId
      }));
    }
  }, [categorySelections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<keyof UpdateTaskForm, string | undefined> = {} as Record<keyof UpdateTaskForm, string | undefined>;
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    // Require all categories selected
    const availableCategoryIds = localCategories.map(cat => cat.id);
    const selectedCategoryIds = Object.keys(categorySelections).filter(catId => 
      categorySelections[catId] && categorySelections[catId].trim() !== ''
    );
    if (selectedCategoryIds.length !== availableCategoryIds.length) {
      newErrors.category_id = 'All categories are mandatory and must be selected';
    }
    if (!formData.column_id) {
      newErrors.column_id = 'Column is required';
    }

    if (Object.values(newErrors).some(error => error)) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Persist multi-category mappings first
      if (availableCategoryIds.length > 0) {
        const categoriesToSave: TaskCategorySelection[] = availableCategoryIds.map((categoryId, index) => ({
          category_id: categoryId,
          category_option_id: categorySelections[categoryId],
          is_primary: false,
          sort_order: index
        }));

        const categoriesResponse = await fetch('/api/kanban/task-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            categories: categoriesToSave,
            userEmail: userEmail
          })
        });

        if (!categoriesResponse.ok) {
          console.warn('Failed to update task categories before saving task');
        }
      }

      await onSubmit(task.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateTaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors ${
              errors.title 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:border-blue-500'
            } focus:outline-none`}
            placeholder="Enter task title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            placeholder="Enter task description..."
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Categories * (All Required)
          </label>
          <div className="space-y-4">
            {isLoadingCategories ? (
              <div className="flex items-center space-x-3 text-slate-500 p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : localCategories.length === 0 ? (
              <div className="text-slate-500 p-3 border border-slate-200 dark:border-slate-600 rounded-lg">No categories available for this project</div>
            ) : (
              localCategories.map((category) => (
                <div key={category.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {category.name} *
                  </label>
                  <select
                    value={categorySelections[category.id] || ''}
                    onChange={(e) => setCategorySelections(prev => ({
                      ...prev,
                      [category.id]: e.target.value
                    }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none"
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
          )}
        </div>

        {/* Column and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Column *
            </label>
            <select
              value={formData.column_id}
              onChange={(e) => handleInputChange('column_id', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors ${
                errors.column_id 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:outline-none`}
            >
              <option value="">Select column</option>
              {projectData?.columns?.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
            {errors.column_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.column_id}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Priority and Scope Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assign To
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => handleInputChange('assigned_to', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              disabled={isLoadingTeamMembers}
            >
              <option value="">Unassigned</option>
              {isLoadingTeamMembers ? (
                <option value="" disabled>Loading team members...</option>
              ) : (
                <>
                  {formData.assigned_to && !teamMembers.some(m => m.email === formData.assigned_to) && (
                    <option value={formData.assigned_to}>
                      {formData.assigned_to} (current)
                    </option>
                  )}
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Estimated Hours, Actual Hours, and Due Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estimated Hours
            </label>
            <input
              type="number"
              value={formData.estimated_hours || ''}
              onChange={(e) => handleInputChange('estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.5"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              placeholder="0.0"
            />
          </div>

          {/* Actual Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Actual Hours
            </label>
            <input
              type="number"
              value={formData.actual_hours || ''}
              onChange={(e) => handleInputChange('actual_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.5"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              placeholder="0.0"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* JIRA Integration */}
        {hasJiraIntegration && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Link className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">JIRA Integration</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">JIRA Project</label>
              <select
                value={selectedJiraProject}
                onChange={(e) => setSelectedJiraProject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
              >
                <option value="">Select JIRA project</option>
                {jiraProjectMappings.map(mapping => (
                  <option key={mapping.id} value={mapping.jira_project_key}>
                    {mapping.jira_project_name || mapping.jira_project_key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ticket Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input type="radio" value="existing" checked={jiraTicketType === 'existing'} onChange={() => setJiraTicketType('existing')} />
                  <span className="text-sm">Link Existing</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" value="new" checked={jiraTicketType === 'new'} onChange={() => setJiraTicketType('new')} />
                  <span className="text-sm">Create New</span>
                </label>
              </div>
            </div>

            {jiraTicketType === 'existing' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Search Ticket</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={jiraSearchQuery}
                    onChange={(e) => setJiraSearchQuery(e.target.value)}
                    placeholder="Search JIRA tickets..."
                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={searchJiraTickets}
                    disabled={jiraSearching || !jiraSearchQuery.trim() || !selectedJiraProject}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {jiraSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                {showJiraSearch && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">
                    {jiraSearchResults.length === 0 ? (
                      <div className="p-3 text-sm text-neutral-500">No tickets found</div>
                    ) : (
                      jiraSearchResults.map(ticket => (
                        <button
                          key={ticket.key}
                          type="button"
                          onClick={() => selectJiraTicket(ticket)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-600 border-b border-neutral-200 dark:border-neutral-600 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{ticket.key}</div>
                          <div className="text-xs text-neutral-500 truncate">{ticket.fields?.summary || 'No summary available'}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ticket Summary</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    disabled
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-600 text-neutral-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={createJiraTicket}
                  disabled={isCreatingTicket || !selectedJiraProject || !formData.title?.trim()}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isCreatingTicket ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Creating Ticket...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 inline mr-2" />
                      Create JIRA Ticket
                    </>
                  )}
                </button>
              </div>
            )}

            {(formData.jira_ticket_key) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {formData.jira_ticket_key}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, jira_ticket_key: '' }))}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {ticketCreated && (
                  <div className="mt-2 text-xs text-green-700 dark:text-green-300 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" /> Created
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Update Task</span>
              </>
            )}
          </button>
        </div>
      </form>
    </ModernModal>
  );
}
