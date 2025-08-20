'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials, searchJiraIssues, JiraIssue } from '@/lib/jira';
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
  UserCheck,
  UserX,
  MapPin
} from 'lucide-react';
import Link from 'next/link';

interface JiraAssigneeReporterTabProps {
  chartRefs: React.MutableRefObject<{ [key: string]: any }>;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

interface JiraUserMapping {
  id: string;
  user_email: string;
  jira_assignee_name: string;
  jira_reporter_name?: string;
  jira_project_key?: string;
  integration_user_email: string;
}

interface MappedUserMetrics {
  userEmail: string;
  userName: string;
  jiraAssigneeName: string;
  jiraReporterName?: string;
  totalAssignedIssues: number;
  totalReportedIssues: number;
  openAssignedIssues: number;
  inProgressAssignedIssues: number;
  closedAssignedIssues: number;
  totalStoryPoints: number;
  averageStoryPoints: number;
  issueTypeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  projectDistribution: Record<string, number>;
  recentActivity: Array<{
    date: string;
    issuesAssigned: number;
    issuesReported: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function JiraAssigneeReporterTab({ chartRefs, downloadChartAsImage }: JiraAssigneeReporterTabProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jiraCredentials, setJiraCredentials] = useState<any>(null);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [userMappings, setUserMappings] = useState<JiraUserMapping[]>([]);
  const [mappedUserMetrics, setMappedUserMetrics] = useState<MappedUserMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMappingWarning, setShowMappingWarning] = useState(false);

  useEffect(() => {
    checkJiraIntegration();
  }, []);

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

      // Check if JIRA integration exists
      const credentials = await getJiraCredentials(currentUser.email);
      if (!credentials) {
        setError('JIRA integration not found');
        setLoading(false);
        return;
      }

      setJiraCredentials(credentials);
      
      // Load user mappings
      const mappings = await loadUserMappings(currentUser.email);
      
      if (mappings.length === 0) {
        setShowMappingWarning(true);
        setLoading(false);
        return;
      }

