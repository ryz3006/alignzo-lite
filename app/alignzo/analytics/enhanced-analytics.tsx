'use client';

import { useEffect, useState, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getJiraCredentials } from '@/lib/jira';
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

export default function EnhancedAnalytics() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workload');
  const [jiraEnabled, setJiraEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
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

      // Check JIRA integration
      const credentials = await getJiraCredentials(currentUser.email);
      if (credentials) {
        setJiraEnabled(true);
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

      setAvailableTeams(teams.map(t => t.name));
      setAvailableProjects(projects.map(p => p.name));
      setAvailableUsers(users.map(u => u.email));
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);
      // Load analytics data based on filters
      console.log('Loading analytics data with filters:', appliedFilters);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setRefreshing(false);
    }
  };

  const loadTeams = async () => {
    let query = supabase
        .from('teams')
        .select(`
          *,
          team_members(*)
        `);

    if (appliedFilters.selectedTeams.length > 0) {
      query = query.in('name', appliedFilters.selectedTeams);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const loadProjects = async () => {
    let query = supabase
      .from('projects')
      .select('*');

    if (appliedFilters.selectedProjects.length > 0) {
      query = query.in('name', appliedFilters.selectedProjects);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    return data || [];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IT Operations Analytics</h1>
          <p className="text-gray-600">Comprehensive workload and operations insights for Telecom Product Operations</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
          </div>
          <button
            onClick={handleApplyFilters}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative filter-dropdown">
            <label className="block text-sm font-medium text-gray-700 mb-1">Teams</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, showTeamDropdown: !prev.showTeamDropdown }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {filters.selectedTeams.length === 0 
                    ? 'All Teams' 
                    : filters.selectedTeams.length === 1 
                      ? filters.selectedTeams[0] 
                      : `${filters.selectedTeams.length} teams selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{team}</span>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
              >
                <span className="text-sm text-gray-700">
                  {filters.selectedProjects.length === 0 
                    ? 'All Projects' 
                    : filters.selectedProjects.length === 1 
                      ? filters.selectedProjects[0] 
                      : `${filters.selectedProjects.length} projects selected`}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{project}</span>
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
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'workload', label: 'Workload & Utilization', icon: Users },
              { id: 'project-health', label: 'Project Health & FTE', icon: Target },
              { id: 'jira-tickets', label: 'Tickets & Issues', icon: FileText, requiresJira: true },
              { id: 'operational-efficiency', label: 'Operational Efficiency', icon: Zap },
              { id: 'team-insights', label: 'Team Insights', icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.requiresJira && !jiraEnabled}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.requiresJira && !jiraEnabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.requiresJira && !jiraEnabled && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1 rounded">JIRA</span>
                )}
              </button>
            ))}
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
