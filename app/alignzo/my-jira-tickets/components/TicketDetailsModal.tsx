'use client';

import React from 'react';
import { X, ExternalLink, Calendar, User, Flag, Tag } from 'lucide-react';

interface JiraTicket {
  key: string;
  id: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  project: string;
  projectKey: string;
  issueType: string;
  created: string;
  updated: string;
  jiraUrl: string;
}

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: JiraTicket | null;
}

export default function TicketDetailsModal({ isOpen, onClose, ticket }: TicketDetailsModalProps) {
  if (!isOpen || !ticket) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700';
    
    switch (status.toLowerCase()) {
      case 'done':
      case 'closed':
      case 'resolved':
        return 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900';
      case 'in progress':
      case 'in development':
        return 'text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900';
      case 'to do':
      case 'open':
        return 'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700';
      case 'blocked':
        return 'text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900';
      default:
        return 'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    if (!priority) return 'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700';
    
    switch (priority.toLowerCase()) {
      case 'highest':
      case 'critical':
        return 'text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900';
      case 'high':
        return 'text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-900';
      case 'medium':
        return 'text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900';
      case 'low':
        return 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900';
      case 'lowest':
        return 'text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900';
      default:
        return 'text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-neutral-500 bg-opacity-75 dark:bg-neutral-900 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-neutral-100 dark:border-neutral-700">
          <div className="bg-white dark:bg-neutral-800 px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900">
                  <Tag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                    Ticket Details
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    View complete ticket information
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 px-6 py-6">
            {/* Ticket Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {ticket.key}
                </h2>
                <a
                  href={ticket.jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in JIRA
                </a>
              </div>
              <p className="text-lg text-neutral-700 dark:text-neutral-300">
                {ticket.summary || 'No summary available'}
              </p>
            </div>

            {/* Ticket Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status || 'Unknown'}
                </span>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Priority
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority || 'N/A'}
                </span>
              </div>

              {/* Issue Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Issue Type
                </label>
                <div className="flex items-center text-sm text-neutral-900 dark:text-white">
                  <Tag className="h-4 w-4 mr-2 text-neutral-500" />
                  {ticket.issueType}
                </div>
              </div>

              {/* Project */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Project
                </label>
                <div className="text-sm text-neutral-900 dark:text-white">
                  {ticket.project || 'N/A'} ({ticket.projectKey || 'N/A'})
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Assignee
                </label>
                <div className="flex items-center text-sm text-neutral-900 dark:text-white">
                  <User className="h-4 w-4 mr-2 text-neutral-500" />
                  {ticket.assignee || 'Unassigned'}
                </div>
              </div>

              {/* Reporter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Reporter
                </label>
                <div className="flex items-center text-sm text-neutral-900 dark:text-white">
                  <User className="h-4 w-4 mr-2 text-neutral-500" />
                  {ticket.reporter || 'N/A'}
                </div>
              </div>

              {/* Created Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Created
                </label>
                <div className="flex items-center text-sm text-neutral-900 dark:text-white">
                  <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
                  {formatDate(ticket.created)}
                </div>
              </div>

              {/* Updated Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Last Updated
                </label>
                <div className="flex items-center text-sm text-neutral-900 dark:text-white">
                  <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
                  {formatDate(ticket.updated)}
                </div>
              </div>
            </div>

          </div>

          {/* Modal footer */}
          <div className="bg-neutral-50 dark:bg-neutral-700 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