      setUserMappings(mappings);
      await loadJiraData(credentials);
    } catch (error) {
      console.error('Error checking JIRA integration:', error);
      setError('Failed to check JIRA integration');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMappings = async (integrationUserEmail: string) => {
    try {
      const response = await fetch(`/api/integrations/jira/user-mapping?integrationUserEmail=${encodeURIComponent(integrationUserEmail)}`);
      if (response.ok) {
        const data = await response.json();
        const mappings = data.mappings || [];
        setUserMappings(mappings);
        return mappings;
      }
    } catch (error) {
      console.error('Failed to load user mappings:', error);
    }
    return [];
  };

  const loadJiraData = async (credentials: any) => {
    try {
      setRefreshing(true);
      setError(null);

      // Search for issues assigned to or reported by mapped users
      const mappedAssigneeNames = userMappings.map(m => m.jira_assignee_name);
      const mappedReporterNames = userMappings.map(m => m.jira_reporter_name).filter(Boolean);
      
      let jql = '';
      if (mappedAssigneeNames.length > 0 && mappedReporterNames.length > 0) {
        jql = `(assignee in ("${mappedAssigneeNames.join('", "')}") OR reporter in ("${mappedReporterNames.join('", "')}")) ORDER BY updated DESC`;
      } else if (mappedAssigneeNames.length > 0) {
        jql = `assignee in ("${mappedAssigneeNames.join('", "')}") ORDER BY updated DESC`;
      } else if (mappedReporterNames.length > 0) {
        jql = `reporter in ("${mappedReporterNames.join('", "')}") ORDER BY updated DESC`;
      } else {
        setError('No valid user mappings found');
        return;
      }

      const result = await searchJiraIssues(credentials, jql, 1000);
      
      if (!result.success) {
        setError(result.message);
        return;
      }

      setJiraIssues(result.issues || []);
      calculateMappedUserMetrics(result.issues || []);
    } catch (error) {
      console.error('Error loading JIRA data:', error);
      setError('Failed to load JIRA data');
    } finally {
      setRefreshing(false);
    }
  };

  const calculateMappedUserMetrics = (issues: JiraIssue[]) => {
    const userMetricsMap = new Map<string, MappedUserMetrics>();

    // Initialize metrics for each mapped user
    userMappings.forEach(mapping => {
      const userName = mapping.user_email.split('@')[0]; // Simple name extraction
      userMetricsMap.set(mapping.user_email, {
        userEmail: mapping.user_email,
        userName,
        jiraAssigneeName: mapping.jira_assignee_name,
        jiraReporterName: mapping.jira_reporter_name,
        totalAssignedIssues: 0,
        totalReportedIssues: 0,
        openAssignedIssues: 0,
        inProgressAssignedIssues: 0,
        closedAssignedIssues: 0,
        totalStoryPoints: 0,
        averageStoryPoints: 0,
        issueTypeDistribution: {},
        priorityDistribution: {},
        projectDistribution: {},
        recentActivity: []
      });
    });

    // Process each issue
    issues.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName;
      const reporter = issue.fields.reporter?.displayName;
      const status = issue.fields.status.name.toLowerCase();
      const priority = issue.fields.priority?.name || 'No Priority';
      const issueType = issue.fields.issuetype?.name || 'Unknown';
      const projectKey = issue.fields.project.key;
      const storyPoints = issue.fields.customfield_10016 || 0; // Common story point field

      // Find mapped users for this issue
      const assignedMapping = userMappings.find(m => m.jira_assignee_name === assignee);
      const reportedMapping = userMappings.find(m => m.jira_reporter_name === reporter);

      if (assignedMapping) {
        const metrics = userMetricsMap.get(assignedMapping.user_email)!;
        metrics.totalAssignedIssues++;
        metrics.totalStoryPoints += storyPoints;

        // Count by status
        if (status.includes('open') || status.includes('to do')) {
          metrics.openAssignedIssues++;
        } else if (status.includes('progress') || status.includes('development')) {
          metrics.inProgressAssignedIssues++;
        } else if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
          metrics.closedAssignedIssues++;
        }

        // Distribution counts
        if (!metrics.issueTypeDistribution[issueType]) metrics.issueTypeDistribution[issueType] = 0;
        metrics.issueTypeDistribution[issueType]++;

        if (!metrics.priorityDistribution[priority]) metrics.priorityDistribution[priority] = 0;
        metrics.priorityDistribution[priority]++;

        if (!metrics.projectDistribution[projectKey]) metrics.projectDistribution[projectKey] = 0;
        metrics.projectDistribution[projectKey]++;
      }

      if (reportedMapping) {
        const metrics = userMetricsMap.get(reportedMapping.user_email)!;
        metrics.totalReportedIssues++;
      }
    });

    // Calculate averages and convert to array
    const metricsArray = Array.from(userMetricsMap.values()).map(metrics => ({
      ...metrics,
      averageStoryPoints: metrics.totalAssignedIssues > 0 ? Math.round((metrics.totalStoryPoints / metrics.totalAssignedIssues) * 100) / 100 : 0
    }));

    setMappedUserMetrics(metricsArray);
  };

  const handleRefresh = () => {
    if (jiraCredentials) {
      loadJiraData(jiraCredentials);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
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
          To view JIRA assignee/reporter analytics, you need to set up your JIRA integration first.
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

  if (showMappingWarning) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">User Mappings Required</h3>
        <p className="text-gray-600 mb-6">
          To view JIRA assignee/reporter analytics, you need to map your team members' emails to JIRA assignee/reporter names.
        </p>
        <Link
          href="/alignzo/integrations"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Configure User Mappings
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">JIRA Assignee/Reporter Analytics</h2>
          <p className="text-gray-600">Insights into your team's JIRA work based on user mappings</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mapped Users</p>
              <p className="text-2xl font-bold text-gray-900">{mappedUserMetrics.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assigned Issues</p>
              <p className="text-2xl font-bold text-gray-900">
                {mappedUserMetrics.reduce((sum, user) => sum + user.totalAssignedIssues, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {mappedUserMetrics.reduce((sum, user) => sum + user.inProgressAssignedIssues, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Story Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {mappedUserMetrics.reduce((sum, user) => sum + user.totalStoryPoints, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Performance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">User Performance Overview</h3>
          <button
            onClick={() => downloadChartAsImage('user-performance', 'jira-user-performance')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['user-performance'] = el; }}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={mappedUserMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="userName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalAssignedIssues" fill="#0088FE" name="Assigned Issues" />
              <Bar dataKey="totalReportedIssues" fill="#00C49F" name="Reported Issues" />
              <Bar dataKey="openAssignedIssues" fill="#FFBB28" name="Open Issues" />
              <Bar dataKey="inProgressAssignedIssues" fill="#FF8042" name="In Progress" />
              <Bar dataKey="closedAssignedIssues" fill="#8884D8" name="Closed Issues" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  JIRA Assignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reported Issues
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
                  Story Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mappedUserMetrics.map((userMetrics) => (
                <tr key={userMetrics.userEmail} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{userMetrics.userName}</div>
                      <div className="text-sm text-gray-500">{userMetrics.userEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userMetrics.jiraAssigneeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userMetrics.totalAssignedIssues}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userMetrics.totalReportedIssues}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {userMetrics.openAssignedIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {userMetrics.inProgressAssignedIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {userMetrics.closedAssignedIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userMetrics.totalStoryPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Type and Priority Distribution */}
      {mappedUserMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Issue Type Distribution</h3>
              <button
                onClick={() => downloadChartAsImage('issue-type-distribution-mapped', 'jira-issue-type-distribution-mapped')}
                className="text-gray-600 hover:text-gray-800"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div ref={(el) => { chartRefs.current['issue-type-distribution-mapped'] = el; }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(
                      mappedUserMetrics.reduce((acc, user) => {
                        Object.entries(user.issueTypeDistribution).forEach(([type, count]) => {
                          acc[type] = (acc[type] || 0) + count;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => ({
                      name: type,
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
                    {Object.entries(
                      mappedUserMetrics.reduce((acc, user) => {
                        Object.entries(user.issueTypeDistribution).forEach(([type, count]) => {
                          acc[type] = (acc[type] || 0) + count;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Priority Distribution</h3>
              <button
                onClick={() => downloadChartAsImage('priority-distribution-mapped', 'jira-priority-distribution-mapped')}
                className="text-gray-600 hover:text-gray-800"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div ref={(el) => { chartRefs.current['priority-distribution-mapped'] = el; }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(
                      mappedUserMetrics.reduce((acc, user) => {
                        Object.entries(user.priorityDistribution).forEach(([priority, count]) => {
                          acc[priority] = (acc[priority] || 0) + count;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([priority, count]) => ({
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
                    {Object.entries(
                      mappedUserMetrics.reduce((acc, user) => {
                        Object.entries(user.priorityDistribution).forEach(([priority, count]) => {
                          acc[priority] = (acc[priority] || 0) + count;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
