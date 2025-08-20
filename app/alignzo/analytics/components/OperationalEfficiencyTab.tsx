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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
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
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface OperationalEfficiencyTabProps {
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

interface EfficiencyMetrics {
  effortOutputRatio: number;
  productivityIndex: number;
  workloadBalanceIndex: number;
  qualityScore: number;
  responseTimeIndex: number;
  overallEfficiency: number;
  userEfficiency: Array<{
    user: string;
    hoursLogged: number;
    ticketsClosed: number;
    effortOutputRatio: number;
    productivityIndex: number;
    qualityScore: number;
  }>;
  projectEfficiency: Array<{
    project: string;
    totalHours: number;
    ticketsClosed: number;
    effortOutputRatio: number;
    productivityIndex: number;
  }>;
  dailyEfficiency: Array<{
    date: string;
    hoursLogged: number;
    ticketsClosed: number;
    efficiency: number;
  }>;
  qualityMetrics: {
    ticketReopeningRate: number;
    firstResponseTime: number;
    resolutionAccuracy: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function OperationalEfficiencyTab({ filters, chartRefs, downloadChartAsImage }: OperationalEfficiencyTabProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jiraCredentials, setJiraCredentials] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEfficiencyData();
  }, [filters]);

  const loadEfficiencyData = async () => {
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

      calculateEfficiencyMetrics();
    } catch (error) {
      console.error('Error loading efficiency data:', error);
      setError('Failed to load efficiency data');
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
        `)
        .eq('user_email', userEmail);

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
      let jql = 'project IS NOT EMPTY';

      // Add project filter if projects are selected
      if (filters?.selectedProjects && filters.selectedProjects.length > 0) {
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
      
      if (result.success) {
        setJiraIssues(result.issues || []);
      }
    } catch (error) {
      console.error('Error loading JIRA data:', error);
    }
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

  const calculateEfficiencyMetrics = () => {
    // Calculate total hours logged
    const totalHoursLogged = workLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
    
    // Calculate tickets closed (from JIRA data)
    const closedTickets = jiraIssues.filter(issue => {
      const status = issue.fields.status.name.toLowerCase();
      return status.includes('closed') || status.includes('done') || status.includes('resolved');
    }).length;

    // Effort vs Output ratio (hours logged vs tickets closed)
    const effortOutputRatio = closedTickets > 0 ? Math.round((totalHoursLogged / closedTickets) * 100) / 100 : 0;

    // Productivity index = (# tickets resolved × weighted by priority) ÷ hours logged
    const priorityWeights = { 'Highest': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Lowest': 1 };
    const weightedTickets = jiraIssues.reduce((sum: number, issue: JiraIssue) => {
      const status = issue.fields.status.name.toLowerCase();
      if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        const priority = issue.fields.priority?.name || 'Medium';
        return sum + (priorityWeights[priority as keyof typeof priorityWeights] || 3);
      }
      return sum;
    }, 0);
    
    const productivityIndex = totalHoursLogged > 0 ? Math.round((weightedTickets / totalHoursLogged) * 100) / 100 : 0;

    // Workload balance index (variance across team members)
    const userHours = new Map<string, number>();
    workLogs.forEach((log: any) => {
      const user = log.user_email;
      const hours = (log.logged_duration_seconds || 0) / 3600;
      userHours.set(user, (userHours.get(user) || 0) + hours);
    });

    const hoursArray = Array.from(userHours.values());
    const meanHours = hoursArray.reduce((sum, hours) => sum + hours, 0) / hoursArray.length;
    const variance = hoursArray.reduce((sum, hours) => sum + Math.pow(hours - meanHours, 2), 0) / hoursArray.length;
    const workloadBalanceIndex = meanHours > 0 ? Math.round((1 - Math.sqrt(variance) / meanHours) * 100) : 0;

    // Quality metrics (simplified)
    const qualityScore = Math.round((productivityIndex * 0.4 + workloadBalanceIndex * 0.3 + (100 - effortOutputRatio * 10) * 0.3));

    // Response time index (simplified - using average resolution time)
    const resolutionTimes = jiraIssues
      .filter(issue => {
        const status = issue.fields.status.name.toLowerCase();
        return status.includes('closed') || status.includes('done') || status.includes('resolved');
      })
      .map(issue => {
        const created = new Date(issue.fields.created || '');
        const updated = new Date(issue.fields.updated || '');
        return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

    const avgResolutionTime = resolutionTimes.length > 0 ? 
      resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0;
    const responseTimeIndex = avgResolutionTime > 0 ? Math.max(0, 100 - avgResolutionTime * 5) : 100;

    // Overall efficiency score
    const overallEfficiency = Math.round(
      (productivityIndex * 0.3 + 
       workloadBalanceIndex * 0.2 + 
       qualityScore * 0.3 + 
       responseTimeIndex * 0.2)
    );

    // User efficiency breakdown
    const userEfficiency = Array.from(userHours.entries()).map(([userEmail, hoursLogged]) => {
      const userTickets = jiraIssues.filter(issue => 
        issue.fields.assignee?.emailAddress === userEmail
      );
      const userClosedTickets = userTickets.filter(issue => {
        const status = issue.fields.status.name.toLowerCase();
        return status.includes('closed') || status.includes('done') || status.includes('resolved');
      }).length;

      const userEffortOutputRatio = userClosedTickets > 0 ? Math.round((hoursLogged / userClosedTickets) * 100) / 100 : 0;
      const userProductivityIndex = hoursLogged > 0 ? Math.round((userClosedTickets / hoursLogged) * 100) / 100 : 0;
      const userQualityScore = Math.round((userProductivityIndex * 0.6 + (100 - userEffortOutputRatio * 10) * 0.4));

      return {
        user: userEmail,
        hoursLogged,
        ticketsClosed: userClosedTickets,
        effortOutputRatio: userEffortOutputRatio,
        productivityIndex: userProductivityIndex,
        qualityScore: userQualityScore
      };
    });

    // Project efficiency breakdown
    const projectHours = new Map<string, number>();
    workLogs.forEach((log: any) => {
      const projectName = log.projects?.name || 'Unknown';
      const hours = (log.logged_duration_seconds || 0) / 3600;
      projectHours.set(projectName, (projectHours.get(projectName) || 0) + hours);
    });

    const projectEfficiency = Array.from(projectHours.entries()).map(([projectName, totalHours]) => {
      const projectTickets = jiraIssues.filter(issue => 
        issue.fields.project.name === projectName
      );
      const projectClosedTickets = projectTickets.filter(issue => {
        const status = issue.fields.status.name.toLowerCase();
        return status.includes('closed') || status.includes('done') || status.includes('resolved');
      }).length;

      const projectEffortOutputRatio = projectClosedTickets > 0 ? Math.round((totalHours / projectClosedTickets) * 100) / 100 : 0;
      const projectProductivityIndex = totalHours > 0 ? Math.round((projectClosedTickets / totalHours) * 100) / 100 : 0;

      return {
        project: projectName,
        totalHours,
        ticketsClosed: projectClosedTickets,
        effortOutputRatio: projectEffortOutputRatio,
        productivityIndex: projectProductivityIndex
      };
    });

    // Daily efficiency trends
    const dailyData: Record<string, { hoursLogged: number; ticketsClosed: number }> = {};
    workLogs.forEach((log: any) => {
      const dateStr = new Date(log.start_time).toISOString().split('T')[0];
      const hours = (log.logged_duration_seconds || 0) / 3600;
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { hoursLogged: 0, ticketsClosed: 0 };
      }
      dailyData[dateStr].hoursLogged += hours;
    });

    jiraIssues.forEach(issue => {
      const status = issue.fields.status.name.toLowerCase();
      if (status.includes('closed') || status.includes('done') || status.includes('resolved')) {
        const dateStr = new Date(issue.fields.updated || '').toISOString().split('T')[0];
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { hoursLogged: 0, ticketsClosed: 0 };
        }
        dailyData[dateStr].ticketsClosed++;
      }
    });

    const dailyEfficiency = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        hoursLogged: Math.round(data.hoursLogged * 100) / 100,
        ticketsClosed: data.ticketsClosed,
        efficiency: data.hoursLogged > 0 ? Math.round((data.ticketsClosed / data.hoursLogged) * 100) / 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Quality metrics
    const qualityMetrics = {
      ticketReopeningRate: 5, // Placeholder - would need historical data
      firstResponseTime: avgResolutionTime,
      resolutionAccuracy: 95 // Placeholder - would need quality assessment data
    };

    const metrics: EfficiencyMetrics = {
      effortOutputRatio,
      productivityIndex,
      workloadBalanceIndex,
      qualityScore,
      responseTimeIndex,
      overallEfficiency,
      userEfficiency,
      projectEfficiency,
      dailyEfficiency,
      qualityMetrics
    };

    setEfficiencyMetrics(metrics);
  };

  const handleRefresh = () => {
    loadEfficiencyData();
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

  if (!efficiencyMetrics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading efficiency metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operational Efficiency KPIs</h2>
          <p className="text-gray-600">Comprehensive efficiency metrics and performance indicators</p>
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

      {/* Overall Efficiency Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Overall Efficiency Score</h3>
          <div className="text-3xl font-bold text-blue-600">{efficiencyMetrics.overallEfficiency}%</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{efficiencyMetrics.productivityIndex}</div>
            <div className="text-sm text-gray-600">Productivity Index</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{efficiencyMetrics.workloadBalanceIndex}%</div>
            <div className="text-sm text-gray-600">Workload Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{efficiencyMetrics.qualityScore}%</div>
            <div className="text-sm text-gray-600">Quality Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{efficiencyMetrics.responseTimeIndex}%</div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Effort/Output Ratio</p>
              <p className="text-2xl font-bold text-gray-900">{efficiencyMetrics.effortOutputRatio}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productivity Index</p>
              <p className="text-2xl font-bold text-gray-900">{efficiencyMetrics.productivityIndex}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Workload Balance</p>
              <p className="text-2xl font-bold text-gray-900">{efficiencyMetrics.workloadBalanceIndex}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Quality Score</p>
              <p className="text-2xl font-bold text-gray-900">{efficiencyMetrics.qualityScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Radar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Efficiency Dimensions</h3>
          <button
            onClick={() => downloadChartAsImage('efficiency-radar', 'efficiency-dimensions')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['efficiency-radar'] = el; }}>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={[
              {
                dimension: 'Productivity',
                value: Math.min(100, efficiencyMetrics.productivityIndex * 20)
              },
              {
                dimension: 'Workload Balance',
                value: efficiencyMetrics.workloadBalanceIndex
              },
              {
                dimension: 'Quality',
                value: efficiencyMetrics.qualityScore
              },
              {
                dimension: 'Response Time',
                value: efficiencyMetrics.responseTimeIndex
              },
              {
                dimension: 'Efficiency',
                value: efficiencyMetrics.overallEfficiency
              }
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Efficiency" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Efficiency Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Daily Efficiency Trends</h3>
          <button
            onClick={() => downloadChartAsImage('daily-efficiency', 'daily-efficiency-trends')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['daily-efficiency'] = el; }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyMetrics.dailyEfficiency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="efficiency" stroke="#0088FE" name="Efficiency" />
              <Line type="monotone" dataKey="hoursLogged" stroke="#00C49F" name="Hours Logged" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Efficiency Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Efficiency Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Logged
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets Closed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effort/Output Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productivity Index
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {efficiencyMetrics.userEfficiency.map((user) => (
                <tr key={user.user} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.round(user.hoursLogged * 100) / 100}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {user.ticketsClosed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.effortOutputRatio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.productivityIndex}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.qualityScore >= 80 ? 'bg-green-100 text-green-800' :
                      user.qualityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.qualityScore}%
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
