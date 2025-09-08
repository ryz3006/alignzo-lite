'use client';

import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { RefreshCw, Edit3, ExternalLink, Search, X } from 'lucide-react';
import TicketStatusModal from './components/TicketStatusModal';
import TicketDetailsModal from './components/TicketDetailsModal';

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

interface JiraProjectMapping {
  id: string;
  dashboard_project_id: string;
  jira_project_key: string;
  jira_project_name: string;
  project?: {
    id: string;
    name: string;
  };
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function MyJiraTicketsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<JiraTicket[]>([]);
  const [projectMappings, setProjectMappings] = useState<JiraProjectMapping[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<JiraTicket | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<JiraTicket[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSearchTicket, setSelectedSearchTicket] = useState<JiraTicket | null>(null);
  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadProjectMappings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject && user) {
      loadTickets();
    }
  }, [selectedProject, user, pagination.currentPage]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        window.location.href = '/';
        return;
      }
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/';
    }
  };

  const loadProjectMappings = async () => {
    try {
      const response = await fetch(`/api/integrations/jira/project-mapping?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (data.success && data.mappings.length > 0) {
        setProjectMappings(data.mappings);
        // Auto-select the first project if none selected
        if (!selectedProject) {
          setSelectedProject(data.mappings[0].jira_project_key);
        }
      } else {
        toast.error('No JIRA project mappings found. Please configure JIRA integration first.');
      }
    } catch (error) {
      console.error('Error loading project mappings:', error);
      toast.error('Failed to load JIRA project mappings');
    }
  };

  const loadTickets = async () => {
    if (!selectedProject || !user) return;

    setLoadingTickets(true);
    try {
      const response = await fetch('/api/jira/my-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          projectKey: selectedProject,
          page: pagination.currentPage,
          pageSize: pagination.pageSize
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets);
        setPagination(data.pagination);
        console.log('📊 Pagination data:', data.pagination);
      } else {
        toast.error(data.error || 'Failed to load JIRA tickets');
        setTickets([]);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load JIRA tickets');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleProjectChange = (projectKey: string) => {
    setSelectedProject(projectKey);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      
      // Load tickets for the new page
      try {
        const response = await fetch('/api/jira/my-tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail: user?.email,
            projectKey: selectedProject,
            page: newPage,
            pageSize: pagination.pageSize
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          if (data.tickets.length === 0 && newPage > 1) {
            toast.error('No more tickets available');
            // Revert to previous page
            setPagination(prev => ({ ...prev, currentPage: newPage - 1 }));
          } else {
            setTickets(data.tickets);
            setPagination(data.pagination);
          }
        } else {
          toast.error(data.error || 'Failed to load tickets');
          // Revert to previous page
          setPagination(prev => ({ ...prev, currentPage: newPage - 1 }));
        }
      } catch (error) {
        console.error('Error loading tickets:', error);
        toast.error('Failed to load tickets');
        // Revert to previous page
        setPagination(prev => ({ ...prev, currentPage: newPage - 1 }));
      }
    }
  };

  const handleEditStatus = (ticket: JiraTicket) => {
    setSelectedTicket(ticket);
    setShowStatusModal(true);
  };

  const searchJiraTickets = async () => {
    if (!searchTerm.trim() || !selectedProject) return;

    setIsSearching(true);
    setShowSearchResults(false);
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/jira/search-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user?.email,
          projectKey: selectedProject,
          searchTerm: searchTerm.trim(),
          maxResults: 20
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.tickets || []);
        setShowSearchResults(true);
        
        if (data.tickets.length === 0) {
          toast.error('No tickets found matching your search');
        } else {
          toast.success(`Found ${data.tickets.length} tickets`);
        }
      } else {
        const errorMessage = data.error || 'Failed to search tickets';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error searching JIRA tickets:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchTicket = (ticket: JiraTicket) => {
    setSelectedSearchTicket(ticket);
    setShowTicketDetailsModal(true);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const handleStatusUpdate = () => {
    setShowStatusModal(false);
    setSelectedTicket(null);
    // Reload tickets to reflect the status change
    loadTickets();
  };

  const getPriorityColor = (priority: string) => {
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

  const getStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">My JIRA Tickets</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            View and manage your assigned JIRA tickets
          </p>
        </div>

        {/* Project Selection */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Select JIRA Project</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose a project to view your assigned tickets</p>
            </div>
            <div className="w-64">
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="input-modern"
              >
                <option value="">Select a project...</option>
                {projectMappings.map((mapping) => (
                  <option key={mapping.id} value={mapping.jira_project_key}>
                    {mapping.jira_project_name} ({mapping.jira_project_key})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {selectedProject && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Search Tickets</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Search for any tickets in the selected project</p>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tickets by ID, title, or description..."
                className="input-modern pr-10"
                onKeyPress={(e) => e.key === 'Enter' && searchJiraTickets()}
              />
              <button
                type="button"
                onClick={searchJiraTickets}
                disabled={isSearching || !searchTerm.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300 disabled:opacity-50"
              >
                {isSearching ? (
                  <div className="loading-spinner h-4 w-4"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Search Results */}
            {showSearchResults && (
              <div className="mt-4">
                {searchResults.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700">
                    {searchResults.map((ticket) => (
                      <div
                        key={ticket.key}
                        onClick={() => selectSearchTicket(ticket)}
                        className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-600 cursor-pointer border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                {ticket.key}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-900 dark:text-white mt-1 line-clamp-2">
                              {ticket.summary}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                              <span>Priority: {ticket.priority}</span>
                              <span>Reporter: {ticket.reporter}</span>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-neutral-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
                    No tickets found matching your search
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tickets Table */}
        {selectedProject && (
          <div className="table-modern">
            <div className="bg-neutral-50 dark:bg-neutral-700 px-6 py-3 border-b border-neutral-200 dark:border-neutral-600">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Assigned Tickets</span>
                  {pagination.totalItems > 0 && (
                    <span className="ml-2">
                      ({pagination.totalItems} total)
                    </span>
                  )}
                </div>
                <button
                  onClick={loadTickets}
                  disabled={loadingTickets}
                  className="btn-ghost text-sm"
                >
                  {loadingTickets ? (
                    <>
                      <div className="loading-spinner h-4 w-4 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </>
                  )}
                </button>
              </div>
            </div>

            {loadingTickets ? (
              <div className="p-8 text-center">
                <div className="loading-spinner h-8 w-8 mx-auto"></div>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-neutral-500 dark:text-neutral-400">
                  <div>
                    <p className="text-lg font-medium">No tickets found</p>
                    <p className="text-sm">You don't have any assigned tickets in this project.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                      {tickets.map((ticket) => (
                        <tr key={ticket.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                              <a
                                href={ticket.jiraUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline inline-flex items-center"
                              >
                                {ticket.key}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {ticket.issueType}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-neutral-900 dark:text-white max-w-xs truncate">
                              {ticket.summary}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                            {ticket.reporter}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            {new Date(ticket.updated).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditStatus(ticket)}
                              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit Status"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 px-6 py-4">
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    {pagination.totalItems > 0 ? (
                      <>
                        Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} results
                      </>
                    ) : (
                      <>No tickets found</>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className="px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Page {pagination.currentPage}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={loadingTickets}
                      className="px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedTicket && (
          <TicketStatusModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
            ticket={selectedTicket}
            userEmail={user.email}
            onStatusUpdate={handleStatusUpdate}
          />
        )}

        {/* Ticket Details Modal */}
        <TicketDetailsModal
          isOpen={showTicketDetailsModal}
          onClose={() => setShowTicketDetailsModal(false)}
          ticket={selectedSearchTicket}
        />
      </div>
    </div>
  );
}
