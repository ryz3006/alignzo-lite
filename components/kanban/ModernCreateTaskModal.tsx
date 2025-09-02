// =====================================================
// MODERN CREATE TASK MODAL
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings, X } from 'lucide-react';
import { CreateTaskForm, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskCategorySelection } from '@/lib/kanban-types';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';
import ModernModal from './ModernModal';

interface ModernCreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: CreateTaskForm) => void;
  projectData: ProjectWithCategories | null;
  userEmail: string | null;
  selectedTeam: string;
  columnId?: string;
}

export default function ModernCreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  projectData,
  userEmail,
  selectedTeam,
  columnId
}: ModernCreateTaskModalProps) {
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

  const [errors, setErrors] = useState<Record<keyof CreateTaskForm, string | undefined>>({} as Record<keyof CreateTaskForm, string | undefined>);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [localCategories, setLocalCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});

  // JIRA Integration states (modeled after EnhancedTimerModal / legacy CreateTaskModal)
  const [hasJiraIntegration, setHasJiraIntegration] = useState(false);
  const [jiraProjectMappings, setJiraProjectMappings] = useState<any[]>([]);
  const [selectedJiraProject, setSelectedJiraProject] = useState<string>('');
  const [jiraTicketType, setJiraTicketType] = useState<'new' | 'existing'>('existing');
  const [showJiraSearch, setShowJiraSearch] = useState(false);
  const [jiraSearchQuery, setJiraSearchQuery] = useState('');
  const [jiraSearchResults, setJiraSearchResults] = useState<any[]>([]);
  const [jiraSearching, setJiraSearching] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        project_id: projectData?.id || '',
        category_id: '',
        category_option_id: '',
        column_id: columnId || '',
        priority: 'medium',
        estimated_hours: undefined,
        due_date: '',
        jira_ticket_id: '',
        jira_ticket_key: '',
        scope: 'project',
        assigned_to: ''
      });
      setErrors({} as Record<keyof CreateTaskForm, string | undefined>);
      loadTeamMembers();
      loadCategories();

      // Check JIRA integration and mappings
      checkJiraIntegration();
      loadJiraProjectMappings();

      setJiraTicketType('existing');
      setShowJiraSearch(false);
      setJiraSearchQuery('');
      setJiraSearchResults([]);
      setTicketCreated(false);
    }
  }, [isOpen, projectData, columnId]);

  // Reload JIRA mappings if project changes
  useEffect(() => {
    if (isOpen) {
      loadJiraProjectMappings();
    }
  }, [isOpen, projectData?.id]);

  const loadTeamMembers = async () => {
    if (!selectedTeam) return;
    
    try {
      const response = await fetch(`/api/teams/team-members?teamId=${selectedTeam}`);
      if (response.ok) {
        const data = await response.json();
        const apiMembers = (data.teamMembers || []).filter((m: any) => m && (m.email || (m.users && m.users.email)));
        const normalized = apiMembers.map((m: any) => ({
          id: m.id || m.user_id || m.email,
          email: m.email || m.users?.email,
          full_name: m.full_name || m.users?.full_name || undefined,
        }));
        const currentUser = await getCurrentUser();
        const self = currentUser?.email
          ? { id: 'self', email: currentUser.email, full_name: currentUser.email }
          : null;
        const list = self && !normalized.some((n: any) => n.email === self.email)
          ? [self, ...normalized]
          : normalized;
        setTeamMembers(list);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  };

  const loadCategories = async () => {
    if (!projectData?.id) return;
    
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
    }
  };

  // JIRA: Check if user has integration
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

  // JIRA: Load project mappings for the selected dashboard project
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
        // Default to first mapping
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
        if (data.tickets.length === 0) {
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
    if (!selectedJiraProject || !formData.title.trim()) {
      toast.error('Select a JIRA project and enter task title');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Compose description from task details
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
        setFormData(prev => ({ ...prev, jira_ticket_id: ticketKey, jira_ticket_key: ticketKey }));
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

  const selectJiraTicket = (ticket: any) => {
    setFormData(prev => ({ ...prev, jira_ticket_id: ticket.key, jira_ticket_key: ticket.key }));
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
    const newErrors: Record<keyof CreateTaskForm, string | undefined> = {} as Record<keyof CreateTaskForm, string | undefined>;
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    // All categories are mandatory
    const availableCategoryIds = localCategories.map(cat => cat.id);
    const selectedCategoryIds = Object.keys(categorySelections).filter(catId => 
      categorySelections[catId] && categorySelections[catId].trim() !== ''
    );
    if (selectedCategoryIds.length === 0) {
      newErrors.category_id = 'At least one category must be selected';
    } else if (selectedCategoryIds.length !== availableCategoryIds.length) {
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
      // Transform categorySelections into TaskCategorySelection[]
      const categories: TaskCategorySelection[] = Object.entries(categorySelections).map(([categoryId, optionId], index) => ({
        category_id: categoryId,
        category_option_id: optionId,
        is_primary: false,
        sort_order: index
      }));

      // Ensure backward compatibility fields are set using the first selection
      const primary = categories[0];
      const payload: CreateTaskForm = {
        ...formData,
        category_id: primary?.category_id || '',
        category_option_id: primary?.category_option_id,
        categories
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
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
            className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white transition-all duration-200 ${
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
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            placeholder="Enter task description..."
          />
        </div>

        {/* Category and Column Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Column *
            </label>
            <select
              value={formData.column_id}
              onChange={(e) => handleInputChange('column_id', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white transition-all duration-200 ${
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

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Priority and Scope Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Scope
            </label>
            <select
              value={formData.scope}
              onChange={(e) => handleInputChange('scope', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            >
              <option value="project">Project</option>
              <option value="personal">Personal</option>
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
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.email}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Categories * (All Required)
          </label>
          <div className="space-y-4">
            {localCategories.length === 0 ? (
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

        {/* Estimated Hours and Due Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
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
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
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

            {/* JIRA Project */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                JIRA Project
              </label>
              <select
                value={selectedJiraProject}
                onChange={(e) => setSelectedJiraProject(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              >
                <option value="">Select JIRA project</option>
                {jiraProjectMappings.map((mapping) => (
                  <option key={mapping.id} value={mapping.jira_project_key}>
                    {mapping.jira_project_name || mapping.jira_project_key}
                  </option>
                ))}
              </select>
            </div>

            {/* Ticket Type */}
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
                    onChange={() => setJiraTicketType('existing')}
                  />
                  <span className="text-sm">Link Existing</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="new"
                    checked={jiraTicketType === 'new'}
                    onChange={() => setJiraTicketType('new')}
                  />
                  <span className="text-sm">Create New</span>
                </label>
              </div>
            </div>

            {/* Existing Ticket Search */}
            {jiraTicketType === 'existing' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Search Ticket
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={jiraSearchQuery}
                    onChange={(e) => setJiraSearchQuery(e.target.value)}
                    placeholder="Search JIRA tickets..."
                    className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={searchJiraTickets}
                    disabled={jiraSearching || !jiraSearchQuery.trim() || !selectedJiraProject}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"
                  >
                    {jiraSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                {showJiraSearch && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-700">
                    {jiraSearchResults.length === 0 ? (
                      <div className="p-3 text-sm text-neutral-500">No tickets found</div>
                    ) : (
                      jiraSearchResults.map((ticket: any) => (
                        <button
                          key={ticket.key}
                          type="button"
                          onClick={() => selectJiraTicket(ticket)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-600 border-b border-neutral-200 dark:border-neutral-600 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{ticket.key}</div>
                          <div className="text-xs text-neutral-500 truncate">{ticket.fields?.summary}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Create New Ticket */}
            {jiraTicketType === 'new' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Ticket Summary
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    disabled
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-neutral-50 dark:bg-neutral-600 text-neutral-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={createJiraTicket}
                  disabled={isCreatingTicket || !selectedJiraProject || !formData.title.trim()}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-xl disabled:opacity-50"
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

            {/* Linked Ticket Display */}
            {(formData.jira_ticket_key || formData.jira_ticket_id) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {formData.jira_ticket_key || formData.jira_ticket_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, jira_ticket_id: '', jira_ticket_key: '' }))}
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
    </ModernModal>
  );
}
