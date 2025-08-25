'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Tag, Link, AlertCircle } from 'lucide-react';
import { UpdateTaskForm, KanbanTaskWithDetails, ProjectWithCategories, ProjectSubcategory } from '@/lib/kanban-types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, updates: UpdateTaskForm) => void;
  task: KanbanTaskWithDetails;
  projectData: ProjectWithCategories | null;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  projectData
}: EditTaskModalProps) {
  const [formData, setFormData] = useState<UpdateTaskForm>({
    title: task.title,
    description: task.description || '',
    category_id: task.category_id,
    subcategory_id: task.subcategory_id || '',
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
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([]);
  const [showJiraSearch, setShowJiraSearch] = useState(false);
  const [jiraSearchQuery, setJiraSearchQuery] = useState('');
  const [jiraSearchResults, setJiraSearchResults] = useState<any[]>([]);
  const [jiraSearching, setJiraSearching] = useState(false);

  useEffect(() => {
    if (task && projectData) {
      setFormData({
        title: task.title,
        description: task.description || '',
        category_id: task.category_id,
        subcategory_id: task.subcategory_id || '',
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
    }
  }, [task, projectData]);

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
      onSubmit(task.id, formData);
    }
  };

  const handleInputChange = (field: keyof UpdateTaskForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const searchJiraTickets = async () => {
    if (!jiraSearchQuery.trim()) return;
    
    setJiraSearching(true);
    try {
      // This would integrate with your existing JIRA API
      // For now, using mock data
      const mockResults = [
        {
          key: 'PROJ-123',
          summary: 'Sample JIRA ticket',
          status: 'To Do',
          priority: 'Medium'
        },
        {
          key: 'PROJ-124',
          summary: 'Another sample ticket',
          status: 'In Progress',
          priority: 'High'
        }
      ];
      
      setJiraSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
    } finally {
      setJiraSearching(false);
    }
  };

  const selectJiraTicket = (ticket: any) => {
    setFormData(prev => ({
      ...prev,
      jira_ticket_id: ticket.key,
      jira_ticket_key: ticket.key
    }));
    setShowJiraSearch(false);
    setJiraSearchQuery('');
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
            Edit Task
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
                value={formData.title || ''}
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
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                placeholder="Enter task description"
              />
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
                  value={formData.category_id || ''}
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
                  value={formData.subcategory_id || ''}
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Column *
                </label>
                <select
                  value={formData.column_id || ''}
                  onChange={(e) => handleInputChange('column_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  <p className="mt-1 text-sm text-red-600">{errors.column_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority || 'medium'}
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
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.actual_hours 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-neutral-300 dark:border-neutral-600'
                  } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                  placeholder="0.0"
                />
                {errors.actual_hours && (
                  <p className="mt-1 text-sm text-red-600">{errors.actual_hours}</p>
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
                  value={formData.due_date || ''}
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
                <input
                  type="email"
                  value={formData.assigned_to || ''}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="user@example.com"
                />
              </div>
            </div>
          </div>

          {/* JIRA Integration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              JIRA Integration
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={formData.jira_ticket_key || ''}
                  onChange={(e) => handleInputChange('jira_ticket_key', e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="e.g., PROJ-123"
                />
                <button
                  type="button"
                  onClick={() => setShowJiraSearch(!showJiraSearch)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Link className="h-4 w-4" />
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                            {ticket.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
              Update Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
