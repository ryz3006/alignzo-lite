// =====================================================
// MODERN CREATE TASK MODAL
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, ExternalLink, Loader2, CheckCircle, FolderOpen, Settings } from 'lucide-react';
import { CreateTaskForm, ProjectWithCategories, ProjectCategory, CategoryOption, KanbanColumn, TaskCategorySelection } from '@/lib/kanban-types';
import { getCurrentUser } from '@/lib/auth';
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
    }
  }, [isOpen, projectData, columnId]);

  const loadTeamMembers = async () => {
    if (!selectedTeam) return;
    
    try {
      const response = await fetch(`/api/teams/team-members?teamId=${selectedTeam}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<keyof CreateTaskForm, string | undefined> = {} as Record<keyof CreateTaskForm, string | undefined>;
    
    if (!formData.title.trim()) {
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
      await onSubmit(formData);
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

        {/* Category and Column Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm transition-all duration-200 ${
                errors.category_id 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-slate-300 dark:border-slate-600'
              } focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20`}
            >
              <option value="">Select category</option>
              {localCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
            )}
          </div>

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

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Scope
            </label>
            <select
              value={formData.scope}
              onChange={(e) => handleInputChange('scope', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            >
              <option value="project">Project</option>
              <option value="personal">Personal</option>
            </select>
          </div>
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

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Assign To
          </label>
          <select
            value={formData.assigned_to}
            onChange={(e) => handleInputChange('assigned_to', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member.user_email} value={member.user_email}>
                {member.users?.full_name || member.user_email}
              </option>
            ))}
          </select>
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
