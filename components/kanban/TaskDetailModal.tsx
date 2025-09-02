'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, User, Calendar, Clock, Tag, Link, MessageSquare, AlertCircle, CheckCircle, Edit3, Trash2, Loader2, FolderOpen, Settings, Eye, FileText, Users, Target, Zap } from 'lucide-react';
import { KanbanTaskWithDetails, TaskTimeline, TaskComment, ProjectCategory, CategoryOption, TaskCategoryWithDetails } from '@/lib/kanban-types';
import toast from 'react-hot-toast';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanTaskWithDetails;
  onAddComment: (taskId: string, comment: string) => void;
  userEmail: string | null;
  projectData?: any; // Add project data for category loading
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onAddComment,
  userEmail,
  projectData
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');
  const [timeline, setTimeline] = useState<TaskTimeline[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // State for categories
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategoryWithDetails[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTaskCategories, setLoadingTaskCategories] = useState(false);

  // Calculate task age (memoized)
  const taskAgeInfo = useMemo(() => {
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
      ageColor = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    } else if (diffMinutes < 60) {
      ageText = `${diffMinutes} min ago`;
      ageColor = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    } else if (diffHours < 24) {
      ageText = `${diffHours} hr ago`;
      ageColor = diffHours < 6 
        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
        : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
    } else if (diffDays < 7) {
      ageText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      ageColor = diffDays < 3 
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
        : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    } else {
      ageText = `${diffDays} days ago`;
      ageColor = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }

    return { ageText, ageColor };
  }, [task.created_at]);

  // Load categories and task-specific categories when modal opens
  useEffect(() => {
    if (isOpen && task?.id && projectData?.id) {
      loadCategories();
      loadTaskCategories();
    }
  }, [isOpen, task?.id, projectData?.id]);

  // Load available categories for the project
  const loadCategories = useCallback(async () => {
    if (!projectData?.id) return;
    
    setLoadingCategories(true);
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
            color: cat.color,
            options: (cat.options || []).map((opt: any) => ({
              id: opt.id,
              category_id: cat.id,
              option_name: opt.option_name,
              option_value: opt.option_value,
              sort_order: opt.sort_order || 0,
              is_active: opt.is_active !== false
            }))
          }));
          
          setCategories(categoriesWithOptions);
        } else {
          setCategories([]);
        }
      } else {
        console.error('API failed to load categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [projectData?.id]);

  // Load task-specific categories from the mapping table
  const loadTaskCategories = useCallback(async () => {
    if (!task?.id) return;
    
    setLoadingTaskCategories(true);
    try {
      const response = await fetch(`/api/kanban/task-categories?taskId=${task.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.categories) {
          setTaskCategories(data.categories);
        } else {
          setTaskCategories([]);
        }
      } else {
        console.error('API failed to load task categories');
        setTaskCategories([]);
      }
    } catch (error) {
      console.error('Error loading task categories:', error);
      setTaskCategories([]);
    } finally {
      setLoadingTaskCategories(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
  }, [isOpen, task]);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const [timelineResponse, commentsResponse] = await Promise.all([
        fetch(`/api/kanban/task-timeline?taskId=${task.id}`).then(res => res.json()),
        fetch(`/api/kanban/task-comments?taskId=${task.id}`).then(res => res.json())
      ]);

      if (timelineResponse.success) {
        setTimeline(timelineResponse.data);
      } else {
        console.error('Failed to load timeline:', timelineResponse.error);
      }

      if (commentsResponse.success) {
        setComments(commentsResponse.data);
      } else {
        console.error('Failed to load comments:', commentsResponse.error);
      }
    } catch (error) {
      console.error('Error loading task data:', error);
      toast.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !userEmail) return;

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

      const data = await response.json();
      
      if (data.success) {
        setNewComment('');
        toast.success('Comment added successfully');
        // Refresh comments
        const commentsResponse = await fetch(`/api/kanban/task-comments?taskId=${task.id}`).then(res => res.json());
        if (commentsResponse.success) {
          setComments(commentsResponse.data);
        }
      } else {
        toast.error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <Tag className="h-4 w-4" />;
      case 'updated': return <Edit3 className="h-4 w-4" />;
      case 'assigned': return <User className="h-4 w-4" />;
      case 'moved': return <Clock className="h-4 w-4" />;
      case 'commented': return <MessageSquare className="h-4 w-4" />;
      case 'linked_jira': return <Link className="h-4 w-4" />;
      case 'status_changed': return <CheckCircle className="h-4 w-4" />;
      case 'priority_changed': return <AlertCircle className="h-4 w-4" />;
      case 'categories_updated': return <FolderOpen className="h-4 w-4" />;
      case 'due_date_changed': return <Calendar className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'updated': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'assigned': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
      case 'moved': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      case 'commented': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'linked_jira': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'status_changed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'priority_changed': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'categories_updated': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
      case 'due_date_changed': return 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getActionDescription = (action: string, details?: any) => {
    switch (action) {
      case 'created':
        return 'Task created';
      case 'updated':
        return details?.field ? `Updated ${details.field}` : 'Task updated';
      case 'assigned':
        return details?.assigned_to ? `Assigned to ${details.assigned_to}` : 'Assignment changed';
      case 'moved':
        // Always prioritize column names over IDs for better user experience
        if (details?.from_column_name && details?.to_column_name) {
          return `Moved from ${details.from_column_name} to ${details.to_column_name}`;
        } else if (details?.from_column && details?.to_column) {
          // If we only have IDs, show a generic message to avoid showing IDs to users
          return 'Task moved to different column';
        }
        return 'Task moved';
      case 'commented':
        return 'Added a comment';
      case 'linked_jira':
        return details?.ticket_key ? `Linked to JIRA ticket ${details.ticket_key}` : 'JIRA ticket linked';
      case 'status_changed':
        return details?.from_status && details?.to_status
          ? `Status changed from ${details.from_status} to ${details.to_status}`
          : 'Status changed';
      case 'priority_changed':
        return details?.from_priority && details?.to_priority
          ? `Priority changed from ${details.from_priority} to ${details.to_priority}`
          : 'Priority changed';
      case 'categories_updated':
        return details?.count ? `Updated ${details.count} categories` : 'Categories updated';
      case 'due_date_changed':
        return 'Due date changed';
      default:
        return action.replace('_', ' ');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Task Details
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {task.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="flex space-x-4 px-4">
            {[
              { id: 'details', label: 'Details', icon: Eye },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'comments', label: 'Comments', icon: MessageSquare }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Task Title and Description */}
              <div className="rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                  {task.title}
                </h3>
                {task.description && (
                  <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 border border-neutral-200 dark:border-neutral-600">
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Task Meta Information */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">Basic Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <Tag className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Status</p>
                        <p className="text-neutral-900 dark:text-white font-medium capitalize">{task.status}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <Tag className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Priority</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          task.priority === 'urgent' 
                            ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' 
                            : task.priority === 'high'
                            ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                            : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                        }`}>
                          {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Not specified'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <Clock className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Age</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${taskAgeInfo.ageColor}`}>
                          {taskAgeInfo.ageText}
                        </span>
                      </div>
                    </div>

                    {task.column && (
                      <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <Tag className="h-5 w-5 text-neutral-400" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Current Column</p>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: task.column.color }}
                            ></div>
                            <p className="text-neutral-900 dark:text-white font-medium">{task.column.name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories and Options */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Categories & Options</h4>
                  
                  <div className="space-y-4">
                    {loadingTaskCategories ? (
                      <div className="flex items-center space-x-3 text-neutral-500 p-4 border border-neutral-200 dark:border-neutral-600 rounded-xl">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading task categories...</span>
                      </div>
                    ) : taskCategories.length > 0 ? (
                      <div className="space-y-3">
                        {taskCategories.map((taskCategory) => (
                          <div 
                            key={taskCategory.mapping_id} 
                            className="border border-neutral-300 dark:border-neutral-600 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-700/50"
                          >
                            <div className="flex items-center space-x-3 mb-2">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: taskCategory.category_color || '#3B82F6' }}
                              ></div>
                              <h5 className="font-medium text-neutral-900 dark:text-white">
                                {taskCategory.category_name}
                              </h5>
                            </div>
                            
                            {taskCategory.category_description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                                {taskCategory.category_description}
                              </p>
                            )}

                            {/* Show selected option if any */}
                            {taskCategory.category_option_id && taskCategory.option_name && (
                              <div className="mt-2 p-3 bg-white dark:bg-neutral-600 rounded-lg border border-neutral-200 dark:border-neutral-600">
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                  Selected Option:
                                </p>
                                <div className="bg-neutral-50 dark:bg-neutral-700 rounded p-2">
                                  <p className="font-medium text-neutral-900 dark:text-white">
                                    {taskCategory.option_name}
                                  </p>
                                  {taskCategory.option_value && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                      Value: {taskCategory.option_value}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Show if no option selected */}
                            {!taskCategory.category_option_id && (
                              <div className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                                No option selected
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600 rounded-lg">
                        <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No categories assigned</p>
                        <p className="text-sm">This task is not assigned to any categories</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment & Time */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Assignment & Time</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <User className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Created By</p>
                        <p className="text-neutral-900 dark:text-white font-medium">
                          {task.created_by_user?.full_name || task.created_by}
                        </p>
                      </div>
                    </div>

                    {task.assigned_to && (
                      <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <User className="h-5 w-5 text-neutral-400" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Assigned To</p>
                          <p className="text-neutral-900 dark:text-white font-medium">
                            {task.assigned_to_user?.full_name || task.assigned_to}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Created</p>
                        <p className="text-neutral-900 dark:text-white font-medium">
                          {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <Calendar className="h-5 w-5 text-neutral-400" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Due Date</p>
                          <p className="text-neutral-900 dark:text-white font-medium">
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                      </div>
                    )}

                    {task.estimated_hours && (
                      <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <Clock className="h-5 w-5 text-neutral-400" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Estimated Hours</p>
                          <p className="text-neutral-900 dark:text-white font-medium">{task.estimated_hours}h</p>
                        </div>
                      </div>
                    )}

                    {task.actual_hours && (
                      <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                        <Clock className="h-5 w-5 text-neutral-400" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Actual Hours</p>
                          <p className="text-neutral-900 dark:text-white font-medium">{task.actual_hours}h</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* JIRA Integration */}
              {task.jira_ticket_key && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                      <Link className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">JIRA Integration</h4>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <Link className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-semibold text-yellow-600 dark:text-yellow-400 text-lg">
                        {task.jira_ticket_key}
                      </p>
                      {task.jira_ticket_key && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          JIRA Ticket: {task.jira_ticket_key}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Task Timeline</h3>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neutral-400" />
                  <p className="text-neutral-600 dark:text-neutral-400">Loading timeline...</p>
                </div>
              ) : timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-700/50">
                      <div className={`p-2 rounded-full ${getActionColor(item.action)}`}>
                        {getActionIcon(item.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {item.user_name || item.user_email}
                          </span>
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {getActionDescription(item.action, item.details)}
                        </p>
                        
                        {item.details && Object.keys(item.details).length > 0 && (
                          <div className="mt-3 p-3 bg-white dark:bg-neutral-600 rounded-lg border border-neutral-200 dark:border-neutral-600">
                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                              {typeof item.details === 'object' ? (
                                <div className="space-y-1">
                                  {Object.entries(item.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                                      <span>
                                        {key === 'category_details' && Array.isArray(value) ? (
                                          <div className="space-y-1">
                                            {value.map((catDetail: any, index: number) => (
                                              <div key={index} className="text-xs bg-neutral-50 dark:bg-neutral-700 p-2 rounded">
                                                <div className="font-medium">{catDetail.displayText || `${catDetail.categoryName}: ${catDetail.optionName || 'N/A'}`}</div>
                                                {catDetail.categoryName && catDetail.optionName && (
                                                  <div className="text-neutral-500">
                                                    Category: {catDetail.categoryName} | Option: {catDetail.optionName}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : key === 'categories' ? (
                                          <span className="text-xs bg-neutral-50 dark:bg-neutral-700 p-2 rounded">
                                            {String(value)}
                                          </span>
                                        ) : (
                                          String(value)
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span>{String(item.details)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No timeline entries found</p>
                  <p className="text-sm">Timeline entries will appear here when actions are performed on this task.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Comments</h3>
              </div>
              
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
              {loading ? (
                <div className="text-center py-12">
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
                          {formatDate(comment.created_at)}
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
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No comments yet</p>
                  <p className="text-sm">Be the first to add a comment to this task.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
