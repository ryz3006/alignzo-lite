'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Users, FolderOpen, Clock, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalWorkLogs: number;
  totalHours: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalWorkLogs: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get total users
      const usersResponse = await supabaseClient.get('users', { select: '*' });
      const usersCount = usersResponse.data?.length || 0;

      // Get total projects
      const projectsResponse = await supabaseClient.get('projects', { select: '*' });
      const projectsCount = projectsResponse.data?.length || 0;

      // Get total work logs and hours
      const workLogsResponse = await supabaseClient.get('work_logs', { select: 'logged_duration_seconds' });
      const workLogsCount = workLogsResponse.data?.length || 0;
      const totalHours = workLogsResponse.data?.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) || 0;

      setStats({
        totalUsers: usersCount,
        totalProjects: projectsCount,
        totalWorkLogs: workLogsCount,
        totalHours: Math.round(totalHours / 3600 * 100) / 100, // Convert seconds to hours
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'bg-green-500',
    },
    {
      title: 'Total Work Logs',
      value: stats.totalWorkLogs,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Hours',
      value: `${stats.totalHours}h`,
      icon: TrendingUp,
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
        <p className="text-gray-600">Overview of your work log tracking system</p>
      </div>

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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-primary-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-600">Add, edit, or remove users</p>
              </div>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center">
              <FolderOpen className="h-5 w-5 text-primary-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Manage Projects</p>
                <p className="text-sm text-gray-600">Create and configure projects</p>
              </div>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary-600 mr-3" />
              <div className="text-left">
                <p className="font-medium text-gray-900">View Reports</p>
                <p className="text-sm text-gray-600">Analyze work logs and data</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
