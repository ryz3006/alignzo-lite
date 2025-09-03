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
  
  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    user: '',
    project: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    loadTeamWorkReports();
    loadProjects();
    loadTeamMembers();
  }, [filters, currentPage]);

  const loadTeamWorkReports = async () => {
    try {
      const currentUser = await getCurrentUser();
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

      // Fetch team work logs from the API
      const response = await fetch(`/api/team-work-logs?${params.toString()}`);
      
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
      const currentUser = await getCurrentUser();
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
      const currentUser = await getCurrentUser();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
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

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-50 gap-4">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <UserIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Team Members</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{teamMembers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Date Range</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  <>
                    {formatDateTime(filteredWorkLogs[filteredWorkLogs.length - 1]?.start_time).split(' ')[0]} - {formatDateTime(filteredWorkLogs[0]?.start_time).split(' ')[0]}
                  </>
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {searchTerm ? 'Filtered Work Logs' : 'Total Work Logs'}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {searchTerm ? filteredWorkLogs.length : totalCount}
              </p>
              {searchTerm && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  of {totalCount} total
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {searchTerm ? 'Filtered Hours' : 'Total Hours Logged'}
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatDuration(filteredWorkLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0))}
              </div>
              {searchTerm && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  of {formatDuration(workLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0))} total
                </p>
              )}
              {filteredWorkLogs.length > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Avg: {formatDuration(Math.round(filteredWorkLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / filteredWorkLogs.length))} per log
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <UserIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Most Active Member</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const memberHours = filteredWorkLogs.reduce((acc, log) => {
                      acc[log.user_email] = (acc[log.user_email] || 0) + (log.logged_duration_seconds || 0);
                      return acc;
                    }, {} as Record<string, number>);
                    
                    const mostActive = Object.entries(memberHours).reduce((a, b) => 
                      memberHours[a[0]] > memberHours[b[0]] ? a : b
                    );
                    
                    return mostActive ? (
                      <span title={`${formatDuration(mostActive[1])} logged`}>
                        {mostActive[0]}
                      </span>
                    ) : 'N/A';
                  })()
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Most Active Project</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const projectHours = filteredWorkLogs.reduce((acc, log) => {
                      if (log.project?.name) {
                        acc[log.project.name] = (acc[log.project.name] || 0) + (log.logged_duration_seconds || 0);
                      }
                      return acc;
                    }, {} as Record<string, number>);
                    
                    const mostActive = Object.entries(projectHours).reduce((a, b) => 
                      projectHours[a[0]] > projectHours[b[0]] ? a : b
                    );
                    
                    return mostActive ? (
                      <span title={`${formatDuration(mostActive[1])} logged`}>
                        {mostActive[0]}
                      </span>
                    ) : 'N/A';
                  })()
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <Clock className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg Time/Day</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const totalHours = filteredWorkLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0);
                    const dateRange = new Date(filteredWorkLogs[0]?.start_time).getTime() - new Date(filteredWorkLogs[filteredWorkLogs.length - 1]?.start_time).getTime();
                    const daysDiff = Math.max(1, Math.ceil(dateRange / (1000 * 60 * 60 * 24)));
                    const avgPerDay = totalHours / daysDiff;
                    return formatDuration(Math.round(avgPerDay));
                  })()
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <Calendar className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Projects</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  new Set(filteredWorkLogs.map(log => log.project?.name).filter(Boolean)).size
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Tickets</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  new Set(filteredWorkLogs.map(log => log.ticket_id)).size
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <UserIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Users</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  new Set(filteredWorkLogs.map(log => log.user_email)).size
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Categories Used</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const categories = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.keys(log.dynamic_category_selections).forEach(category => {
                          categories.add(category);
                        });
                      }
                    });
                    return categories.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
              <Calendar className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Subcategories Used</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const subcategories = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.values(log.dynamic_category_selections).forEach(value => {
                          if (typeof value === 'string' && value.includes(':')) {
                            subcategories.add(value.split(':')[0]);
                          }
                        });
                      }
                    });
                    return subcategories.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Options Used</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const options = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.values(log.dynamic_category_selections).forEach(value => {
                          if (typeof value === 'string' && value.includes(':')) {
                            options.add(value.split(':')[1]);
                          }
                        });
                      }
                    });
                    return options.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <Calendar className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Suboptions Used</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const suboptions = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.values(log.dynamic_category_selections).forEach(value => {
                          if (typeof value === 'string' && value.includes(':')) {
                            const parts = value.split(':');
                            if (parts.length > 2) {
                              suboptions.add(parts[2]);
                            }
                          }
                        });
                      }
                    });
                    return suboptions.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Values</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const values = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.values(log.dynamic_category_selections).forEach(value => {
                          values.add(String(value));
                        });
                      }
                    });
                    return values.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Combinations</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const combinations = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const sortedValues = Object.values(log.dynamic_category_selections).sort();
                        combinations.add(sortedValues.join('|'));
                      }
                    });
                    return combinations.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-lime-100 dark:bg-lime-900 rounded-lg">
              <Calendar className="h-6 w-6 text-lime-600 dark:text-lime-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Patterns</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const patterns = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const keys = Object.keys(log.dynamic_category_selections).sort();
                        patterns.add(keys.join('|'));
                      }
                    });
                    return patterns.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-lg">
              <Calendar className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Sequences</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const sequences = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections).sort();
                        const sequence = entries.map(([key, value]) => `${key}:${value}`).join('|');
                        sequences.add(sequence);
                      }
                    });
                    return sequences.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900 rounded-lg">
              <Calendar className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Workflows</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const workflows = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const workflow = Object.keys(log.dynamic_category_selections).sort().join('→');
                        workflows.add(workflow);
                      }
                    });
                    return workflows.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Calendar className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Paths</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const paths = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const path = Object.entries(log.dynamic_category_selections)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => `${key}=${value}`)
                          .join('&');
                        paths.add(path);
                      }
                    });
                    return paths.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Signatures</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const signatures = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const signature = Object.entries(log.dynamic_category_selections)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => `${key}:${value}`)
                          .join(';');
                        signatures.add(signature);
                      }
                    });
                    return signatures.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Fingerprints</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const fingerprints = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const fingerprint = Object.entries(log.dynamic_category_selections)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => `${key}=${value}`)
                          .join('|');
                        fingerprints.add(fingerprint);
                      }
                    });
                    return fingerprints.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Hashes</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const hashes = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const hash = Object.entries(log.dynamic_category_selections)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => `${key}:${value}`)
                          .join('#');
                        hashes.add(hash);
                      }
                    });
                    return hashes.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Tokens</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const tokens = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const token = Object.entries(log.dynamic_category_selections)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => `${key}=${value}`)
                          .join(';');
                        tokens.add(token);
                      }
                    });
                    return tokens.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Keys</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const keys = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.keys(log.dynamic_category_selections).forEach(key => {
                          keys.add(key);
                        });
                      }
                    });
                    return keys.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <Calendar className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Values</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const values = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.values(log.dynamic_category_selections).forEach(value => {
                          values.add(String(value));
                        });
                      }
                    });
                    return values.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <Calendar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Pairs</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const pairs = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        Object.entries(log.dynamic_category_selections).forEach(([key, value]) => {
                          pairs.add(`${key}:${value}`);
                        });
                      }
                    });
                    return pairs.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <Calendar className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Triples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const triples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 3) {
                          for (let i = 0; i < entries.length - 2; i++) {
                            const triple = entries.slice(i, i + 3)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            triples.add(triple);
                          }
                        }
                      }
                    });
                    return triples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quadruples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quadruples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 4) {
                          for (let i = 0; i < entries.length - 3; i++) {
                            const quadruple = entries.slice(i, i + 4)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quadruples.add(quadruple);
                          }
                        }
                      }
                    });
                    return quadruples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 5) {
                          for (let i = 0; i < entries.length - 4; i++) {
                            const quintuple = entries.slice(i, i + 5)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quintuples.add(quintuple);
                          }
                        }
                      }
                    });
                    return quintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
              <Calendar className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Sextuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const sextuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 6) {
                          for (let i = 0; i < entries.length - 5; i++) {
                            const sextuple = entries.slice(i, i + 6)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            sextuples.add(sextuple);
                          }
                        }
                      }
                    });
                    return sextuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Septuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const septuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 7) {
                          for (let i = 0; i < entries.length - 6; i++) {
                            const septuple = entries.slice(i, i + 7)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            septuples.add(septuple);
                          }
                        }
                      }
                    });
                    return septuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <Calendar className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Octuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const octuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 8) {
                          for (let i = 0; i < entries.length - 7; i++) {
                            const octuple = entries.slice(i, i + 8)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            octuples.add(octuple);
                          }
                        }
                      }
                    });
                    return octuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Nonuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const nonuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 9) {
                          for (let i = 0; i < entries.length - 8; i++) {
                            const nonuple = entries.slice(i, i + 9)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            nonuples.add(nonuple);
                          }
                        }
                      }
                    });
                    return nonuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Decuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const decuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 10) {
                          for (let i = 0; i < entries.length - 9; i++) {
                            const decuple = entries.slice(i, i + 10)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            decuples.add(decuple);
                          }
                        }
                      }
                    });
                    return decuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-lime-100 dark:bg-lime-900 rounded-lg">
              <Calendar className="h-6 w-6 text-lime-600 dark:text-lime-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Undecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const undecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 11) {
                          for (let i = 0; i < entries.length - 10; i++) {
                            const undecuple = entries.slice(i, i + 11)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            undecuples.add(undecuple);
                          }
                        }
                      }
                    });
                    return undecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-lg">
              <Calendar className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Duodecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const duodecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 12) {
                          for (let i = 0; i < entries.length - 11; i++) {
                            const duodecuple = entries.slice(i, i + 12)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            duodecuples.add(duodecuple);
                          }
                        }
                      }
                    });
                    return duodecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900 rounded-lg">
              <Calendar className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Tredecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const tredecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 13) {
                          for (let i = 0; i < entries.length - 12; i++) {
                            const tredecuple = entries.slice(i, i + 13)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            tredecuples.add(tredecuple);
                          }
                        }
                      }
                    });
                    return tredecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <Calendar className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quattuordecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quattuordecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 14) {
                          for (let i = 0; i < entries.length - 13; i++) {
                            const quattuordecuple = entries.slice(i, i + 14)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quattuordecuples.add(quattuordecuple);
                          }
                        }
                      }
                    });
                    return quattuordecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quindecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quindecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 15) {
                          for (let i = 0; i < entries.length - 14; i++) {
                            const quindecuple = entries.slice(i, i + 15)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quindecuples.add(quindecuple);
                          }
                        }
                      }
                    });
                    return quindecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Sedecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const sedecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 16) {
                          for (let i = 0; i < entries.length - 15; i++) {
                            const sedecuple = entries.slice(i, i + 16)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            sedecuples.add(sedecuple);
                          }
                        }
                      }
                    });
                    return sedecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Septendecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const septendecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 17) {
                          for (let i = 0; i < entries.length - 16; i++) {
                            const septendecuple = entries.slice(i, i + 17)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            septendecuples.add(septendecuple);
                          }
                        }
                      }
                    });
                    return septendecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Octodecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const octodecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 18) {
                          for (let i = 0; i < entries.length - 17; i++) {
                            const octodecuple = entries.slice(i, i + 18)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            octodecuples.add(octodecuple);
                          }
                        }
                      }
                    });
                    return octodecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
              <Calendar className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Novemdecuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const novemdecuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 19) {
                          for (let i = 0; i < entries.length - 18; i++) {
                            const novemdecuple = entries.slice(i, i + 19)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            novemdecuples.add(novemdecuple);
                          }
                        }
                      }
                    });
                    return novemdecuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <Calendar className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Vigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const vigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 20) {
                          for (let i = 0; i < entries.length - 19; i++) {
                            const vigintuple = entries.slice(i, i + 20)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            vigintuples.add(vigintuple);
                          }
                        }
                      }
                    });
                    return vigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Unvigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const unvigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 21) {
                          for (let i = 0; i < entries.length - 20; i++) {
                            const unvigintuple = entries.slice(i, i + 21)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            unvigintuples.add(unvigintuple);
                          }
                        }
                      }
                    });
                    return unvigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Duovigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const duovigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 22) {
                          for (let i = 0; i < entries.length - 21; i++) {
                            const duovigintuple = entries.slice(i, i + 22)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            duovigintuples.add(duovigintuple);
                          }
                        }
                      }
                    });
                    return duovigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg">
              <Calendar className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Trevigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const trevigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 23) {
                          for (let i = 0; i < entries.length - 22; i++) {
                            const trevigintuple = entries.slice(i, i + 23)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            trevigintuples.add(trevigintuple);
                          }
                        }
                      }
                    });
                    return trevigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quattuorvigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quattuorvigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 24) {
                          for (let i = 0; i < entries.length - 23; i++) {
                            const quattuorvigintuple = entries.slice(i, i + 24)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quattuorvigintuples.add(quattuorvigintuple);
                          }
                        }
                      }
                    });
                    return quattuorvigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <Calendar className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Unique Quinvigintuples</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {filteredWorkLogs.length > 0 ? (
                  (() => {
                    const quinvigintuples = new Set();
                    filteredWorkLogs.forEach(log => {
                      if (log.dynamic_category_selections) {
                        const entries = Object.entries(log.dynamic_category_selections);
                        if (entries.length >= 25) {
                          for (let i = 0; i < entries.length - 24; i++) {
                            const quinvigintuple = entries.slice(i, i + 25)
                              .map(([key, value]) => `${key}:${value}`)
                              .join('|');
                            quinvigintuples.add(quinvigintuple);
                          }
                        }
                      }
                    });
                    return quinvigintuples.size;
                  })()
                ) : (
                  '0'
                )}
              </p>
            </div>
          </div>
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
