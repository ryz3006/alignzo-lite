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
  Legend
} from 'recharts';
import { 
  ExternalLink, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Settings,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Target,
  Zap,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface JiraTicketsTabProps {
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

interface JiraProjectMapping {
  id: string;
  dashboard_project_id: string;
  jira_project_key: string;
  jira_project_name?: string;
  integration_user_email: string;
  project?: {
    id: string;
    name: string;
    product: string;
    country: string;
  };
}

interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  backlogSize: number;
  slaComplianceRate: number;
  averageResolutionTime: number;
  ticketInflow: number;
  ticketOutflow: number;
  agingTickets: {
    '7+ days': number;
    '14+ days': number;
    '30+ days': number;
    '60+ days': number;
  };
  priorityDistribution: Record<string, number>;
  userPerformance: Array<{
    user: string;
    assignedTickets: number;
    closedTickets: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
  }>;
  dailyTrends: Array<{
    date: string;
    created: number;
    resolved: number;
    open: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
const PRIORITY_COLORS = {
  'Highest': '#EF4444',
  'High': '#F97316',
  'Medium': '#EAB308',
  'Low': '#22C55E',
  'Lowest': '#3B82F6'
};

export default function JiraTicketsTab({ filters, chartRefs, downloadChartAsImage }: JiraTicketsTabProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jiraCredentials, setJiraCredentials] = useState<any>(null);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [ticketMetrics, setTicketMetrics] = useState<TicketMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');

  useEffect(() => {
    checkJiraIntegration();
  }, []);

  useEffect(() => {
    if (jiraCredentials) {
      loadJiraData(jiraCredentials);
    }
  }, [filters, jiraCredentials]);

  const checkJiraIntegration = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const credentials = await getJiraCredentials(currentUser.email);
      if (!credentials) {
        setError('JIRA integration not found');
        setLoading(false);
        return;
      }

      setJiraCredentials(credentials);
      await loadJiraData(credentials);
    } catch (error) {
      console.error('Error checking JIRA integration:', error);
      setError('Failed to check JIRA integration');
    } finally {
      setLoading(false);
    }
  };

  const loadJiraData = async (credentials: any) => {
    try {
      setRefreshing(true);
      setError(null);
      console.log('Loading JIRA data with complete pagination...');

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      // First, get all available JIRA project mappings for the user
      console.log('Fetching JIRA project mappings...');
      const allProjectMappings = await Promise.race([
        getAllJiraProjectMappings(),
        timeoutPromise
      ]) as JiraProjectMapping[];
      
      console.log('Project mappings received:', allProjectMappings);
      
      if (allProjectMappings.length === 0) {
        setError('No JIRA project mappings found. Please configure project mappings first.');
        setJiraIssues([]);
        setTicketMetrics(null);
        return;
      }

      let jql = 'project IS NOT EMPTY';

      // Filter by mapped projects only
      const availableProjectKeys = allProjectMappings.map((mapping: JiraProjectMapping) => mapping.jira_project_key);
      console.log('Available project keys:', availableProjectKeys);
      jql = `project in ("${availableProjectKeys.join('", "')}")`;

      // Further filter by selected projects if specified
      if (filters?.selectedProjects && filters.selectedProjects.length > 0) {
        const selectedProjectKeys = await getJiraProjectKeysForDashboardProjects(filters.selectedProjects);
        if (selectedProjectKeys.length > 0) {
          jql = `project in ("${selectedProjectKeys.join('", "')}")`;
        } else {
          // If no selected projects are mapped, show no data
          setJiraIssues([]);
          setTicketMetrics(null);
          return;
        }
      }

      // Add user filter if users are selected
      if (filters?.selectedUsers && filters.selectedUsers.length > 0) {
        const jiraUserNames = await getJiraUserNamesForDashboardUsers(filters.selectedUsers);
        if (jiraUserNames.length > 0) {
          jql += ` AND assignee in ("${jiraUserNames.join('", "')}")`;
        } else {
          // If no selected users are mapped, show no data
          setJiraIssues([]);
          setTicketMetrics(null);
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

      console.log('Executing JIRA search with JQL:', jql);
      setLoadingProgress('Fetching JIRA data...');
      console.log('About to call searchAllJiraIssues with credentials:', credentials);
      console.log('JQL query:', jql);
      
      let result: { success: boolean; issues?: JiraIssue[]; message: string };
      
      try {
        console.log('Starting JIRA API call...');
        setLoadingProgress('Making JIRA API request...');
        
        result = await Promise.race([
          searchAllJiraIssues(credentials, jql),
          timeoutPromise
        ]) as { success: boolean; issues?: JiraIssue[]; message: string };
        
        console.log('JIRA search result:', result);
        setLoadingProgress('Processing JIRA data...');
      } catch (error) {
        console.error('Error in JIRA search:', error);
        setError(`JIRA search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      if (!result.success) {
        setError(result.message);
        return;
      }

      const issues = result.issues || [];
      console.log(`Processing ${issues.length} JIRA issues for analytics...`);
      setLoadingProgress(`Processing ${issues.length} tickets...`);
      setJiraIssues(issues);
      calculateTicketMetrics(issues);
    } catch (error) {
      console.error('Error loading JIRA data:', error);
      setError('Failed to load JIRA data');
    } finally {
      setRefreshing(false);
      setLoadingProgress('');
    }
  };

  const getAllJiraProjectMappings = async (): Promise<JiraProjectMapping[]> => {
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
        
        console.log('Project mappings for filtering:', projectMappings);
        console.log('Dashboard project names to filter:', dashboardProjectNames);
        
        const jiraProjectKeys = projectMappings
          .filter((mapping: JiraProjectMapping) => {
            const projectName = mapping.project?.name || '';
            const isIncluded = dashboardProjectNames.includes(projectName);
            console.log(`Project mapping: ${projectName}, included: ${isIncluded}`);
            return isIncluded;
          })
          .map((mapping: JiraProjectMapping) => mapping.jira_project_key);
        
        console.log('Filtered JIRA project keys:', jiraProjectKeys);
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
        
        console.log('User mappings received:', userMappings);
        
        const jiraUserNames = userMappings
          .filter((mapping: any) => {
            return dashboardUserEmails.includes(mapping.user_email || '');
          })
          .map((mapping: any) => mapping.jira_assignee_name || mapping.jira_reporter_name);
        
        console.log('Filtered JIRA user names:', jiraUserNames);
        return jiraUserNames.filter(Boolean); // Remove any undefined/null values
      }
    } catch (error) {
      console.error('Failed to get JIRA user names:', error);
    }
    return [];
  };

  const calculateTicketMetrics = (issues: JiraIssue[]) => {
    const now = new Date();
    const userPerformanceMap = new Map<string, any>();
    const dailyData: Record<string, { created: number; resolved: number; open: number }> = {};
    let totalTickets = issues.length;
    let openTickets = 0;
    let closedTickets = 0;
    let inProgressTickets = 0;
    let slaCompliantTickets = 0;
    let totalResolutionTime = 0;
    let resolvedTicketCount = 0;
    const priorityDistribution: Record<string, number> = {};
    const agingTickets = { '7+ days': 0, '14+ days': 0, '30+ days': 0, '60+ days': 0 };

    issues.forEach(issue => {
      const status = issue.fields.status.name.toLowerCase();
      const priority = issue.fields.priority?.name || 'No Priority';
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      
      // Safely handle date parsing
      const createdDateStr = issue.fields.created;
      const updatedDateStr = issue.fields.updated;
      
      const createdDate = createdDateStr ? new Date(createdDateStr) : new Date();
      const updatedDate = updatedDateStr ? new Date(updatedDateStr) : new Date();
      
      // Validate dates
      const isValidCreatedDate = createdDate instanceof Date && !isNaN(createdDate.getTime());
      const isValidUpdatedDate = updatedDate instanceof Date && !isNaN(updatedDate.getTime());
      
      const daysSinceUpdate = isValidUpdatedDate ? 
        Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Count by status
      if (status.includes('open') || status.includes('to do')) {
        openTickets++;
      } else if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        closedTickets++;
        resolvedTicketCount++;
        
        // Only calculate resolution time if both dates are valid
        if (isValidCreatedDate && isValidUpdatedDate) {
          const resolutionTime = Math.floor((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          totalResolutionTime += resolutionTime;
          
          // Simple SLA compliance (assuming 7 days for resolution)
          if (resolutionTime <= 7) {
            slaCompliantTickets++;
          }
        }
      } else if (status.includes('progress') || status.includes('development')) {
        inProgressTickets++;
      }

      // Priority distribution
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;

      // Aging tickets
      if (daysSinceUpdate >= 60) agingTickets['60+ days']++;
      else if (daysSinceUpdate >= 30) agingTickets['30+ days']++;
      else if (daysSinceUpdate >= 14) agingTickets['14+ days']++;
      else if (daysSinceUpdate >= 7) agingTickets['7+ days']++;

      // User performance tracking
      if (!userPerformanceMap.has(assignee)) {
        userPerformanceMap.set(assignee, {
          user: assignee,
          assignedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          slaCompliantTickets: 0
        });
      }
      
      const userPerf = userPerformanceMap.get(assignee)!;
      userPerf.assignedTickets++;
      
      if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        userPerf.closedTickets++;
        
        // Only calculate resolution time if both dates are valid
        if (isValidCreatedDate && isValidUpdatedDate) {
          const resolutionTime = Math.floor((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          userPerf.totalResolutionTime += resolutionTime;
          if (resolutionTime <= 7) {
            userPerf.slaCompliantTickets++;
          }
        }
      }

      // Daily trends (simplified - using updated date)
      // Only process daily trends if we have a valid updated date
      if (isValidUpdatedDate) {
        const dateStr = updatedDate.toISOString().split('T')[0];
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { created: 0, resolved: 0, open: 0 };
        }
        
        if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
          dailyData[dateStr].resolved++;
        } else {
          dailyData[dateStr].open++;
        }
      }
    });

    // Calculate user performance metrics
    const userPerformance = Array.from(userPerformanceMap.values()).map(user => ({
      user: user.user,
      assignedTickets: user.assignedTickets,
      closedTickets: user.closedTickets,
      avgResolutionTime: user.closedTickets > 0 ? Math.round(user.totalResolutionTime / user.closedTickets) : 0,
      slaComplianceRate: user.closedTickets > 0 ? Math.round((user.slaCompliantTickets / user.closedTickets) * 100) : 0
    }));

    // Convert daily data to array and sort
    const dailyTrends = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        created: data.created,
        resolved: data.resolved,
        open: data.open
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const metrics: TicketMetrics = {
      totalTickets,
      openTickets,
      closedTickets,
      inProgressTickets,
      backlogSize: openTickets + inProgressTickets,
      slaComplianceRate: resolvedTicketCount > 0 ? Math.round((slaCompliantTickets / resolvedTicketCount) * 100) : 0,
      averageResolutionTime: resolvedTicketCount > 0 ? Math.round(totalResolutionTime / resolvedTicketCount) : 0,
      ticketInflow: dailyTrends.reduce((sum, day) => sum + day.created, 0),
      ticketOutflow: dailyTrends.reduce((sum, day) => sum + day.resolved, 0),
      agingTickets,
      priorityDistribution,
      userPerformance,
      dailyTrends
    };

    setTicketMetrics(metrics);
  };

  const handleRefresh = () => {
    if (jiraCredentials) {
      loadJiraData(jiraCredentials);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
        {loadingProgress && (
          <p className="text-sm text-gray-600">{loadingProgress}</p>
        )}
      </div>
    );
  }

  if (error === 'JIRA integration not found') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading JIRA Data</h3>
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

  if (!ticketMetrics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading ticket metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tickets & Issues Analytics</h2>
          <p className="text-gray-600">Comprehensive ticket management and SLA compliance insights</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? (loadingProgress || 'Refreshing...') : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExternalLink className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{ticketMetrics.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Backlog Size</p>
              <p className="text-2xl font-bold text-gray-900">{ticketMetrics.backlogSize}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{ticketMetrics.slaComplianceRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">{ticketMetrics.averageResolutionTime}d</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Flow Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Ticket Inflow vs Outflow</h3>
            <button
              onClick={() => downloadChartAsImage('ticket-flow', 'ticket-inflow-outflow')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['ticket-flow'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ticketMetrics.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#0088FE" name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#00C49F" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('priority-distribution', 'ticket-priority-distribution')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['priority-distribution'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(ticketMetrics.priorityDistribution).map(([priority, count]) => ({
                    name: priority,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(ticketMetrics.priorityDistribution).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Aging Tickets Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Aging Tickets Analysis</h3>
          <button
            onClick={() => downloadChartAsImage('aging-tickets', 'aging-tickets-analysis')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['aging-tickets'] = el; }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(ticketMetrics.agingTickets).map(([range, count]) => ({
              range,
              count
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Performance Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closed Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Resolution (days)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA Compliance %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketMetrics.userPerformance.map((user) => (
                <tr key={user.user} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.assignedTickets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {user.closedTickets}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.avgResolutionTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.slaComplianceRate >= 80 ? 'bg-green-100 text-green-800' :
                      user.slaComplianceRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.slaComplianceRate}%
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
