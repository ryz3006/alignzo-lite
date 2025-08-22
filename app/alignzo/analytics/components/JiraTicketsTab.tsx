'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials, JiraIssue } from '@/lib/jira';
import { supabaseClient } from '@/lib/supabase-client';
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
  Activity,
  HelpCircle
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
    otherStatusCount: number;
    otherStatusTickets: string[];
  }>;
  dailyTrends: Array<{
    date: string;
    created: number;
    resolved: number;
    open: number;
  }>;
  assigneeStatusCount: Array<{
    assignee: string;
    open: number;
    inProgress: number;
    closed: number;
    other: number;
  }>;
  projectStatusCount: Array<{
    project: string;
    open: number;
    inProgress: number;
    closed: number;
    other: number;
  }>;
  timeSpentData: Array<{
    user: string;
    project: string;
    ticketId: string;
    timeSpent: number;
    timeSpentHours: number;
  }>;
  timeSpentGroupedData: Array<{ assignee: string; [key: string]: any }>;
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
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<JiraIssue[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    checkJiraIntegration();
  }, []);

  useEffect(() => {
    if (jiraCredentials) {
      loadJiraData(jiraCredentials);
    }
  }, [filters, jiraCredentials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.tooltip-container')) {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkJiraIntegration = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) {
        setError('User not authenticated');
        return;
      }

      const credentials = await getJiraCredentials(currentUser.email);
      if (!credentials) {
        setError('JIRA integration not found');
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

      // Get current user for API calls
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) {
        setError('User not authenticated');
        return;
      }

      // First, get all available JIRA project mappings for the user
      console.log('Fetching JIRA project mappings...');
      const allProjectMappings = await getAllJiraProjectMappings();
      
      console.log('Project mappings received:', allProjectMappings);
      
      if (allProjectMappings.length === 0) {
        setError('No JIRA project mappings found. Please configure project mappings in the Integrations section first. Go to /alignzo/integrations to set up project mappings.');
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

      // Add user filter based on availability and selection
      let usersToFetch: string[] = [];
      
      if (filters?.selectedUsers && filters.selectedUsers.length > 0) {
        // If users are selected, fetch only for selected users
        usersToFetch = filters.selectedUsers;
      } else {
        // If no users selected, fetch for all available users in the dropdown who have JIRA mappings
        usersToFetch = await getAvailableUsersWithJiraMappings();
      }
      
      if (usersToFetch.length > 0) {
        const jiraUserNames = await getJiraUserNamesForDashboardUsers(usersToFetch);
        if (jiraUserNames.length > 0) {
          jql += ` AND assignee in ("${jiraUserNames.join('", "')}")`;
        } else {
          // If no users are mapped to JIRA, show error message
          setError('No JIRA user mappings found. Please configure user mappings in the Integrations section first. Go to /alignzo/integrations to set up user mappings.');
          setJiraIssues([]);
          setTicketMetrics(null);
          return;
        }
              } else {
          // If no users available, show error message
          setError('No users with JIRA mappings found. Please configure user mappings in the Integrations section first. Go to /alignzo/integrations to set up user mappings.');
          setJiraIssues([]);
          setTicketMetrics(null);
          return;
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
      console.log('About to call JIRA search API with credentials:', credentials);
      console.log('JQL query:', jql);
      
      let result: { success: boolean; issues?: JiraIssue[]; message: string };
      
      try {
        console.log('Starting JIRA API call...');
        setLoadingProgress('Making JIRA API request...');
        
        // Use the backend API endpoint instead of calling JIRA directly
        const response = await fetch('/api/jira/search-issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail: currentUser.email,
            jql: jql,
            maxResults: 100
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch JIRA issues');
        }

        const data = await response.json();
        result = {
          success: data.success,
          issues: data.issues,
          message: data.success ? 'Success' : data.error
        };
        
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

  const getAvailableUsersWithJiraMappings = async (): Promise<string[]> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return [];

      // Get all available users from the web app
      const usersResponse = await supabaseClient.getUsers();
      if (usersResponse.error) {
        console.error('Error fetching available users:', usersResponse.error);
        return [];
      }
      const availableUsers = usersResponse.data;

      const availableUserEmails = availableUsers?.map((user: any) => user.email) || [];
      console.log('Available users in web app:', availableUserEmails);

      // Get JIRA user mappings
      const response = await fetch(`/api/integrations/jira/user-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const userMappings = data.mappings || [];
        
        console.log('JIRA user mappings:', userMappings);
        
        // Get intersection of available users and users with JIRA mappings
        const mappedUserEmails = userMappings.map((mapping: any) => mapping.user_email).filter(Boolean);
        const usersWithMappings = availableUserEmails.filter((email: any) => mappedUserEmails.includes(email));
        
        console.log('Users with JIRA mappings from available users:', usersWithMappings);
        return usersWithMappings;
      }
    } catch (error) {
      console.error('Error fetching available users with JIRA mappings:', error);
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
    const assigneeStatusMap = new Map<string, { open: number; inProgress: number; closed: number; other: number }>();
    const projectStatusMap = new Map<string, { open: number; inProgress: number; closed: number; other: number }>();
    const timeSpentData: Array<{ user: string; project: string; ticketId: string; timeSpent: number; timeSpentHours: number }> = [];
    const timeSpentGroupedData: Array<{ assignee: string; [key: string]: any }> = [];
    
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
      const project = issue.fields.project.name;
      const timeSpent = issue.fields.timespent || 0;
      
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

      // Aging tickets calculation - use created date for aging
      const daysSinceCreated = isValidCreatedDate ? 
        Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Collect time spent data if available
      if (timeSpent > 0) {
        timeSpentData.push({
          user: assignee,
          project: project,
          ticketId: issue.key,
          timeSpent: timeSpent,
          timeSpentHours: Math.round((timeSpent / 3600) * 100) / 100 // Convert seconds to hours
        });
      }

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

      // Track status by assignee
      if (!assigneeStatusMap.has(assignee)) {
        assigneeStatusMap.set(assignee, { open: 0, inProgress: 0, closed: 0, other: 0 });
      }
      const assigneeStatus = assigneeStatusMap.get(assignee)!;
      
      if (status.includes('open') || status.includes('to do')) {
        assigneeStatus.open++;
      } else if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        assigneeStatus.closed++;
      } else if (status.includes('progress') || status.includes('development')) {
        assigneeStatus.inProgress++;
      } else {
        assigneeStatus.other++;
      }

            // Track status by project
      if (!projectStatusMap.has(project)) {
        projectStatusMap.set(project, { open: 0, inProgress: 0, closed: 0, other: 0 });
      }
      const projectStatus = projectStatusMap.get(project)!;
      
      if (status.includes('open') || status.includes('to do')) {
        projectStatus.open++;
      } else if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        projectStatus.closed++;
      } else if (status.includes('progress') || status.includes('development')) {
        projectStatus.inProgress++;
      } else {
        projectStatus.other++;
      }

      // Priority distribution
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;

      // Aging tickets - use created date for aging calculation
      if (daysSinceCreated >= 60) agingTickets['60+ days']++;
      else if (daysSinceCreated >= 30) agingTickets['30+ days']++;
      else if (daysSinceCreated >= 14) agingTickets['14+ days']++;
      else if (daysSinceCreated >= 7) agingTickets['7+ days']++;

      // User performance tracking
      if (!userPerformanceMap.has(assignee)) {
        userPerformanceMap.set(assignee, {
          user: assignee,
          assignedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          slaCompliantTickets: 0,
          otherStatusTickets: []
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
      } else if (!status.includes('open') && !status.includes('to do') && !status.includes('progress') && !status.includes('development')) {
        // Track tickets in other statuses
        userPerf.otherStatusTickets.push(issue.key);
      }

      // Daily trends - track both created and resolved dates
      if (isValidCreatedDate) {
        const createdDateStr = createdDate.toISOString().split('T')[0];
        if (!dailyData[createdDateStr]) {
          dailyData[createdDateStr] = { created: 0, resolved: 0, open: 0 };
        }
        dailyData[createdDateStr].created++;
      }
      
      if (isValidUpdatedDate) {
        const updatedDateStr = updatedDate.toISOString().split('T')[0];
        if (!dailyData[updatedDateStr]) {
          dailyData[updatedDateStr] = { created: 0, resolved: 0, open: 0 };
        }
        
        if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
          dailyData[updatedDateStr].resolved++;
        } else {
          dailyData[updatedDateStr].open++;
        }
      }
    });

    // Create stacked bar chart data for time spent analysis
    const assigneeTicketMap = new Map<string, Map<string, number>>();
    
    timeSpentData.forEach(item => {
      if (!assigneeTicketMap.has(item.user)) {
        assigneeTicketMap.set(item.user, new Map());
      }
      const ticketMap = assigneeTicketMap.get(item.user)!;
      ticketMap.set(item.ticketId, item.timeSpentHours);
    });

    // Convert to chart data format
    assigneeTicketMap.forEach((ticketMap, assignee) => {
      const chartData: { assignee: string; [key: string]: any } = { assignee };
      ticketMap.forEach((hours, ticketId) => {
        chartData[ticketId] = hours;
      });
      timeSpentGroupedData.push(chartData);
    });

    // Calculate user performance metrics
    const userPerformance = Array.from(userPerformanceMap.values()).map(user => ({
      user: user.user,
      assignedTickets: user.assignedTickets,
      closedTickets: user.closedTickets,
      avgResolutionTime: user.closedTickets > 0 ? Math.round(user.totalResolutionTime / user.closedTickets) : 0,
      slaComplianceRate: user.closedTickets > 0 ? Math.round((user.slaCompliantTickets / user.closedTickets) * 100) : 0,
      otherStatusCount: user.otherStatusTickets.length,
      otherStatusTickets: user.otherStatusTickets
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

    // Convert assignee status map to array
    const assigneeStatusCount = Array.from(assigneeStatusMap.entries()).map(([assignee, status]) => ({
      assignee,
      ...status
    }));

    // Convert project status map to array
    const projectStatusCount = Array.from(projectStatusMap.entries()).map(([project, status]) => ({
      project,
      ...status
    }));

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
      dailyTrends,
      assigneeStatusCount,
      projectStatusCount,
      timeSpentData,
      timeSpentGroupedData
    };

    setTicketMetrics(metrics);
  };

  const handleRefresh = () => {
    setError(null);
    setLoading(true);
    if (jiraCredentials) {
      loadJiraData(jiraCredentials).finally(() => {
        setLoading(false);
      });
    } else {
      checkJiraIntegration();
    }
  };

  const handleViewTickets = (user: string, ticketIds: string[]) => {
    const tickets = jiraIssues.filter(issue => ticketIds.includes(issue.key));
    setSelectedTickets(tickets);
    setSelectedUser(user);
    setShowTicketModal(true);
  };

  const closeModal = () => {
    setShowTicketModal(false);
    setSelectedTickets([]);
    setSelectedUser('');
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ExternalLink className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{ticketMetrics.totalTickets}</p>
              </div>
            </div>
            <div className="relative tooltip-container">
              <HelpCircle 
                className="w-5 h-5 text-gray-400 cursor-pointer" 
                onClick={() => setActiveTooltip(activeTooltip === 'totalTickets' ? null : 'totalTickets')}
              />
              {activeTooltip === 'totalTickets' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">Total Tickets</div>
                  <div className="text-gray-300 text-xs">
                    Total number of JIRA tickets found in the selected projects and date range. 
                    Includes all ticket statuses (open, closed, in progress).
                  </div>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Backlog Size</p>
                <p className="text-2xl font-bold text-gray-900">{ticketMetrics.backlogSize}</p>
              </div>
            </div>
            <div className="relative tooltip-container">
              <HelpCircle 
                className="w-5 h-5 text-gray-400 cursor-pointer" 
                onClick={() => setActiveTooltip(activeTooltip === 'backlogSize' ? null : 'backlogSize')}
              />
              {activeTooltip === 'backlogSize' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">Backlog Size</div>
                  <div className="text-gray-300 text-xs">
                    Number of tickets that are open or in progress (not closed/resolved). 
                    Calculated as: Open Tickets + In Progress Tickets.
                    Represents current workload and pending work.
                  </div>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{ticketMetrics.slaComplianceRate}%</p>
              </div>
            </div>
            <div className="relative tooltip-container">
              <HelpCircle 
                className="w-5 h-5 text-gray-400 cursor-pointer" 
                onClick={() => setActiveTooltip(activeTooltip === 'slaCompliance' ? null : 'slaCompliance')}
              />
              {activeTooltip === 'slaCompliance' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">SLA Compliance</div>
                  <div className="text-gray-300 text-xs">
                    Percentage of resolved tickets that met the SLA target (7 days). 
                    Calculated as: (SLA Compliant Tickets ÷ Total Resolved Tickets) × 100.
                    Higher percentage indicates better service quality.
                  </div>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-gray-900">{ticketMetrics.averageResolutionTime}d</p>
              </div>
            </div>
            <div className="relative tooltip-container">
              <HelpCircle 
                className="w-5 h-5 text-gray-400 cursor-pointer" 
                onClick={() => setActiveTooltip(activeTooltip === 'avgResolution' ? null : 'avgResolution')}
              />
              {activeTooltip === 'avgResolution' && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">Average Resolution Time</div>
                  <div className="text-gray-300 text-xs">
                    Average number of days to resolve tickets from creation to closure. 
                    Calculated as: Sum of (Resolution Date - Creation Date) ÷ Number of Resolved Tickets.
                    Lower values indicate faster ticket resolution.
                  </div>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Flow Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Ticket Inflow vs Outflow</h3>
              <div className="relative tooltip-container ml-2">
                <HelpCircle 
                  className="w-5 h-5 text-gray-400 cursor-pointer" 
                  onClick={() => setActiveTooltip(activeTooltip === 'ticketFlow' ? null : 'ticketFlow')}
                />
                {activeTooltip === 'ticketFlow' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-1">Ticket Inflow vs Outflow</div>
                    <div className="text-gray-300 text-xs">
                      Daily trend showing tickets created vs resolved over time. 
                      Created: New tickets added each day.
                      Resolved: Tickets closed/completed each day.
                      Helps identify workload patterns and resolution efficiency.
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
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
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
              <div className="relative tooltip-container ml-2">
                <HelpCircle 
                  className="w-5 h-5 text-gray-400 cursor-pointer" 
                  onClick={() => setActiveTooltip(activeTooltip === 'priorityDistribution' ? null : 'priorityDistribution')}
                />
                {activeTooltip === 'priorityDistribution' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-1">Priority Distribution</div>
                    <div className="text-gray-300 text-xs">
                      Distribution of tickets by priority level (Highest, High, Medium, Low, Lowest). 
                      Shows the proportion of high-priority vs low-priority work.
                      Helps identify workload urgency and resource allocation needs.
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
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

      {/* Time Spent Analysis */}
      {ticketMetrics.timeSpentData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Time Spent Analysis</h3>
              <div className="relative tooltip-container ml-2">
                <HelpCircle 
                  className="w-5 h-5 text-gray-400 cursor-pointer" 
                  onClick={() => setActiveTooltip(activeTooltip === 'timeSpentAnalysis' ? null : 'timeSpentAnalysis')}
                />
                {activeTooltip === 'timeSpentAnalysis' && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                    <div className="font-medium mb-1">Time Spent Analysis</div>
                    <div className="text-gray-300 text-xs">
                      Stacked bar chart showing time spent by assignee, grouped by ticket ID. 
                      Each bar represents an assignee, with different colors for different tickets.
                      Shows workload distribution and time allocation across team members.
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => downloadChartAsImage('time-spent', 'time-spent-analysis')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['time-spent'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketMetrics.timeSpentGroupedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assignee" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`${value} hours`, `Ticket: ${name}`]} />
                <Legend />
                {ticketMetrics.timeSpentGroupedData.length > 0 && 
                  Object.keys(ticketMetrics.timeSpentGroupedData[0])
                    .filter(key => key !== 'assignee')
                    .map((ticketId, index) => (
                      <Bar 
                        key={ticketId} 
                        dataKey={ticketId} 
                        stackId="a" 
                        fill={COLORS[index % COLORS.length]}
                        name={`Ticket: ${ticketId}`}
                      />
                    ))
                }
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Assignee vs Status Count Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Assignee vs Status Count</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketMetrics.assigneeStatusCount.map((item) => (
                <tr key={item.assignee} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.assignee}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.open}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {item.inProgress}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {item.closed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.other}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project vs Status Count Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Project vs Status Count</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketMetrics.projectStatusCount.map((item) => (
                <tr key={item.project} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.project}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.open}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {item.inProgress}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {item.closed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.other}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aging Tickets Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Aging Tickets Analysis</h3>
            <div className="relative tooltip-container ml-2">
              <HelpCircle 
                className="w-5 h-5 text-gray-400 cursor-pointer" 
                onClick={() => setActiveTooltip(activeTooltip === 'agingTickets' ? null : 'agingTickets')}
              />
              {activeTooltip === 'agingTickets' && (
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">Aging Tickets Analysis</div>
                  <div className="text-gray-300 text-xs">
                    Distribution of tickets by age (days since creation). 
                    Shows how long tickets have been pending: 7+ days, 14+ days, 30+ days, 60+ days.
                    Helps identify bottlenecks and tickets that need attention.
                  </div>
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {user.otherStatusCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.otherStatusCount > 0 && (
                      <button
                        onClick={() => handleViewTickets(user.user, user.otherStatusTickets)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Tickets in Other Status - {selectedUser}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {selectedTickets.map((ticket) => (
                  <div key={ticket.key} className="border rounded-lg p-4 mb-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {ticket.key} - {ticket.fields.summary}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Status:</span> {ticket.fields.status.name}
                          </div>
                          <div>
                            <span className="font-medium">Priority:</span> {ticket.fields.priority?.name || 'No Priority'}
                          </div>
                          <div>
                            <span className="font-medium">Project:</span> {ticket.fields.project.name}
                          </div>
                          <div>
                            <span className="font-medium">Assignee:</span> {ticket.fields.assignee?.displayName || 'Unassigned'}
                          </div>
                          {ticket.fields.timespent && (
                            <div>
                              <span className="font-medium">Time Spent:</span> {Math.round((ticket.fields.timespent / 3600) * 100) / 100} hours
                            </div>
                          )}
                          {ticket.fields.created && (
                            <div>
                              <span className="font-medium">Created:</span> {new Date(ticket.fields.created).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {ticket.fields.description && (
                          <div className="mt-2">
                            <span className="font-medium text-sm">Description:</span>
                            <p className="text-sm text-gray-600 mt-1 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                              {typeof ticket.fields.description === 'string' ? ticket.fields.description.replace(/<[^>]*>/g, '') : 'No description available'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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
