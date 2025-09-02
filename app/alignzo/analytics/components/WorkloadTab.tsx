'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { formatDateToYYYYMMDD } from '@/lib/utils';
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
  Image,
  HelpCircle,
  Calendar
} from 'lucide-react';

interface WorkloadMetrics {
  userEmail: string;
  userName: string;
  totalLoggedHours: number;
  availableHours: number;
  utilizationRate: number;
  overtimeHours: number;
  idleHours: number;
  leaveCount: number;
  projectDistribution: Record<string, number>;
  workTypeDistribution: Record<string, number>;
  dailyWorkload: Array<{
    date: string;
    hours: number;
    utilization: number;
  }>;
  shiftData: Record<string, string>; // date -> shift_type
}

interface WorkloadTabProps {
  filters: {
    dateRange: {
      start: string;
      end: string;
      startTime: string;
      endTime: string;
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
    totalLeaves: 0,
    topContributors: [] as { name: string; hours: number }[],
    underutilizedMembers: [] as { name: string; hours: number; hasWorkLogs: boolean }[]
  });
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [timeGrouping, setTimeGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    loadWorkloadData();
  }, [filters]);

  // Add effect to update chart data when time grouping changes
  useEffect(() => {
    // Force re-render when time grouping changes
    // This is handled automatically by the aggregateUserHoursByTime function
  }, [timeGrouping]);

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

  const loadWorkloadData = async () => {
    try {
      setLoading(true);
      
      const [workLogs, users, teams, shiftData] = await Promise.all([
        loadWorkLogs(),
        loadUsers(),
        loadTeams(),
        loadShiftData()
      ]);

      const metrics = calculateWorkloadMetrics(workLogs, users, shiftData);
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
    try {
      // Combine date and time for filtering
      const startDateTime = filters.dateRange.start && filters.dateRange.startTime 
        ? `${filters.dateRange.start}T${filters.dateRange.startTime}` 
        : filters.dateRange.start;
      const endDateTime = filters.dateRange.end && filters.dateRange.endTime 
        ? `${filters.dateRange.end}T${filters.dateRange.endTime}` 
        : filters.dateRange.end;

      const response = await supabaseClient.get('work_logs', {
        select: '*,project:projects(*)',
        filters: {
          start_time_gte: startDateTime,
          start_time_lte: endDateTime,
          ...(filters.selectedUsers.length > 0 && { user_email: filters.selectedUsers }),
          ...(filters.selectedProjects.length > 0 && { 'project.name': filters.selectedProjects })
        },
        order: { column: 'start_time', ascending: false }
      });

      if (response.error) {
        console.error('Error loading work logs:', response.error);
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (error) {
      console.error('Error loading work logs:', error);
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

  const loadTeams = async () => {
    try {
      const response = await supabaseClient.get('teams', {
        select: '*,team_members(*)'
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

  const loadShiftData = async () => {
    try {
      // For shift data, we only use date filtering since shifts are date-based
      const response = await supabaseClient.get('shift_schedules', {
        select: '*',
        filters: {
          shift_date_gte: filters.dateRange.start,
          shift_date_lte: filters.dateRange.end,
          ...(filters.selectedUsers.length > 0 && { user_email: filters.selectedUsers })
        }
      });

      if (response.error) {
        console.error('Error loading shift data:', response.error);
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (error) {
      console.error('Error loading shift data:', error);
      return [];
    }
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

  const groupByDay = (logs: any[]) => {
    return logs.reduce((groups: any, log: any) => {
      const date = new Date(log.start_time);
      const day = formatDateToYYYYMMDD(date);
      groups[day] = groups[day] || [];
      groups[day].push(log);
      return groups;
    }, {});
  };

  const calculateDailyWorkload = (logs: any[], workingDays: number, shiftData: Record<string, string>) => {
    const dailyData = groupByDay(logs);
    const result = [];
    
    for (let i = 0; i < workingDays; i++) {
      const date = new Date(filters.dateRange.start);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateToYYYYMMDD(date);
      
      const dayLogs = dailyData[dateStr] || [];
      const hours = dayLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      
      // Check if user has an active shift for this day (not H or L)
      const shiftType = shiftData[dateStr];
      const isActiveShift = shiftType && shiftType !== 'H' && shiftType !== 'L';
      const availableHours = isActiveShift ? 8 : 0;
      const utilization = availableHours > 0 ? (hours / availableHours) * 100 : 0;
      
      result.push({
        date: dateStr,
        hours: Math.round(hours * 100) / 100,
        utilization: Math.round(utilization * 100) / 100
      });
    }
    
    return result;
  };

  const calculateWorkloadMetrics = (workLogs: any[], users: any[], shiftData: any[]): WorkloadMetrics[] => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(filters.dateRange.start, filters.dateRange.end);

    const filteredUsers = filters.selectedUsers.length > 0 
      ? users.filter(user => filters.selectedUsers.includes(user.email))
      : users;

    return filteredUsers.map(user => {
      const userLogs = workLogs.filter(log => log.user_email === user.email);
      const userShifts = shiftData.filter(shift => shift.user_email === user.email);
      
      // Create shift data map for this user
      const userShiftData: Record<string, string> = {};
      userShifts.forEach(shift => {
        userShiftData[shift.shift_date] = shift.shift_type;
      });

      // Calculate available hours based on shifts (excluding H and L)
      let totalAvailableHours = 0;
      let leaveCount = 0;
      
      for (let i = 0; i < workingDaysInPeriod; i++) {
        const date = new Date(filters.dateRange.start);
        date.setDate(date.getDate() + i);
        const dateStr = formatDateToYYYYMMDD(date);
        
        const shiftType = userShiftData[dateStr] || 'G'; // Default to General if no shift assigned
        if (shiftType === 'L') {
          leaveCount++;
        } else if (shiftType !== 'H') {
          // Only count as available hours if not Holiday or Leave
          totalAvailableHours += standardWorkHoursPerDay;
        }
      }

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
      const dailyWorkload = calculateDailyWorkload(userLogs, workingDaysInPeriod, userShiftData);

      return {
        userEmail: user.email,
        userName: user.full_name,
        totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
        availableHours: Math.round(totalAvailableHours * 100) / 100,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        idleHours: Math.round(idleHours * 100) / 100,
        leaveCount,
        projectDistribution,
        workTypeDistribution,
        dailyWorkload,
        shiftData: userShiftData
      };
    });
  };

  const calculateSummaryMetrics = (metrics: WorkloadMetrics[]) => {
    const totalUsers = metrics.length;
    const averageUtilization = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.utilizationRate, 0) / totalUsers;
    const totalOvertime = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.overtimeHours, 0);
    const totalIdleHours = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.idleHours, 0);
    const totalLeaves = metrics.reduce((sum: number, m: WorkloadMetrics) => sum + m.leaveCount, 0);

    // Top contributors (highest utilization) - only include users with work logs
    const topContributors = metrics
      .filter(m => m.totalLoggedHours > 0) // Only include users with work logs
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5)
      .map(m => ({ name: m.userName, hours: m.totalLoggedHours }));

    // Underutilized members - only show users who have active shifts (not all H or L)
    const underutilizedMembers = metrics
      .filter(m => {
        // Check if user has any active shifts (not all H or L)
        const hasActiveShifts = Object.values(m.shiftData).some(shiftType => shiftType !== 'H' && shiftType !== 'L');
        return hasActiveShifts;
      })
      .sort((a, b) => a.utilizationRate - b.utilizationRate)
      .slice(0, 5)
      .map(m => ({ 
        name: m.userName, 
        hours: m.totalLoggedHours,
        hasWorkLogs: m.totalLoggedHours > 0 
      }));

    return {
      totalUsers,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      totalIdleHours: Math.round(totalIdleHours * 100) / 100,
      totalLeaves,
      topContributors,
      underutilizedMembers
    };
  };

  const aggregateUserHoursByTime = () => {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    const aggregatedData: { [key: string]: { [user: string]: number } } = {};
    
    // Create time periods based on grouping
    const timePeriods: string[] = [];
    
    if (timeGrouping === 'daily') {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        timePeriods.push(formatDateToYYYYMMDD(d));
      }
    } else if (timeGrouping === 'weekly') {
      const currentDate = new Date(startDate);
      // Start from the beginning of the week (Monday)
      const dayOfWeek = currentDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentDate.setDate(currentDate.getDate() + mondayOffset);
      
      while (currentDate <= endDate) {
        const weekStart = formatDateToYYYYMMDD(currentDate);
        timePeriods.push(`Week of ${weekStart}`);
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else if (timeGrouping === 'monthly') {
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      while (currentDate <= endDate) {
        const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        timePeriods.push(monthYear);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Initialize all time periods
    timePeriods.forEach(period => {
      aggregatedData[period] = {};
      workloadMetrics.forEach(metric => {
        aggregatedData[period][metric.userName] = 0;
      });
    });

    // Aggregate hours for each user by time period
    workloadMetrics.forEach(metric => {
      metric.dailyWorkload.forEach(daily => {
        const date = new Date(daily.date);
        let timePeriodKey = '';

        if (timeGrouping === 'daily') {
          timePeriodKey = daily.date;
        } else if (timeGrouping === 'weekly') {
          // Find the week this date belongs to
          const dayOfWeek = date.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const monday = new Date(date);
          monday.setDate(date.getDate() + mondayOffset);
          timePeriodKey = `Week of ${formatDateToYYYYMMDD(monday)}`;
        } else if (timeGrouping === 'monthly') {
          timePeriodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (aggregatedData[timePeriodKey]) {
          aggregatedData[timePeriodKey][metric.userName] += daily.hours;
        }
      });
    });

    // Convert to chart format
    return timePeriods.map(period => {
      const dataPoint: any = { period };
      workloadMetrics.forEach(metric => {
        dataPoint[metric.userName] = Math.round((aggregatedData[period][metric.userName] || 0) * 100) / 100;
      });
      return dataPoint;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.averageUtilization}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-orange-100">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Overtime</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalOvertime}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Idle Hours</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalIdleHours}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-yellow-100">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leaves</p>
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalLeaves}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-purple-100">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {workloadMetrics.filter(m => m.totalLoggedHours > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Hours Logged vs Time Chart - Full Width */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Users Hours Logged vs Time</h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Group by:</label>
            <select
              value={timeGrouping}
              onChange={(e) => setTimeGrouping(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={() => downloadChartAsImage('users-hours-time-chart', `users-hours-vs-time-${timeGrouping}`)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              title="Download Chart"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Track user workload patterns over time with dynamic grouping options
        </div>
        <div ref={(el) => { chartRefs.current['users-hours-time-chart'] = el; }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={aggregateUserHoursByTime()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
              <XAxis 
                dataKey="period" 
                angle={timeGrouping === 'daily' ? -45 : 0}
                textAnchor={timeGrouping === 'daily' ? 'end' : 'middle'}
                height={timeGrouping === 'daily' ? 80 : 60}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                className="dark:fill-neutral-400"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                className="dark:fill-neutral-400"
                label={{ value: 'Hours Logged', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '8px',
                  color: 'var(--tooltip-text)'
                }}
                labelFormatter={(label) => `${timeGrouping.charAt(0).toUpperCase() + timeGrouping.slice(1)}: ${label}`}
                formatter={(value: any, name: any) => [`${value}h`, name]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              {workloadMetrics.filter(metric => metric.totalLoggedHours > 0).map((metric, index) => (
                <Line
                  key={metric.userEmail}
                  type="monotone"
                  dataKey={metric.userName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Utilization Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('utilization-chart', 'utilization-distribution')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              title="Download Chart"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['utilization-chart'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
                <XAxis 
                  dataKey="userName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fill: '#6b7280' }}
                  className="dark:fill-neutral-400"
                />
                <YAxis 
                  tick={{ fill: '#6b7280' }}
                  className="dark:fill-neutral-400"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text)'
                  }}
                />
                <Bar dataKey="utilizationRate" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload vs Available Hours */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workload vs Available Hours</h3>
            <button
              onClick={() => downloadChartAsImage('workload-chart', 'workload-vs-available')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              title="Download Chart"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['workload-chart'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
                <XAxis dataKey="userName" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text)'
                  }}
                />
                <Bar dataKey="totalLoggedHours" fill="#10B981" name="Logged Hours" />
                <Bar dataKey="availableHours" fill="#F59E0B" name="Available Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Workload Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Daily Workload Trend</h3>
            <button
              onClick={() => downloadChartAsImage('daily-trend-chart', 'daily-workload-trend')}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Download Chart"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['daily-trend-chart'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={workloadMetrics[0]?.dailyWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text)'
                  }}
                />
                <Line type="monotone" dataKey="hours" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leave Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('leave-chart', 'leave-distribution')}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Download Chart"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div ref={(el) => { chartRefs.current['leave-chart'] = el; }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadMetrics.filter(m => m.leaveCount > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
                <XAxis dataKey="userName" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text)'
                  }}
                />
                <Bar dataKey="leaveCount" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
          <div className="space-y-3">
            {summaryMetrics.topContributors.map((contributor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-600">{index + 1}</span>
                  </div>
                  <span className="ml-3 font-medium text-gray-900">{contributor.name}</span>
                </div>
                <span className="text-sm text-gray-600">{contributor.hours}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Underutilized Members */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Underutilized Members</h3>
          <div className="space-y-3">
            {summaryMetrics.underutilizedMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    member.hasWorkLogs ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-semibold ${
                      member.hasWorkLogs ? 'text-yellow-600' : 'text-red-600'
                    }`}>{index + 1}</span>
                  </div>
                  <span className="ml-3 font-medium text-gray-900">{member.name}</span>
                </div>
                <span className="text-sm text-gray-600">{member.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Workload Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logged Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Idle Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaves</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workloadMetrics.map((metric) => (
                <tr key={metric.userEmail} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.totalLoggedHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.availableHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.utilizationRate >= 80 ? 'bg-green-100 text-green-800' :
                      metric.utilizationRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {metric.utilizationRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.overtimeHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.idleHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.leaveCount > 5 ? 'bg-red-100 text-red-800' :
                      metric.leaveCount > 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {metric.leaveCount}
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
