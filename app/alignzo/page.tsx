'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, WorkLog, Project } from '@/lib/supabase';
import { Clock, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { formatDuration, getTodayRange, getWeekRange, getMonthRange } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  totalHours: number;
}

interface ProjectHours {
  projectName: string;
  hours: number;
}

export default function UserDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    totalHours: 0,
  });
  const [projectHours, setProjectHours] = useState<ProjectHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      const userEmail = currentUser.email;

      // Get all work logs for the user
      const { data: workLogs, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = workLogs || [];
      const todayRange = getTodayRange();
      const weekRange = getWeekRange();
      const monthRange = getMonthRange();

      // Calculate stats
      const todayHours = logs
        .filter(log => {
          const logDate = new Date(log.start_time);
          return logDate >= todayRange.startOfDay && logDate <= todayRange.endOfDay;
        })
        .reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      const weekHours = logs
        .filter(log => {
          const logDate = new Date(log.start_time);
          return logDate >= weekRange.startOfWeek && logDate <= weekRange.endOfWeek;
        })
        .reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      const monthHours = logs
        .filter(log => {
          const logDate = new Date(log.start_time);
          return logDate >= monthRange.startOfMonth && logDate <= monthRange.endOfMonth;
        })
        .reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      const totalHours = logs
        .reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      setStats({
        todayHours: Math.round(todayHours * 100) / 100,
        weekHours: Math.round(weekHours * 100) / 100,
        monthHours: Math.round(monthHours * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
      });

      // Calculate project breakdown
      const projectMap = new Map<string, number>();
      logs.forEach(log => {
        const projectName = log.project?.name || 'Unknown Project';
        const hours = (log.logged_duration_seconds || 0) / 3600;
        projectMap.set(projectName, (projectMap.get(projectName) || 0) + hours);
      });

      const projectData = Array.from(projectMap.entries())
        .map(([name, hours]) => ({
          projectName: name,
          hours: Math.round(hours * 100) / 100,
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 10); // Top 10 projects

      setProjectHours(projectData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Today',
      value: `${stats.todayHours}h`,
      icon: Clock,
      color: 'bg-blue-500',
    },
    {
      title: 'This Week',
      value: `${stats.weekHours}h`,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      title: 'This Month',
      value: `${stats.monthHours}h`,
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total',
      value: `${stats.totalHours}h`,
      icon: BarChart3,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your work summary.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Breakdown Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Hours by Project</h2>
        {projectHours.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="projectName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value} hours`, 'Duration']}
                  labelFormatter={(label) => `Project: ${label}`}
                />
                <Bar dataKey="hours" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No work logs found. Start tracking your time to see project breakdown.</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No recent activity. Start a timer to begin tracking your work.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
