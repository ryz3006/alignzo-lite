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
  Target, 
  Clock, 
  TrendingUp, 
  Users,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ProjectHealthMetrics {
  projectName: string;
  totalHours: number;
  fte: number;
  effortShare: number;
  userCount: number;
  averageHoursPerUser: number;
  utilizationTrend: Array<{
    date: string;
    utilization: number;
    hours: number;
  }>;
  capacityForecast: Array<{
    date: string;
    projectedHours: number;
    capacityGap: number;
  }>;
}

interface ProjectHealthTabProps {
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

export default function ProjectHealthTab({ filters, chartRefs, downloadChartAsImage }: ProjectHealthTabProps) {
  const [projectMetrics, setProjectMetrics] = useState<ProjectHealthMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalProjects: 0,
    totalFTE: 0,
    averageEffortShare: 0,
    totalHours: 0,
    capacityUtilization: 0,
    projectsAtCapacity: 0,
    projectsUnderCapacity: 0
  });

  useEffect(() => {
    loadProjectHealthData();
  }, [filters]);

  const loadProjectHealthData = async () => {
    try {
      setLoading(true);
      
      const [workLogs, projects, users] = await Promise.all([
        loadWorkLogs(),
        loadProjects(),
        loadUsers()
      ]);

      const metrics = calculateProjectHealthMetrics(workLogs, projects, users);
      setProjectMetrics(metrics);
      
      const summary = calculateSummaryMetrics(metrics);
      setSummaryMetrics(summary);
      
    } catch (error) {
      console.error('Error loading project health data:', error);
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

  const loadProjects = async () => {
    let query = supabase
      .from('projects')
      .select('*');

    if (filters.selectedProjects.length > 0) {
      query = query.in('name', filters.selectedProjects);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  };

  const calculateProjectHealthMetrics = (workLogs: any[], projects: any[], users: any[]): ProjectHealthMetrics[] => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(filters.dateRange.start, filters.dateRange.end);
    const totalTeamHours = users.length * standardWorkHoursPerDay * workingDaysInPeriod;

    const filteredProjects = filters.selectedProjects.length > 0 
      ? projects.filter(project => filters.selectedProjects.includes(project.name))
      : projects;

    return filteredProjects.map(project => {
      const projectLogs = workLogs.filter(log => log.project?.id === project.id);
      const totalHours = projectLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const fte = totalHours / (standardWorkHoursPerDay * workingDaysInPeriod);
      const effortShare = totalTeamHours > 0 ? (totalHours / totalTeamHours) * 100 : 0;
      const uniqueUsers = new Set(projectLogs.map(log => log.user_email));

      // Calculate utilization trend
      const utilizationTrend = calculateUtilizationTrend(projectLogs, workingDaysInPeriod);

      // Calculate capacity forecast
      const capacityForecast = calculateCapacityForecast(projectLogs, workingDaysInPeriod);

      return {
        projectName: project.name,
        totalHours: Math.round(totalHours * 100) / 100,
        fte: Math.round(fte * 100) / 100,
        effortShare: Math.round(effortShare * 100) / 100,
        userCount: uniqueUsers.size,
        averageHoursPerUser: uniqueUsers.size > 0 ? Math.round((totalHours / uniqueUsers.size) * 100) / 100 : 0,
        utilizationTrend,
        capacityForecast
      };
    });
  };

  const calculateSummaryMetrics = (metrics: ProjectHealthMetrics[]) => {
    const totalProjects = metrics.length;
    const totalFTE = metrics.reduce((sum: number, m: ProjectHealthMetrics) => sum + m.fte, 0);
    const averageEffortShare = metrics.reduce((sum: number, m: ProjectHealthMetrics) => sum + m.effortShare, 0) / totalProjects;
    const totalHours = metrics.reduce((sum: number, m: ProjectHealthMetrics) => sum + m.totalHours, 0);
    const capacityUtilization = totalFTE / totalProjects; // Average FTE per project

    // Count projects at/under capacity
    const projectsAtCapacity = metrics.filter(m => m.fte >= 1).length;
    const projectsUnderCapacity = metrics.filter(m => m.fte < 1).length;

    return {
      totalProjects,
      totalFTE: Math.round(totalFTE * 100) / 100,
      averageEffortShare: Math.round(averageEffortShare * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      capacityUtilization: Math.round(capacityUtilization * 100) / 100,
      projectsAtCapacity,
      projectsUnderCapacity
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

  const calculateUtilizationTrend = (logs: any[], workingDays: number) => {
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
        utilization: Math.round(utilization * 100) / 100,
        hours: Math.round(hours * 100) / 100
      });
    }
    
    return result;
  };

  const calculateCapacityForecast = (logs: any[], workingDays: number) => {
    // Simple linear forecast based on current trend
    const dailyData = groupByDay(logs);
    const recentDays = 7; // Use last 7 days for trend
    const recentHours = [];
    
    for (let i = Math.max(0, workingDays - recentDays); i < workingDays; i++) {
      const date = new Date(filters.dateRange.start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = dailyData[dateStr] || [];
      const hours = dayLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      recentHours.push(hours);
    }
    
    const avgDailyHours = recentHours.reduce((sum: number, hours: number) => sum + hours, 0) / recentHours.length;
    const forecastDays = 30; // Forecast next 30 days
    const result = [];
    
    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(filters.dateRange.end);
      date.setDate(date.getDate() + i + 1);
      const dateStr = date.toISOString().split('T')[0];
      
      const projectedHours = avgDailyHours;
      const capacityGap = Math.max(0, 8 - projectedHours); // Assuming 8-hour capacity
      
      result.push({
        date: dateStr,
        projectedHours: Math.round(projectedHours * 100) / 100,
        capacityGap: Math.round(capacityGap * 100) / 100
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

  const chartData = projectMetrics.map(metric => ({
    name: metric.projectName,
    fte: metric.fte,
    totalHours: metric.totalHours,
    effortShare: metric.effortShare,
    userCount: metric.userCount
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total FTE</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalFTE}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalHours}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Effort Share</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.averageEffortShare}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* FTE Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">FTE by Project</h3>
            <button
              onClick={() => downloadChartAsImage('fte-chart', 'fte-by-project')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['fte-chart'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} FTE`, 'Full-Time Equivalent']} />
                <Bar dataKey="fte" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Effort Share Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('effort-share', 'effort-share-distribution')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['effort-share'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.map(item => ({
                    name: item.name,
                    value: item.effortShare
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, 'Effort Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Capacity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Capacity Status</h3>
            <button
              onClick={() => downloadChartAsImage('capacity-status', 'capacity-status')}
              className="text-gray-600 hover:text-gray-800"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['capacity-status'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'At Capacity', value: summaryMetrics.projectsAtCapacity, fill: '#ef4444' },
                { name: 'Under Capacity', value: summaryMetrics.projectsUnderCapacity, fill: '#10b981' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
              <AreaChart data={projectMetrics[0]?.capacityForecast || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="projectedHours" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="capacityGap" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Health Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Projects at Capacity</h3>
          <div className="space-y-3">
            {projectMetrics
              .filter(project => project.fte >= 1)
              .sort((a, b) => b.fte - a.fte)
              .slice(0, 5)
              .map((project, index) => (
                <div key={project.projectName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">{index + 1}</span>
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">{project.projectName}</span>
                      <div className="text-xs text-gray-500">{project.fte} FTE</div>
                    </div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Projects Under Capacity</h3>
          <div className="space-y-3">
            {projectMetrics
              .filter(project => project.fte < 1)
              .sort((a, b) => a.fte - b.fte)
              .slice(0, 5)
              .map((project, index) => (
                <div key={project.projectName} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">{index + 1}</span>
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">{project.projectName}</span>
                      <div className="text-xs text-gray-500">{project.fte} FTE</div>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Detailed Project Health Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Project Health Analysis</h3>
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
                  FTE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effort Share %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Hours/User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectMetrics.map((project) => (
                <tr key={project.projectName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.projectName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.totalHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.fte}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.effortShare}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.userCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.averageHoursPerUser}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.fte >= 1 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        At Capacity
                      </span>
                    ) : project.fte >= 0.5 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Moderate
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Under Capacity
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
