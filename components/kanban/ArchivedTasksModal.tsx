'use client';

import React, { useState, useEffect } from 'react';
import { X, Eye, Trash2, Archive } from 'lucide-react';
import { KanbanTask } from '@/lib/kanban-types';
import { getKanbanTasks } from '@/lib/kanban-api';
import TaskDetailModal from './TaskDetailModal';
import ConfirmationModal from './ConfirmationModal';

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  isOwner: boolean;
}

export default function ArchivedTasksModal({ isOpen, onClose, projectId, isOwner }: ArchivedTasksModalProps) {
  const [archivedTasks, setArchivedTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<KanbanTask | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadArchivedTasks();
    }
  }, [isOpen, projectId]);

  const loadArchivedTasks = async () => {
    setLoading(true);
    try {
      const response = await getKanbanTasks(projectId, { status: 'archived' });
      if (response.success && response.data) {
        setArchivedTasks(response.data);
      }
    } catch (error) {
      console.error('Error loading archived tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTask = (task: KanbanTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleDeleteTask = (task: KanbanTask) => {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      // Call the permanent delete API
      const response = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: 'kanban_tasks',
          action: 'delete',
          filters: { id: taskToDelete.id }
        })
      });

      if (response.ok) {
        setArchivedTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
        setTaskToDelete(null);
      } else {
        console.error('Error deleting task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-neutral-200 dark:border-neutral-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Archive className="h-5 w-5 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Archived Tasks
              </h2>
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm rounded-full">
                {archivedTasks.length} tasks
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : archivedTasks.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                  No Archived Tasks
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                  There are no archived tasks in this project.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {archivedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4 border border-neutral-200 dark:border-neutral-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>Archived: {formatDate(task.updated_at || task.created_at)}</span>
                          {task.assigned_to && (
                            <span>Assigned: {task.assigned_to}</span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewTask(task)}
                          className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Permanently Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onAddComment={() => {}}
          userEmail={null}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDeleteTask}
        title="Permanently Delete Task"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        type="danger"
      />
    </>
  );
}
