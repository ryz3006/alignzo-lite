'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { WorkLog, Project, User } from '@/lib/supabase';
import { Search, Eye, Filter, Calendar, User as UserIcon, RefreshCw, Download, Clock } from 'lucide-react';
import { formatDuration, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface WorkLogWithProject extends WorkLog {
  project: Project;
}

interface FilterState {
  user: string;
  project: string;
  dateFrom: string;
  dateTo: string;
}

export default function TeamWorkReportsPage() {
  const [workLogs, setWorkLogs] = useState<WorkLogWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLog, setViewingLog] = useState<WorkLogWithProject | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    user: '',
    project: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setAuthLoading(false);
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/';
      }
    };
    
    checkAuth();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1);
        setLoading(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load data only after authentication
  useEffect(() => {
    if (currentUser && !authLoading) {
      loadTeamWorkReports();
      loadProjects();
      loadTeamMembers();
    }
  }, [filters, currentPage, currentUser, authLoading]);

  const loadTeamWorkReports = async () => {
    try {
      if (!currentUser?.email) return;

      // Build query parameters for the API
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString()
      });

      if (filters.user) params.append('userEmail', filters.user);
      if (filters.project) params.append('projectId', filters.project);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      // Fetch team work logs from the API with authentication headers
      const response = await fetch(`/api/team-work-logs?${params.toString()}`, {
        headers: {
          'x-user-email': currentUser.email,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setWorkLogs(result.data || []);
      setTotalCount(result.pagination?.totalCount || 0);
    } catch (error) {
      console.error('Error loading work reports:', error);
      toast.error('Failed to load work reports');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      if (!currentUser?.email) return;

      // Get projects that the user's teams are assigned to
      const teamMemberships = await supabaseClient.getTeamMemberships(currentUser.email);
      if (teamMemberships.error) {
        console.error('Error loading team memberships:', teamMemberships.error);
        return;
      }

      const teamIds = teamMemberships.data?.map((membership: any) => membership.team_id).filter(Boolean) || [];
      
      if (teamIds.length > 0) {
        const projectAssignments = await supabaseClient.getTeamProjectAssignments(teamIds);
        if (projectAssignments.error) {
          console.error('Error loading project assignments:', projectAssignments.error);
          return;
        }

        const projectIds = projectAssignments.data?.map((assignment: any) => assignment.project_id) || [];
        
        if (projectIds.length > 0) {
          const projectsResponse = await supabaseClient.getProjects({
            filters: { id: projectIds },
            order: { column: 'name', ascending: true }
          });

          if (!projectsResponse.error) {
            setProjects(projectsResponse.data || []);
          }
        }
      } else {
        // If user is not in any teams, load all projects (or user's projects if they have any)
        const projectsResponse = await supabaseClient.getProjects({
          order: { column: 'name', ascending: true }
        });

        if (!projectsResponse.error) {
          setProjects(projectsResponse.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      if (!currentUser?.email) return;

      // Get user's team memberships
      const teamMemberships = await supabaseClient.getTeamMemberships(currentUser.email);
      if (teamMemberships.error) {
        console.error('Error loading team memberships:', teamMemberships.error);
        return;
      }

      const teamIds = teamMemberships.data?.map((membership: any) => membership.team_id).filter(Boolean) || [];
      
      if (teamIds.length > 0) {
        const teamMembersResponse = await supabaseClient.getTeamMembersByTeams(teamIds);
        if (!teamMembersResponse.error) {
          // Extract user data from the team members response
          const users = teamMembersResponse.data?.map((member: any) => member.users).filter(Boolean) || [];
          setTeamMembers(users);
        }
      } else {
        // If user is not in any teams, just show the current user
        const currentUserResponse = await supabaseClient.get('users', {
          select: '*',
          filters: { email: currentUser.email }
        });
        
        if (!currentUserResponse.error && currentUserResponse.data) {
          setTeamMembers(currentUserResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleView = (log: WorkLogWithProject) => {
    setViewingLog(log);
    setShowViewModal(true);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
    setLoading(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setLoading(true);
  };

  const clearFilters = () => {
    setFilters({
      user: '',
      project: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    setLoading(true);
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setFilters({
      user: '',
      project: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
    setLoading(true);
    loadTeamWorkReports();
    toast.success('Data refreshed');
  };

  const handleExport = () => {
    const csvContent = [
      ['Project', 'Date', 'Employee', 'Logged Time', 'Ticket ID', 'Task Detail'],
      ...filteredWorkLogs.map(log => [
        log.project?.name || 'N/A',
        formatDateTime(log.start_time),
        log.user_email,
        formatDuration(log.logged_duration_seconds),
        log.ticket_id,
        log.task_detail,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter work logs based on search term
  const filteredWorkLogs = workLogs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.ticket_id.toLowerCase().includes(searchLower) ||
      log.task_detail.toLowerCase().includes(searchLower) ||
      log.user_email.toLowerCase().includes(searchLower) ||
      log.project?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <p className="ml-3 text-neutral-600 dark:text-neutral-400">
          {authLoading ? 'Checking authentication...' : 'Loading work reports...'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Work Report</h1>
          <p className="text-neutral-600 dark:text-neutral-400">View work reports from all team members</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search work logs by ticket ID, task detail, or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-modern pl-10 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              ×
            </button>
          )}
          {searchTerm && loading && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <div className="loading-spinner h-4 w-4"></div>
            </div>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {loading ? (
              <span>Searching...</span>
            ) : (
              <span>
                Found {filteredWorkLogs.length} work log{filteredWorkLogs.length !== 1 ? 's' : ''} 
                {filteredWorkLogs.length !== totalCount && ` of ${totalCount} total`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Employee
              </label>
              <select
                value={filters.user}
                onChange={(e) => handleFilterChange('user', e.target.value)}
                className="input-modern"
              >
                <option value="">All Employees</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.email}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Project
              </label>
              <select
                value={filters.project}
                onChange={(e) => handleFilterChange('project', e.target.value)}
                className="input-modern"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input-modern"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input-modern"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="btn-secondary text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Work Reports Table */}
      <div className="table-modern overflow-hidden">
        {(searchTerm || Object.values(filters).some(v => v !== '')) && (
          <div className="bg-neutral-50 dark:bg-neutral-700 px-6 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {searchTerm && (
                  <span className="mr-4">
                    <span className="font-medium">Search:</span> "{searchTerm}"
                  </span>
                )}
                {Object.values(filters).some(v => v !== '') && (
                  <span>
                    <span className="font-medium">Filters applied:</span>
                    {filters.user && <span className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded text-xs">User: {filters.user}</span>}
                    {filters.project && <span className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded text-xs">Project: {projects.find(p => p.id === filters.project)?.name || filters.project}</span>}
                    {filters.dateFrom && <span className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded text-xs">From: {filters.dateFrom}</span>}
                    {filters.dateTo && <span className="ml-2 px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded text-xs">To: {filters.dateTo}</span>}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Logged Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
            <tr>
              <td colSpan={5} className="px-6 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-600">
                {loading ? (
                  <span>Loading work logs...</span>
                ) : (
                  <span>
                    Showing {filteredWorkLogs.length} of {totalCount} work logs
                    {searchTerm && ` matching "${searchTerm}"`}
                    {filteredWorkLogs.length > 0 && (
                      <span className="ml-4">
                        • Total time: {formatDuration(filteredWorkLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0))}
                      </span>
                    )}
                  </span>
                )}
              </td>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
            {filteredWorkLogs.length > 0 ? (
              filteredWorkLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">
                      {log.project?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(log.start_time)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900 dark:text-white">
                          {log.user_email}
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                          Employee
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900 dark:text-white">
                      {formatDuration(log.logged_duration_seconds)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleView(log)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-neutral-500 dark:text-neutral-400">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner h-8 w-8"></div>
                        <span className="ml-2">Loading work logs...</span>
                      </div>
                    ) : searchTerm ? (
                      <div>
                        <p className="text-lg font-medium">No work logs found</p>
                        <p className="text-sm">Try adjusting your search terms or filters</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium">No work logs available</p>
                        <p className="text-sm">Work logs will appear here once team members start logging their time</p>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Work Report Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Project:</label>
                  <p className="text-neutral-900 dark:text-white">{viewingLog.project?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Employee:</label>
                  <p className="text-neutral-900 dark:text-white">{viewingLog.user_email}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Ticket ID:</label>
                  <p className="text-neutral-900 dark:text-white">{viewingLog.ticket_id}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Date:</label>
                  <p className="text-neutral-900 dark:text-white">{formatDateTime(viewingLog.start_time)}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Start Time:</label>
                  <p className="text-neutral-900 dark:text-white">{formatDateTime(viewingLog.start_time)}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">End Time:</label>
                  <p className="text-neutral-900 dark:text-white">{formatDateTime(viewingLog.end_time)}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Duration:</label>
                  <p className="text-neutral-900 dark:text-white">{formatDuration(viewingLog.logged_duration_seconds)}</p>
                </div>
                <div>
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Break Duration:</label>
                  <p className="text-neutral-900 dark:text-white">{formatDuration(viewingLog.total_pause_duration_seconds)}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-neutral-700 dark:text-neutral-300">Task Detail:</label>
                  <p className="text-neutral-900 dark:text-white mt-1">{viewingLog.task_detail}</p>
                </div>
                {Object.keys(viewingLog.dynamic_category_selections || {}).length > 0 && (
                  <div className="col-span-2">
                    <label className="font-medium text-neutral-700 dark:text-neutral-300">Categories Selected:</label>
                    <div className="mt-1">
                      {Object.entries(viewingLog.dynamic_category_selections || {}).map(([key, value]) => (
                        <div key={key} className="text-neutral-900 dark:text-white">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
