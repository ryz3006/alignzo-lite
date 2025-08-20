'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getJiraCredentials, searchJiraIssues, JiraIssue } from '@/lib/jira';
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
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface JiraMetricsTabProps {
  chartRefs: React.MutableRefObject<{ [key: string]: any }>;
  downloadChartAsImage: (chartId: string, filename: string) => void;
  filters?: {
    selectedProjects?: string[];
    selectedUsers?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

interface JiraProjectMapping {
  id: string;
  dashboard_project_id: string;
  jira_project_key: string;
  jira_project_name?: string;
  integration_user_email: string;
}

interface JiraProjectMetrics {
  projectKey: string;
  projectName: string;
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  inProgressIssues: number;
  totalStoryPoints: number;
  averageStoryPoints: number;
  assigneeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  issueTypeDistribution: Record<string, number>;
  recentActivity: Array<{
    date: string;
    issuesCreated: number;
    issuesResolved: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function JiraMetricsTab({ chartRefs, downloadChartAsImage, filters }: JiraMetricsTabProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jiraCredentials, setJiraCredentials] = useState<any>(null);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<JiraProjectMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

      // Check if JIRA integration exists
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

      let jql = 'project IS NOT EMPTY';

      // Add project filter if projects are selected
      if (filters?.selectedProjects && filters.selectedProjects.length > 0) {
        // Get JIRA project keys for selected dashboard projects
        const projectKeys = await getJiraProjectKeysForDashboardProjects(filters.selectedProjects);
        if (projectKeys.length > 0) {
          jql = `project in ("${projectKeys.join('", "')}")`;
        }
      }

      // Add date range filter if provided
      if (filters?.dateRange) {
        const startDate = filters.dateRange.start;
        const endDate = filters.dateRange.end;
        jql += ` AND updated >= "${startDate}" AND updated <= "${endDate}"`;
      }

      jql += ' ORDER BY updated DESC';

      const result = await searchJiraIssues(credentials, jql, 1000);
      
      if (!result.success) {
        setError(result.message);
        return;
      }

      setJiraIssues(result.issues || []);
      calculateProjectMetrics(result.issues || []);
    } catch (error) {
      console.error('Error loading JIRA data:', error);
      setError('Failed to load JIRA data');
    } finally {
      setRefreshing(false);
    }
  };

  const getJiraProjectKeysForDashboardProjects = async (dashboardProjectIds: string[]): Promise<string[]> => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return [];

      const response = await fetch(`/api/integrations/jira/project-mapping?integrationUserEmail=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        const projectMappings = data.mappings || [];
        
        // Filter mappings for selected dashboard projects and extract JIRA project keys
        const jiraProjectKeys = projectMappings
          .filter((mapping: JiraProjectMapping) => dashboardProjectIds.includes(mapping.dashboard_project_id))
          .map((mapping: JiraProjectMapping) => mapping.jira_project_key);
        
        return jiraProjectKeys;
      }
    } catch (error) {
      console.error('Failed to get JIRA project keys:', error);
    }
    return [];
  };

  const calculateProjectMetrics = (issues: JiraIssue[]) => {
    const projectMap = new Map<string, JiraProjectMetrics>();

    issues.forEach(issue => {
      const projectKey = issue.fields.project.key;
      const projectName = issue.fields.project.name;
      const status = issue.fields.status.name.toLowerCase();
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const priority = issue.fields.priority?.name || 'No Priority';
      const issueType = issue.fields.issuetype?.name || 'Unknown';

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, {
          projectKey,
          projectName,
          totalIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          inProgressIssues: 0,
          totalStoryPoints: 0,
          averageStoryPoints: 0,
          assigneeDistribution: {},
          priorityDistribution: {},
          issueTypeDistribution: {},
          recentActivity: []
        });
      }

      const metrics = projectMap.get(projectKey)!;
      metrics.totalIssues++;

      // Count by status
      if (status.includes('open') || status.includes('to do')) {
        metrics.openIssues++;
      } else if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        metrics.closedIssues++;
      } else if (status.includes('progress') || status.includes('development')) {
        metrics.inProgressIssues++;
      }

      // Story points (assuming custom field or story point field)
      const storyPoints = issue.fields.customfield_10016 || 0; // Common story point field
      metrics.totalStoryPoints += storyPoints;

      // Assignee distribution
      if (!metrics.assigneeDistribution[assignee]) {
        metrics.assigneeDistribution[assignee] = 0;
      }
      metrics.assigneeDistribution[assignee]++;

      // Priority distribution
      if (!metrics.priorityDistribution[priority]) {
        metrics.priorityDistribution[priority] = 0;
      }
      metrics.priorityDistribution[priority]++;

      // Issue type distribution
      if (!metrics.issueTypeDistribution[issueType]) {
        metrics.issueTypeDistribution[issueType] = 0;
      }
      metrics.issueTypeDistribution[issueType]++;
    });

    // Calculate averages and convert to array
    const metricsArray = Array.from(projectMap.values()).map(metrics => ({
      ...metrics,
      averageStoryPoints: metrics.totalIssues > 0 ? Math.round((metrics.totalStoryPoints / metrics.totalIssues) * 100) / 100 : 0
    }));

    setProjectMetrics(metricsArray);
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
          To view JIRA analytics, you need to set up your JIRA integration first.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">JIRA Project Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into your JIRA projects and issues</p>
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
              <ExternalLink className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projectMetrics.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900">
                {projectMetrics.reduce((sum, project) => sum + project.totalIssues, 0)}
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
                {projectMetrics.reduce((sum, project) => sum + project.inProgressIssues, 0)}
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
                {projectMetrics.reduce((sum, project) => sum + project.totalStoryPoints, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Overview Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Project Overview</h3>
          <button
            onClick={() => downloadChartAsImage('project-overview', 'jira-project-overview')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['project-overview'] = el; }}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={projectMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="projectName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalIssues" fill="#0088FE" name="Total Issues" />
              <Bar dataKey="openIssues" fill="#FFBB28" name="Open Issues" />
              <Bar dataKey="inProgressIssues" fill="#00C49F" name="In Progress" />
              <Bar dataKey="closedIssues" fill="#FF8042" name="Closed Issues" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Project Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Issues
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Story Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectMetrics.map((project) => (
                <tr key={project.projectKey} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{project.projectName}</div>
                      <div className="text-sm text-gray-500">{project.projectKey}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.totalIssues}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {project.openIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {project.inProgressIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {project.closedIssues}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.totalStoryPoints}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.averageStoryPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Type Distribution */}
      {projectMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Issue Type Distribution</h3>
              <button
                onClick={() => downloadChartAsImage('issue-type-distribution', 'jira-issue-type-distribution')}
                className="text-gray-600 hover:text-gray-800"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div ref={(el) => { chartRefs.current['issue-type-distribution'] = el; }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(projectMetrics[0]?.issueTypeDistribution || {}).map(([type, count]) => ({
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
                    {Object.entries(projectMetrics[0]?.issueTypeDistribution || {}).map((entry, index) => (
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
                onClick={() => downloadChartAsImage('priority-distribution', 'jira-priority-distribution')}
                className="text-gray-600 hover:text-gray-800"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div ref={(el) => { chartRefs.current['priority-distribution'] = el; }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(projectMetrics[0]?.priorityDistribution || {}).map(([priority, count]) => ({
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
                    {Object.entries(projectMetrics[0]?.priorityDistribution || {}).map((entry, index) => (
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
