'use client';

import { useEffect, useState, useRef } from 'react';
import { getCurrentUser, getUserAccessControls } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { 
  Users, 
  Filter,
  Target,
  Clock,
  FileText,
  Zap,
  Activity,
  Check,
  RefreshCw,
  Settings,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
// Import actual working components
import WorkloadTab from './components/WorkloadTab';
import ProjectHealthTab from './components/ProjectHealthTab';
import JiraTicketsTab from './components/JiraTicketsTab';
import OperationalEfficiencyTab from './components/OperationalEfficiencyTab';
import TeamInsightsTab from './components/TeamInsightsTab';
import RemedyDashboardTab from './components/RemedyDashboardTab';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  selectedTeams: string[];
  selectedProjects: string[];
  selectedUsers: string[];
  showTeamDropdown: boolean;
  showProjectDropdown: boolean;
  showUserDropdown: boolean;
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workload');
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      end: new Date().toISOString().split('T')[0] // Today
    },
    selectedTeams: [],
    selectedProjects: [],
    selectedUsers: [],
    showTeamDropdown: false,
    showProjectDropdown: false,
    showUserDropdown: false
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(filters);

  // Filter options
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  // Chart refs for download
  const chartRefs = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    initializeAnalytics();
  }, []);

  // Set default active tab when user access is loaded
  useEffect(() => {
    if (userAccess) {
      const availableTabs = [
        { id: 'workload', accessKey: 'access_analytics_workload' },
        { id: 'project-health', accessKey: 'access_analytics_project_health' },
        { id: 'jira-tickets', accessKey: 'access_analytics_tickets' },
        { id: 'operational-efficiency', accessKey: 'access_analytics_operational' },
        { id: 'team-insights', accessKey: 'access_analytics_team_insights' },
        { id: 'remedy-dashboard', accessKey: 'access_analytics_remedy' }
      ];
      
      const firstAvailableTab = availableTabs.find(tab => userAccess[tab.accessKey]);
      if (firstAvailableTab) {
        setActiveTab(firstAvailableTab.id);
      }
    }
  }, [userAccess]);

  useEffect(() => {
    if (appliedFilters) {
      loadAnalyticsData();
    }
  }, [appliedFilters]);

  const initializeAnalytics = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      // Get user access controls
      const accessControls = await getUserAccessControls(currentUser.email);
      setUserAccess(accessControls);

      // Check JIRA integration
      try {
        const response = await supabaseClient.get('user_integrations', {
          select: 'id,is_verified',
          filters: { 
            user_email: currentUser.email,
            integration_type: 'jira'
          }
        });
        
        if (response.data && response.data.length > 0) {
          // Check if any integration is verified
          const hasVerifiedIntegration = response.data.some((integration: any) => integration.is_verified);
          setJiraEnabled(hasVerifiedIntegration);
        }
      } catch (error) {
        console.error('Error checking JIRA integration:', error);
        // Don't set jiraEnabled to true if there's an error
      }

      // Load filter options
      await loadFilterOptions();
      
    } catch (error) {
      console.error('Error initializing analytics:', error);
      toast.error('Failed to initialize analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [teams, projects, users] = await Promise.all([
        loadTeams(),
        loadProjects(),
        loadUsers()
      ]);

      setAvailableTeams(teams.map((t: any) => t.name));
      setAvailableProjects(projects.map((p: any) => p.name));
      setAvailableUsers(users.map((u: any) => u.email));
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);
      // Load analytics data based on filters
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setRefreshing(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await supabaseClient.get('teams', {
        select: '*,team_members(*)',
        filters: appliedFilters.selectedTeams.length > 0 ? {
          name: appliedFilters.selectedTeams
        } : undefined
      });

      if (response.error) {
        console.error('Error loading teams:', response.error);
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (error) {
      console.error('Error loading teams:', error);
      return [];
    }
  };

  const loadProjects = async () => {
    try {
      const response = await supabaseClient.get('projects', {
        select: '*',
        filters: appliedFilters.selectedProjects.length > 0 ? {
          name: appliedFilters.selectedProjects
        } : undefined
      });

      if (response.error) {
        console.error('Error loading projects:', response.error);
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  };

  const loadUsers = async () => {
    try {
      const response = await supabaseClient.getUsers();

      if (response.error) {
        console.error('Error loading users:', response.error);
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const downloadChartAsImage = (chartId: string, filename: string) => {
    const chartElement = chartRefs.current[chartId];
    if (!chartElement) {
      toast.error('Chart not found for download');
      return;
    }

    // For now, show a placeholder message
    toast.success(`Chart download functionality for ${filename} coming soon`);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.filter-dropdown')) {
        setFilters(prev => ({
          ...prev,
          showTeamDropdown: false,
          showProjectDropdown: false,
          showUserDropdown: false
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Check if user has access to any analytics sub-modules
  const hasAnyAnalyticsAccess = userAccess && (
    userAccess.access_analytics_workload ||
    userAccess.access_analytics_project_health ||
    userAccess.access_analytics_tickets ||
    userAccess.access_analytics_operational ||
    userAccess.access_analytics_team_insights ||
    userAccess.access_analytics_remedy
  );

  if (!hasAnyAnalyticsAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Access</h3>
          <p className="text-gray-600">
            You don't have access to any analytics modules. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">IT Operations Analytics</h1>
          <p className="text-gray-600 text-sm sm:text-base">Comprehensive workload and operations insights for Telecom Product Operations</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
          </div>
          <button
            onClick={handleApplyFilters}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-700 flex items-center text-sm"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="relative filter-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-1">Teams</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, showTeamDropdown: !prev.showTeamDropdown }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center text-sm"
              >
                <span className="text-sm text-gray-700 truncate">
                  {filters.selectedTeams.length === 0 
                    ? 'All Teams' 
                    : filters.selectedTeams.length === 1 
                      ? filters.selectedTeams[0] 
                      : `${filters.selectedTeams.length} teams selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filters.showTeamDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2">
                    {availableTeams.map(team => (
                      <label key={team} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                        <input
                          type="checkbox"
                          checked={filters.selectedTeams.includes(team)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, selectedTeams: [...prev.selectedTeams, team] }));
                            } else {
                              setFilters(prev => ({ ...prev, selectedTeams: prev.selectedTeams.filter(t => t !== team) }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 truncate">{team}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative filter-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-1">Projects</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, showProjectDropdown: !prev.showProjectDropdown }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center text-sm"
              >
                <span className="text-sm text-gray-700 truncate">
                  {filters.selectedProjects.length === 0 
                    ? 'All Projects' 
                    : filters.selectedProjects.length === 1 
                      ? filters.selectedProjects[0] 
                      : `${filters.selectedProjects.length} projects selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filters.showProjectDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2">
                    {availableProjects.map(project => (
                      <label key={project} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                        <input
                          type="checkbox"
                          checked={filters.selectedProjects.includes(project)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, selectedProjects: [...prev.selectedProjects, project] }));
                            } else {
                              setFilters(prev => ({ ...prev, selectedProjects: prev.selectedProjects.filter(p => p !== project) }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 truncate">{project}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative filter-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-1">Users</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, showUserDropdown: !prev.showUserDropdown }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center text-sm"
              >
                <span className="text-sm text-gray-700 truncate">
                  {filters.selectedUsers.length === 0 
                    ? 'All Users' 
                    : filters.selectedUsers.length === 1 
                      ? filters.selectedUsers[0] 
                      : `${filters.selectedUsers.length} users selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filters.showUserDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2">
                    {availableUsers.map(user => (
                      <label key={user} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                        <input
                          type="checkbox"
                          checked={filters.selectedUsers.includes(user)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, selectedUsers: [...prev.selectedUsers, user] }));
                            } else {
                              setFilters(prev => ({ ...prev, selectedUsers: prev.selectedUsers.filter(u => u !== user) }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 truncate">{user}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            <div className="flex space-x-8 px-6 min-w-full">
              {[
                { 
                  id: 'workload', 
                  label: 'Workload & Utilization', 
                  icon: Users,
                  accessKey: 'access_analytics_workload'
                },
                { 
                  id: 'project-health', 
                  label: 'Project Health & FTE', 
                  icon: Target,
                  accessKey: 'access_analytics_project_health'
                },
                { 
                  id: 'jira-tickets', 
                  label: 'Tickets & Issues', 
                  icon: FileText, 
                  requiresJira: true,
                  accessKey: 'access_analytics_tickets'
                },
                { 
                  id: 'operational-efficiency', 
                  label: 'Operational Efficiency', 
                  icon: Zap,
                  accessKey: 'access_analytics_operational'
                },
                { 
                  id: 'team-insights', 
                  label: 'Team Insights', 
                  icon: Activity,
                  accessKey: 'access_analytics_team_insights'
                },
                { 
                  id: 'remedy-dashboard', 
                  label: 'Remedy Dashboard', 
                  icon: AlertTriangle,
                  accessKey: 'access_analytics_remedy'
                }
              ]
              .filter(tab => {
                // Filter tabs based on user access controls
                if (!userAccess) return false;
                return userAccess[tab.accessKey];
              })
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={tab.requiresJira && !jiraEnabled}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.requiresJira && !jiraEnabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.requiresJira && !jiraEnabled && (
                    <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1 rounded flex-shrink-0">JIRA</span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'workload' && (
            <WorkloadTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
          {activeTab === 'project-health' && (
            <ProjectHealthTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
          {activeTab === 'jira-tickets' && jiraEnabled && (
            <JiraTicketsTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
          {activeTab === 'jira-tickets' && !jiraEnabled && (
            <JiraSetupPrompt />
          )}
          {activeTab === 'operational-efficiency' && (
            <OperationalEfficiencyTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
          {activeTab === 'team-insights' && (
            <TeamInsightsTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
          {activeTab === 'remedy-dashboard' && (
            <RemedyDashboardTab filters={appliedFilters} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />
          )}
        </div>
      </div>
    </div>
  );
}

function JiraSetupPrompt() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-yellow-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">JIRA Integration Required</h3>
      <p className="text-gray-600 mb-6">
        To view JIRA ticket analytics, you need to set up your JIRA integration first.
      </p>
      <Link
        href="/alignzo/integrations"
        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        <Settings className="w-4 h-4 mr-2" />
        Set Up JIRA Integration
      </Link>
    </div>
  );
}
