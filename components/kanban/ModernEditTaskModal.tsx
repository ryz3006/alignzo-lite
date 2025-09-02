// =====================================================
// MODERN EDIT TASK MODAL
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings, MessageSquare, Edit3, Save, X } from 'lucide-react';
import { UpdateTaskForm, KanbanTaskWithDetails, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskComment, TaskCategorySelection } from '@/lib/kanban-types';
import { getCurrentUser } from '@/lib/auth';
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
  user_id: string;
  users: {
    full_name: string;
    email: string;
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
    }
  }, [isOpen, task, teamId]);

  const loadTeamMembers = async () => {
    if (!teamId) return;
    
    setIsLoadingTeamMembers(true);
    try {
      const response = await fetch(`/api/teams/team-members?teamId=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        const apiMembers: TeamMember[] = (data.teamMembers || []).filter((m: any) => m && m.users && m.users.email);

        // Ensure current user is included as a fallback option
        const currentUser = await getCurrentUser();
        const selfMember: TeamMember | null = currentUser?.email
          ? {
              id: 'self',
              user_id: 'self',
              users: {
                full_name: currentUser.email,
                email: currentUser.email,
              },
            }
          : null;

        const withSelf = selfMember && !apiMembers.some((m) => m.users.email === selfMember.users.email)
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
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
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
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm transition-all duration-200 ${
              errors.title 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400' 
                : 'border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400'
            } focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20`}
            placeholder="Enter task title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            placeholder="Enter task description..."
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Categories * (All Required)
          </label>
          <div className="space-y-4">
            {isLoadingCategories ? (
              <div className="flex items-center space-x-3 text-slate-500 p-4 border border-slate-200 dark:border-slate-600 rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : localCategories.length === 0 ? (
              <div className="text-slate-500 p-4 border border-slate-200 dark:border-slate-600 rounded-xl">No categories available for this project</div>
            ) : (
              localCategories.map((category) => (
                <div key={category.id} className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 bg-slate-50 dark:bg-slate-700/50">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {category.name} *
                  </label>
                  <select
                    value={categorySelections[category.id] || ''}
                    onChange={(e) => setCategorySelections(prev => ({
                      ...prev,
                      [category.id]: e.target.value
                    }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Column *
            </label>
            <select
              value={formData.column_id}
              onChange={(e) => handleInputChange('column_id', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm transition-all duration-200 ${
                errors.column_id 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20`}
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assign To
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => handleInputChange('assigned_to', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
              disabled={isLoadingTeamMembers}
            >
              <option value="">Unassigned</option>
              {isLoadingTeamMembers ? (
                <option value="" disabled>Loading team members...</option>
              ) : (
                teamMembers.map((member) => (
                  <option key={member.id} value={member.users.email}>
                    {member.users.full_name || member.users.email}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Estimated Hours, Actual Hours, and Due Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Estimated Hours
            </label>
            <input
              type="number"
              value={formData.estimated_hours || ''}
              onChange={(e) => handleInputChange('estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.5"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
              placeholder="0.0"
            />
          </div>

          {/* Actual Hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Actual Hours
            </label>
            <input
              type="number"
              value={formData.actual_hours || ''}
              onChange={(e) => handleInputChange('actual_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.5"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
              placeholder="0.0"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* JIRA Ticket */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            JIRA Ticket Key
          </label>
          <input
            type="text"
            value={formData.jira_ticket_key}
            onChange={(e) => handleInputChange('jira_ticket_key', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            placeholder="e.g., PROJ-123"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
