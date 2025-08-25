'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle, Search, Plus, Loader2, CheckCircle } from 'lucide-react';
import { CreateTaskForm, ProjectWithCategories, ProjectCategory, CategoryOption } from '@/lib/kanban-types';
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

  // Dynamic category selections - supports multiple categories as requested
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<keyof CreateTaskForm, string | undefined>>({} as Record<keyof CreateTaskForm, string | undefined>);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [localCategories, setLocalCategories] = useState<ProjectCategory[]>([]);
  
  // Loading states with better UX
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized function to load categories with options - optimized with fallback
  const loadCategoriesForProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    
    setIsLoadingCategories(true);
    try {
      // First try the optimized database function
      const { data, error } = await supabaseClient.rpc('get_project_categories_with_options', {
        project_uuid: projectId
      });

      if (error) {
        console.warn('Optimized function not available, falling back to direct query:', error);
        // Fallback to direct query if the optimized function doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabaseClient
          .query({
            table: 'project_categories',
            action: 'select',
            select: `
              id,
              name,
              description,
              color,
              sort_order,
              created_at,
              updated_at,
              category_options (
                id,
                option_name,
                option_value,
                sort_order
              )
            `,
            filters: {
              project_id: projectId,
              is_active: true
            },
            order: { column: 'sort_order', ascending: true }
          });

        if (fallbackError) throw new Error(fallbackError);
        
        // Transform the data to match the expected format
        const transformedCategories = fallbackData?.map((cat: any) => ({
          ...cat,
          options: cat.category_options?.map((opt: any) => ({
            id: opt.id,
            option_name: opt.option_name,
            option_value: opt.option_value,
            sort_order: opt.sort_order
          })) || []
        })) || [];
        
        setLocalCategories(transformedCategories);
      } else {
        // Parse the JSON result from optimized function
        const categories = data ? JSON.parse(data) : [];
        setLocalCategories(categories);
      }
    } catch (error) {
      console.error('Error loading categories for project:', error);
      toast.error('Failed to load categories. Please try again.');
      // Set empty array to prevent infinite loading
      setLocalCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Memoized function to load team members - optimized
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

  // Initialize modal when it opens - show immediately with loading overlay
  useEffect(() => {
    if (isOpen) {
      // Show loading overlay immediately
      setIsLoading(true);
      
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
      setCategorySelections({});
      
      // Load data in parallel for better performance
      const loadData = async () => {
        try {
          await Promise.all([
            // Always try to load categories to ensure we have the latest data
            projectData?.id ? loadCategoriesForProject(projectData.id) : Promise.resolve(),
            // Load team members
            selectedTeam ? loadTeamMembers() : Promise.resolve()
          ]);
        } catch (error) {
          console.error('Error loading modal data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, projectData, selectedTeam, columnId, loadCategoriesForProject, loadTeamMembers]);

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

  // Memoized available categories - prioritize local categories for fresh data
  const availableCategories = useMemo(() => {
    return localCategories.length > 0 ? localCategories : (projectData?.categories || []);
  }, [localCategories, projectData?.categories]);

  // Memoized available columns
  const availableColumns = useMemo(() => {
    return projectData?.columns || [];
  }, [projectData?.columns]);

  const validateForm = (): boolean => {
    const newErrors: Record<keyof CreateTaskForm, string | undefined> = {} as Record<keyof CreateTaskForm, string | undefined>;

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }

    // Check if at least one category has been selected
    const hasCategorySelection = Object.values(categorySelections).some(optionId => optionId && optionId.trim() !== '');
    if (!hasCategorySelection) {
      newErrors.category_id = 'At least one category option is required';
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

    setIsSubmitting(true);
    try {
      // Get the first selected category and option for backward compatibility
      const selectedCategoryEntry = Object.entries(categorySelections).find(([categoryId, optionId]) => optionId && optionId.trim() !== '');
      const selectedCategoryId = selectedCategoryEntry ? selectedCategoryEntry[0] : '';
      const selectedOptionId = selectedCategoryEntry ? selectedCategoryEntry[1] : '';

      const formDataToSubmit = {
        ...formData,
        category_id: selectedCategoryId,
        category_option_id: selectedOptionId,
        due_date: formData.due_date || null
      };
      
      onSubmit(formDataToSubmit);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    onClose();
  };

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

        {/* Loading Overlay - Show immediately when modal opens */}
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Project & Categories</h3>
            
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

            {/* Dynamic Categories - As requested */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categories *
              </label>
              <div className="space-y-3">
                {isLoadingCategories ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading categories...</span>
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="text-gray-500">No categories available for this project</div>
                ) : (
                  availableCategories.map((category) => (
                    <div key={category.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {category.name}
                      </label>
                      <select
                        value={categorySelections[category.id] || ''}
                        onChange={(e) => setCategorySelections(prev => ({
                          ...prev,
                          [category.id]: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select an option (optional)</option>
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
                <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
              )}
            </div>

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
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
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
