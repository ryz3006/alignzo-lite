'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Clock, Tag, Link, MessageSquare, AlertCircle, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { KanbanTaskWithDetails, TaskTimeline, TaskComment } from '@/lib/kanban-types';
import { getTaskTimeline, getTaskComments } from '@/lib/kanban-api';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanTaskWithDetails;
  onAddComment: (taskId: string, comment: string) => void;
  userEmail: string | null;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onAddComment,
  userEmail
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');
  const [timeline, setTimeline] = useState<TaskTimeline[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
  }, [isOpen, task]);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const [timelineResponse, commentsResponse] = await Promise.all([
        getTaskTimeline(task.id),
        getTaskComments(task.id)
      ]);

      if (timelineResponse.success) {
        setTimeline(timelineResponse.data);
      }

      if (commentsResponse.success) {
        setComments(commentsResponse.data);
      }
    } catch (error) {
      console.error('Error loading task data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await onAddComment(task.id, newComment.trim());
      setNewComment('');
      // Refresh comments
      const commentsResponse = await getTaskComments(task.id);
      if (commentsResponse.success) {
        setComments(commentsResponse.data);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
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
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-600 bg-green-100';
      case 'updated': return 'text-blue-600 bg-blue-100';
      case 'assigned': return 'text-purple-600 bg-purple-100';
      case 'moved': return 'text-orange-600 bg-orange-100';
      case 'commented': return 'text-indigo-600 bg-indigo-100';
      case 'linked_jira': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Task Details
            </h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {getPriorityIcon(task.priority)}
              <span className="ml-1 capitalize">{task.priority}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Details' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'comments', label: 'Comments' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Task Title and Description */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Task Meta Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Task Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Tag className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Category</p>
                        <p className="text-neutral-900 dark:text-white">
                          {task.category?.name || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {task.category_option && (
                      <div className="flex items-center space-x-3">
                        <Tag className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Category Option</p>
                          <p className="text-neutral-900 dark:text-white">{task.category_option.option_name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Status</p>
                        <p className="text-neutral-900 dark:text-white capitalize">{task.status}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Created</p>
                        <p className="text-neutral-900 dark:text-white">
                          {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Due Date</p>
                          <p className="text-neutral-900 dark:text-white">
                            {formatDate(task.due_date)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Assignment & Time</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Created By</p>
                        <p className="text-neutral-900 dark:text-white">
                          {task.created_by_user?.full_name || task.created_by}
                        </p>
                      </div>
                    </div>

                    {task.assigned_to && (
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Assigned To</p>
                          <p className="text-neutral-900 dark:text-white">
                            {task.assigned_to_user?.full_name || task.assigned_to}
                          </p>
                        </div>
                      </div>
                    )}

                    {task.estimated_hours && (
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Estimated Hours</p>
                          <p className="text-neutral-900 dark:text-white">{task.estimated_hours}h</p>
                        </div>
                      </div>
                    )}

                    {task.actual_hours && (
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Actual Hours</p>
                          <p className="text-neutral-900 dark:text-white">{task.actual_hours}h</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Tag className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Scope</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          task.scope === 'personal' 
                            ? 'bg-purple-100 text-purple-800 border-purple-200' 
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {task.scope === 'personal' ? 'Personal' : 'Project'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* JIRA Integration */}
              {task.jira_ticket_key && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">JIRA Integration</h4>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Link className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {task.jira_ticket_key}
                      </p>
                      {task.jira_ticket_id && task.jira_ticket_id !== task.jira_ticket_key && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          ID: {task.jira_ticket_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Task Timeline</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
                  <p className="text-neutral-600 dark:text-neutral-400">Loading timeline...</p>
                </div>
              ) : timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                      <div className={`p-2 rounded-full ${getActionColor(item.action)}`}>
                        {getActionIcon(item.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {item.user_name || item.user_email}
                          </span>
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-neutral-700 dark:text-neutral-300 capitalize">
                          {item.action.replace('_', ' ')}
                        </p>
                        
                        {item.details && (
                          <div className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-700 rounded text-sm text-neutral-600 dark:text-neutral-400">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(item.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No timeline entries found
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Comments</h3>
              
              {/* Add Comment */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Comment
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
                  <p className="text-neutral-600 dark:text-neutral-400">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-neutral-400" />
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {comment.user_email}
                          </span>
                        </div>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No comments yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
