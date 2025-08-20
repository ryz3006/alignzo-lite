'use client';

import { useState, useEffect } from 'react';
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
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Download,
  Image
} from 'lucide-react';

interface WorkloadMetrics {
  userEmail: string;
  userName: string;
  totalLoggedHours: number;
  availableHours: number;
  utilizationRate: number;
  overtimeHours: number;
  idleHours: number;
  projectDistribution: Record<string, number>;
  workTypeDistribution: Record<string, number>;
  dailyWorkload: Array<{
    date: string;
    hours: number;
    utilization: number;
  }>;
}

interface WorkloadTabProps {
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
    selectedTeams: string[];
    selectedProjects: string[];
    selectedUsers: string[];
  };
  chartRefs: React.MutableRefObject<{ [key: string]: any }>;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function WorkloadTab({ filters, chartRefs, downloadChartAsImage }: WorkloadTabProps) {
  const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalUsers: 0,
    averageUtilization: 0,
    totalOvertime: 0,
    totalIdleHours: 0,
    topContributors: [] as string[],
    underutilizedMembers: [] as string[]
  });

  useEffect(() => {
    loadWorkloadData();
  }, [filters]);

  const loadWorkloadData = async () => {
    try {
      setLoading(true);
      
      const [workLogs, users, teams] = await Promise.all([
        loadWorkLogs(),
        loadUsers(),
        loadTeams()
      ]);

      const metrics = calculateWorkloadMetrics(workLogs, users);
      setWorkloadMetrics(metrics);
      
      const summary = calculateSummaryMetrics(metrics);
      setSummaryMetrics(summary);
      
    } catch (error) {
      console.error('Error loading workload data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkLogs = async () => {
    let query = supabase
      .from('work_logs')
      .select(`
        *,
        project:projects(*)
      `)
      .gte('start_time', filters.dateRange.start)
      .lte('start_time', filters.dateRange.end);

    if (filters.selectedUsers.length > 0) {
      query = query.in('user_email', filters.selectedUsers);
    }
    if (filters.selectedProjects.length > 0) {
      query = query.in('project.name', filters.selectedProjects);
    }

    const { data, error } = await query.order('start_time', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  };

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(*)
      `);
    if (error) throw error;
    return data || [];
  };

  const calculateWorkloadMetrics = (workLogs: any[], users: any[]): WorkloadMetrics[] => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(filters.dateRange.start, filters.dateRange.end);
    const totalAvailableHours = standardWorkHoursPerDay * workingDaysInPeriod;

    const filteredUsers = filters.selectedUsers.length > 0 
      ? users.filter(user => filters.selectedUsers.includes(user.email))
      : users;

    return filteredUsers.map(user => {
      const userLogs = workLogs.filter(log => log.user_email === user.email);
      const totalLoggedHours = userLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const utilizationRate = totalAvailableHours > 0 ? (totalLoggedHours / totalAvailableHours) * 100 : 0;
      const overtimeHours = Math.max(0, totalLoggedHours - totalAvailableHours);
      const idleHours = Math.max(0, totalAvailableHours - totalLoggedHours);

      // Calculate project distribution
      const projectDistribution: Record<string, number> = {};
      const projectGroups = groupBy(userLogs, 'project.name');
      Object.entries(projectGroups).forEach(([projectName, logs]) => {
        projectDistribution[projectName] = (logs as any[]).reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      });

      // Calculate work type distribution
      const workTypeDistribution: Record<string, number> = {};
      userLogs.forEach((log: any) => {
        Object.entries(log.dynamic_category_selections || {}).forEach(([category, value]) => {
          if (category.toLowerCase().includes('work type') || category.toLowerCase().includes('type')) {
            if (!workTypeDistribution[value as string]) workTypeDistribution[value as string] = 0;
            workTypeDistribution[value as string] += (log.logged_duration_seconds || 0) / 3600;
          }
        });
      });

      // Calculate daily workload
      const dailyWorkload = calculateDailyWorkload(userLogs, workingDaysInPeriod);

      return {
        userEmail: user.email,
        userName: user.full_name,
        totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
        availableHours: Math.round(totalAvailableHours * 100) / 100,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        idleHours: Math.round(idleHours * 100) / 100,
        projectDistribution,
        workTypeDistribution,
        dailyWorkload
      };
    });
  };

  const calculateSummaryMetrics = (metrics: WorkloadMetrics[]) => {
    const totalUsers = metrics.length;
    const averageUtilization = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.utilizationRate, 0) / totalUsers;
    const totalOvertime = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.overtimeHours, 0);
    const totalIdleHours = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.idleHours, 0);

    // Top contributors (highest utilization)
    const topContributors = metrics
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5)
      .map(m => m.userName);

    // Underutilized members (lowest utilization)
    const underutilizedMembers = metrics
      .sort((a, b) => a.utilizationRate - b.utilizationRate)
      .slice(0, 5)
      .map(m => m.userName);

    return {
      totalUsers,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      totalIdleHours: Math.round(totalIdleHours * 100) / 100,
      topContributors,
      underutilizedMembers
    };
  };

  const calculateWorkingDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    return workingDays;
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((groups: any, item: any) => {
      const group = key.split('.').reduce((obj: any, k: string) => obj?.[k], item) || 'Unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  };

  const calculateDailyWorkload = (logs: any[], workingDays: number) => {
    const dailyData = groupByDay(logs);
    const result = [];
    
    for (let i = 0; i < workingDays; i++) {
      const date = new Date(filters.dateRange.start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = dailyData[dateStr] || [];
      const hours = dayLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const utilization = hours / 8 * 100; // Assuming 8-hour workday
      
      result.push({
        date: dateStr,
        hours: Math.round(hours * 100) / 100,
        utilization: Math.round(utilization * 100) / 100
      });
    }
    
    return result;
  };

  const groupByDay = (logs: any[]) => {
    return logs.reduce((groups: any, log: any) => {
      const date = new Date(log.start_time);
      const day = date.toISOString().split('T')[0];
      groups[day] = groups[day] || [];
      groups[day].push(log);
      return groups;
    }, {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const chartData = workloadMetrics.map(metric => ({
    name: metric.userName,
    utilization: metric.utilizationRate,
    loggedHours: metric.totalLoggedHours,
    overtime: metric.overtimeHours,
    idle: metric.idleHours
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.averageUtilization}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Overtime</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalOvertime}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Idle Hours</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalIdleHours}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Team Utilization</h3>
          <button
            onClick={() => downloadChartAsImage('utilization-chart', 'team-utilization')}
            className="text-gray-600 hover:text-gray-800"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <div ref={(el) => { chartRefs.current['utilization-chart'] = el; }}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Utilization']} />
              <Bar dataKey="utilization" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Hours Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('hours-distribution', 'hours-distribution')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['hours-distribution'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="loggedHours" fill="#3b82f6" name="Logged Hours" />
                <Bar dataKey="overtime" fill="#f59e0b" name="Overtime" />
                <Bar dataKey="idle" fill="#ef4444" name="Idle Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Daily Workload Trend</h3>
            <button
              onClick={() => downloadChartAsImage('daily-trend', 'daily-workload-trend')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['daily-trend'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={workloadMetrics[0]?.dailyWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Utilization']} />
                <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Contributors</h3>
          <div className="space-y-3">
            {summaryMetrics.topContributors.map((contributor, index) => (
              <div key={contributor} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">{index + 1}</span>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{contributor}</span>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Underutilized Members</h3>
          <div className="space-y-3">
            {summaryMetrics.underutilizedMembers.map((member, index) => (
              <div key={member} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-red-600">{index + 1}</span>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{member}</span>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Workload Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detailed Workload Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logged Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Idle Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workloadMetrics.map((metric) => (
                <tr key={metric.userEmail} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{metric.userName}</div>
                      <div className="text-sm text-gray-500">{metric.userEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.totalLoggedHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.availableHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      metric.utilizationRate >= 80 
                        ? 'bg-green-100 text-green-800'
                        : metric.utilizationRate >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {metric.utilizationRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.overtimeHours > 0 ? (
                      <span className="text-red-600 font-medium">{metric.overtimeHours}h</span>
                    ) : (
                      <span className="text-gray-500">0h</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.idleHours > 0 ? (
                      <span className="text-orange-600 font-medium">{metric.idleHours}h</span>
                    ) : (
                      <span className="text-gray-500">0h</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.utilizationRate >= 80 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Optimal
                      </span>
                    ) : metric.utilizationRate >= 60 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Moderate
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low
                      </span>
                    )}
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
