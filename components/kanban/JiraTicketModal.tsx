'use client';

import React, { useState } from 'react';
import { X, Search, Link, Clock, User, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { JiraTicket } from '@/lib/kanban-types';
import { searchJiraTickets } from '@/lib/kanban-api';

interface JiraTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticket: JiraTicket) => void;
}

export default function JiraTicketModal({
  isOpen,
  onClose,
  onSelectTicket
}: JiraTicketModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [searchResults, setSearchResults] = useState<JiraTicket[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JiraTicket | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await searchJiraTickets(searchQuery, projectKey);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTicket = (ticket: JiraTicket) => {
    setSelectedTicket(ticket);
  };

  const handleConfirmSelection = () => {
    if (selectedTicket) {
      onSelectTicket(selectedTicket);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'critical':
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'to do':
      case 'open':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in progress':
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'review':
      case 'testing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'done':
      case 'closed':
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <Link className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Link JIRA Ticket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Search JIRA Tickets
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Project Key (Optional)
                </label>
                <input
                  type="text"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  placeholder="e.g., PROJ"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Search Query
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    placeholder="Search by ticket key, summary, or description..."
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searching ? (
                      <div className="flex items-center space-x-2">
                        <div className="loading-spinner h-4 w-4"></div>
                        <span>Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4" />
                        <span>Search</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              <p>Search for JIRA tickets to link with your kanban tasks. You can search by:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Ticket key (e.g., PROJ-123)</li>
                <li>Summary or description keywords</li>
                <li>Assignee or reporter names</li>
                <li>Project-specific terms</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="p-6">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Search Results ({searchResults.length})
                </h3>
                {selectedTicket && (
                  <button
                    onClick={handleConfirmSelection}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Link Selected Ticket
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {searchResults.map((ticket, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTicket?.key === ticket.key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    {/* Ticket Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                          {ticket.key}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority || '')}`}>
                        {getPriorityIcon(ticket.priority || '')}
                        <span className="ml-1">{ticket.priority || 'Unknown'}</span>
                      </span>
                    </div>

                    {/* Ticket Summary */}
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-2 line-clamp-2">
                      {ticket.summary}
                    </h4>

                    {/* Ticket Details */}
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {ticket.description && (
                        <p className="line-clamp-2">
                          {ticket.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-3 w-3" />
                          <span className="truncate">
                            {ticket.assignee || 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Tag className="h-3 w-3" />
                          <span className="truncate">
                            {ticket.issue_type || 'Task'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span>Project: {ticket.project}</span>
                        <span>Updated: {new Date(ticket.updated).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {selectedTicket?.key === ticket.key && (
                      <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Selected for linking</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : searchQuery && !searching ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No tickets found
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Try adjusting your search terms or project key to find matching tickets.
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Link className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                Search for JIRA tickets
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Enter a search query above to find JIRA tickets to link with your tasks.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          {selectedTicket && (
            <button
              onClick={handleConfirmSelection}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Link Ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
