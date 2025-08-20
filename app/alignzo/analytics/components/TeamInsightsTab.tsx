'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials, searchAllJiraIssues, JiraIssue } from '@/lib/jira';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Settings,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Target,
  Zap,
  Activity,
  BarChart3,
  Gauge,
  Award,
  AlertTriangle,
  Calendar,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface TeamInsightsTabProps {
  filters: {
    selectedProjects?: string[];
    selectedUsers?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  chartRefs: React.MutableRefObject<{ [key: string]: any }>;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

interface TeamInsights {
  teamOverview: {
    totalMembers: number;
    activeMembers: number;
    overloadedMembers: number;
    underutilizedMembers: number;
    averageUtilization: number;
  };
  projectLoadHeatmap: Array<{
    project: string;
    user: string;
    hours: number;
    intensity: number;
  }>;
  workloadTrends: Array<{
    date: string;
    totalHours: number;
    averageUtilization: number;
    memberCount: number;
  }>;
  capacityForecast: Array<{
    period: string;
    projectedHours: number;
    capacityGap: number;
    recommendedHiring: number;
  }>;
  memberPerformance: Array<{
    user: string;
    utilization: number;
    projectCount: number;
    totalHours: number;
    status: 'Optimal' | 'Overloaded' | 'Underutilized';
  }>;
  projectAllocation: Array<{
    project: string;
    totalHours: number;
    memberCount: number;
    averageHoursPerMember: number;
    allocationEfficiency: number;
  }>;
  teamHealth: {
    workloadBalance: number;
    skillDistribution: number;
    collaborationIndex: number;
    overallHealth: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function TeamInsightsTab({ filters, chartRefs, downloadChartAsImage }: TeamInsightsTabProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jiraCredentials, setJiraCredentials] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [teamInsights, setTeamInsights] = useState<TeamInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTeamInsightsData();
  }, [filters]);

  const loadTeamInsightsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Load work logs
      await loadWorkLogs(currentUser.email);
      
      // Load JIRA data if available
      const credentials = await getJiraCredentials(currentUser.email);
      if (credentials) {
        setJiraCredentials(credentials);
        await loadJiraData(credentials);
      }

      calculateTeamInsights();
    } catch (error) {
      console.error('Error loading team insights data:', error);
      setError('Failed to load team insights data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkLogs = async (userEmail: string) => {
    try {
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          projects (
            id,
            name,
            product,
            country
          )
        `);

      // Apply user filter
      if (filters?.selectedUsers && filters.selectedUsers.length > 0) {
        query = query.in('user_email', filters.selectedUsers);
      } else {
        // If no specific users selected, load for current user
        query = query.eq('user_email', userEmail);
      }

      // Apply filters
      if (filters?.dateRange) {
        query = query
          .gte('start_time', filters.dateRange.start)
          .lte('end_time', filters.dateRange.end);
      }

      if (filters?.selectedProjects && filters.selectedProjects.length > 0) {
        query = query.in('project_id', filters.selectedProjects);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading work logs:', error);
        return;
      }

      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error loading work logs:', error);
    }
  };

  const loadJiraData = async (credentials: any) => {
    try {
      // First, get all available JIRA project mappings for the user
      const allProjectMappings = await getAllJiraProjectMappings();
      
      if (allProjectMappings.length === 0) {
        setJiraIssues([]);
        return;
      }

      let jql = 'project IS NOT EMPTY';

      // Filter by mapped projects only
      const availableProjectKeys = allProjectMappings.map(mapping => mapping.jira_project_key);
      jql = `project in ("${availableProjectKeys.join('", "')}")`;

      // Further filter by selected projects if specified
      if (filters?.selectedProjects && filters.selectedProjects.length > 0) {
        const selectedProjectKeys = await getJiraProjectKeysForDashboardProjects(filters.selectedProjects);
        if (selectedProjectKeys.length > 0) {
          jql = `project in ("${selectedProjectKeys.join('", "')}")`;
        } else {
          setJiraIssues([]);
          return;
        }
      }

      // Add user filter if users are selected
      if (filters?.selectedUsers && filters.selectedUsers.length > 0) {
        const jiraUserNames = await getJiraUserNamesForDashboardUsers(filters.selectedUsers);
        if (jiraUserNames.length > 0) {
          jql += ` AND assignee in ("${jiraUserNames.join('", "')}")`;
        } else {
          setJiraIssues([]);
          return;
        }
      }

      // Add date range filter if provided
      if (filters?.dateRange) {
        const startDate = filters.dateRange.start;
        const endDate = filters.dateRange.end;
        jql += ` AND updated >= "${startDate}" AND updated <= "${endDate}"`;
      }

      jql += ' ORDER BY updated DESC';

      const result = await searchAllJiraIssues(credentials, jql);
      
      if (result.success) {
        setJiraIssues(result.issues || []);
      }
    } catch (error) {
      console.error('Error loading JIRA data:', error);
    }
  };

  const getAllJiraProjectMappings = async (): Promise<any[]> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return [];

      const response = await fetch(`/api/integrations/jira/project-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        return data.mappings || [];
      }
    } catch (error) {
      console.error('Failed to get all JIRA project mappings:', error);
    }
    return [];
  };

  const getJiraProjectKeysForDashboardProjects = async (dashboardProjectNames: string[]): Promise<string[]> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return [];

      const response = await fetch(`/api/integrations/jira/project-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const projectMappings = data.mappings || [];
        
        const jiraProjectKeys = projectMappings
          .filter((mapping: any) => {
            return dashboardProjectNames.includes(mapping.project?.name || '');
          })
          .map((mapping: any) => mapping.jira_project_key);
        
        return jiraProjectKeys;
      }
    } catch (error) {
      console.error('Failed to get JIRA project keys:', error);
    }
    return [];
  };

  const getJiraUserNamesForDashboardUsers = async (dashboardUserEmails: string[]): Promise<string[]> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return [];

      const response = await fetch(`/api/integrations/jira/user-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const userMappings = data.mappings || [];
        
        const jiraUserNames = userMappings
          .filter((mapping: any) => {
            return dashboardUserEmails.includes(mapping.user?.email || '');
          })
          .map((mapping: any) => mapping.jira_username || mapping.jira_display_name);
        
        return jiraUserNames.filter(Boolean); // Remove any undefined/null values
      }
    } catch (error) {
      console.error('Failed to get JIRA user names:', error);
    }
    return [];
  };

  const calculateTeamInsights = () => {
    // Calculate working days in the period
    const workingDays = filters?.dateRange ? 
      Math.ceil((new Date(filters.dateRange.end).getTime() - new Date(filters.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) : 30;
    
    // Group work logs by user and project
    const userProjectHours = new Map<string, Map<string, number>>();
    const userTotalHours = new Map<string, number>();
    const projectTotalHours = new Map<string, number>();
    const projectMembers = new Map<string, Set<string>>();

    workLogs.forEach((log: any) => {
      const userEmail = log.user_email;
      const projectName = log.projects?.name || 'Unknown';
      const hours = (log.logged_duration_seconds || 0) / 3600;

      // User-project hours
      if (!userProjectHours.has(userEmail)) {
        userProjectHours.set(userEmail, new Map());
      }
      const userProjects = userProjectHours.get(userEmail)!;
      userProjects.set(projectName, (userProjects.get(projectName) || 0) + hours);

      // User total hours
      userTotalHours.set(userEmail, (userTotalHours.get(userEmail) || 0) + hours);

      // Project total hours
      projectTotalHours.set(projectName, (projectTotalHours.get(projectName) || 0) + hours);

      // Project members
      if (!projectMembers.has(projectName)) {
        projectMembers.set(projectName, new Set());
      }
      projectMembers.get(projectName)!.add(userEmail);
    });

    // Calculate team overview
    const totalMembers = userTotalHours.size;
    const totalHours = Array.from(userTotalHours.values()).reduce((sum, hours) => sum + hours, 0);
    const averageUtilization = totalMembers > 0 ? (totalHours / (totalMembers * workingDays * 8)) * 100 : 0;

    // Categorize members
    const memberUtilizations = Array.from(userTotalHours.entries()).map(([userEmail, hours]) => ({
      user: userEmail,
      utilization: (hours / (workingDays * 8)) * 100
    }));

    const overloadedMembers = memberUtilizations.filter(m => m.utilization > 120).length;
    const underutilizedMembers = memberUtilizations.filter(m => m.utilization < 60).length;
    const activeMembers = memberUtilizations.filter(m => m.utilization >= 60 && m.utilization <= 120).length;

    // Create project load heatmap
    const projectLoadHeatmap: Array<{ project: string; user: string; hours: number; intensity: number }> = [];
    userProjectHours.forEach((userProjects, userEmail) => {
      userProjects.forEach((hours, projectName) => {
        const maxHours = Math.max(...Array.from(userProjects.values()));
        const intensity = maxHours > 0 ? (hours / maxHours) * 100 : 0;
        projectLoadHeatmap.push({
          project: projectName,
          user: userEmail,
          hours: Math.round(hours * 100) / 100,
          intensity: Math.round(intensity)
        });
      });
    });

    // Calculate workload trends (simplified - using daily aggregation)
    const dailyData: Record<string, { hours: number; users: Set<string> }> = {};
    workLogs.forEach((log: any) => {
      const dateStr = new Date(log.start_time).toISOString().split('T')[0];
      const hours = (log.logged_duration_seconds || 0) / 3600;
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { hours: 0, users: new Set() };
      }
      dailyData[dateStr].hours += hours;
      dailyData[dateStr].users.add(log.user_email);
    });

    const workloadTrends = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        totalHours: Math.round(data.hours * 100) / 100,
        averageUtilization: data.users.size > 0 ? (data.hours / (data.users.size * 8)) * 100 : 0,
        memberCount: data.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Capacity forecast (simplified projection)
    const recentTrend = workloadTrends.slice(-7); // Last 7 days
    const avgDailyHours = recentTrend.length > 0 ? 
      recentTrend.reduce((sum, day) => sum + day.totalHours, 0) / recentTrend.length : 0;
    
    const capacityForecast = [
      { period: 'Next Week', projectedHours: avgDailyHours * 7, capacityGap: 0, recommendedHiring: 0 },
      { period: 'Next Month', projectedHours: avgDailyHours * 30, capacityGap: Math.max(0, avgDailyHours * 30 - totalMembers * 160), recommendedHiring: Math.ceil(Math.max(0, avgDailyHours * 30 - totalMembers * 160) / 160) },
      { period: 'Next Quarter', projectedHours: avgDailyHours * 90, capacityGap: Math.max(0, avgDailyHours * 90 - totalMembers * 480), recommendedHiring: Math.ceil(Math.max(0, avgDailyHours * 90 - totalMembers * 480) / 480) }
    ];

    // Member performance analysis
    const memberPerformance = memberUtilizations.map(member => {
      const userProjects = userProjectHours.get(member.user) || new Map();
      const projectCount = userProjects.size;
      const totalHours = userTotalHours.get(member.user) || 0;
      
      let status: 'Optimal' | 'Overloaded' | 'Underutilized';
      if (member.utilization > 120) status = 'Overloaded';
      else if (member.utilization < 60) status = 'Underutilized';
      else status = 'Optimal';

      return {
        user: member.user,
        utilization: Math.round(member.utilization),
        projectCount,
        totalHours: Math.round(totalHours * 100) / 100,
        status
      };
    });

    // Project allocation analysis
    const projectAllocation = Array.from(projectTotalHours.entries()).map(([projectName, totalHours]) => {
      const memberCount = projectMembers.get(projectName)?.size || 0;
      const averageHoursPerMember = memberCount > 0 ? totalHours / memberCount : 0;
      const allocationEfficiency = memberCount > 0 ? Math.min(100, (averageHoursPerMember / 8) * 100) : 0;

      return {
        project: projectName,
        totalHours: Math.round(totalHours * 100) / 100,
        memberCount,
        averageHoursPerMember: Math.round(averageHoursPerMember * 100) / 100,
        allocationEfficiency: Math.round(allocationEfficiency)
      };
    });

    // Team health metrics
    const workloadBalance = 100 - (Math.abs(overloadedMembers - underutilizedMembers) / totalMembers) * 100;
    const skillDistribution = 85; // Placeholder - would need skill assessment data
    const collaborationIndex = 90; // Placeholder - would need collaboration metrics
    const overallHealth = Math.round((workloadBalance + skillDistribution + collaborationIndex) / 3);

    const insights: TeamInsights = {
      teamOverview: {
        totalMembers,
        activeMembers,
        overloadedMembers,
        underutilizedMembers,
        averageUtilization: Math.round(averageUtilization)
      },
      projectLoadHeatmap,
      workloadTrends,
      capacityForecast,
      memberPerformance,
      projectAllocation,
      teamHealth: {
        workloadBalance: Math.round(workloadBalance),
        skillDistribution,
        collaborationIndex,
        overallHealth
      }
    };

    setTeamInsights(insights);
  };

  const handleRefresh = () => {
    loadTeamInsightsData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (!teamInsights) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading team insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team & Managerial Insights</h2>
          <p className="text-gray-600">Comprehensive team performance analysis and capacity planning</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Team Health Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Team Health Overview</h3>
          <div className="text-3xl font-bold text-blue-600">{teamInsights.teamHealth.overallHealth}%</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{teamInsights.teamHealth.workloadBalance}%</div>
            <div className="text-sm text-gray-600">Workload Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{teamInsights.teamHealth.skillDistribution}%</div>
            <div className="text-sm text-gray-600">Skill Distribution</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{teamInsights.teamHealth.collaborationIndex}%</div>
            <div className="text-sm text-gray-600">Collaboration Index</div>
          </div>
        </div>
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{teamInsights.teamOverview.totalMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">{teamInsights.teamOverview.activeMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overloaded</p>
              <p className="text-2xl font-bold text-gray-900">{teamInsights.teamOverview.overloadedMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserX className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Underutilized</p>
              <p className="text-2xl font-bold text-gray-900">{teamInsights.teamOverview.underutilizedMembers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gauge className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{teamInsights.teamOverview.averageUtilization}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workload Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Workload Trends</h3>
          <button
            onClick={() => downloadChartAsImage('workload-trends', 'workload-trends')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['workload-trends'] = el; }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={teamInsights.workloadTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalHours" stroke="#0088FE" name="Total Hours" />
              <Line type="monotone" dataKey="averageUtilization" stroke="#00C49F" name="Avg Utilization %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity Forecast */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Capacity Forecast</h3>
          <button
            onClick={() => downloadChartAsImage('capacity-forecast', 'capacity-forecast')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['capacity-forecast'] = el; }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamInsights.capacityForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="projectedHours" fill="#0088FE" name="Projected Hours" />
              <Bar dataKey="capacityGap" fill="#FF8042" name="Capacity Gap" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Load Heatmap */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Project Load Heatmap</h3>
          <button
            onClick={() => downloadChartAsImage('project-heatmap', 'project-load-heatmap')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['project-heatmap'] = el; }}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  {Array.from(new Set(teamInsights.projectLoadHeatmap.map(item => item.project))).map(project => (
                    <th key={project} className="px-4 py-2 text-center">{project}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(teamInsights.projectLoadHeatmap.map(item => item.user))).map(user => (
                  <tr key={user}>
                    <td className="px-4 py-2 font-medium">{user}</td>
                    {Array.from(new Set(teamInsights.projectLoadHeatmap.map(item => item.project))).map(project => {
                      const heatmapItem = teamInsights.projectLoadHeatmap.find(item => item.user === user && item.project === project);
                      const intensity = heatmapItem?.intensity || 0;
                      const hours = heatmapItem?.hours || 0;
                      return (
                        <td key={project} className="px-4 py-2 text-center">
                          <div 
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              intensity > 80 ? 'bg-red-100 text-red-800' :
                              intensity > 60 ? 'bg-orange-100 text-orange-800' :
                              intensity > 40 ? 'bg-yellow-100 text-yellow-800' :
                              intensity > 20 ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                            title={`${hours} hours (${intensity}% intensity)`}
                          >
                            {hours}h
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Member Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Member Performance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamInsights.memberPerformance.map((member) => (
                <tr key={member.user} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.utilization}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.projectCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.totalHours}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'Optimal' ? 'bg-green-100 text-green-800' :
                      member.status === 'Overloaded' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Allocation Analysis */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Project Allocation Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Hours/Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation Efficiency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamInsights.projectAllocation.map((project) => (
                <tr key={project.project} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.project}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.totalHours}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.memberCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.averageHoursPerMember}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.allocationEfficiency >= 80 ? 'bg-green-100 text-green-800' :
                      project.allocationEfficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.allocationEfficiency}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
