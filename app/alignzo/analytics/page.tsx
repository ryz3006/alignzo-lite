'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, WorkLog, Project, User, Team } from '@/lib/supabase';
import { BarChart3, PieChart, TrendingUp, Users, Download } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

interface TeamAnalytics {
  teamName: string;
  totalHours: number;
  memberCount: number;
  averageHoursPerMember: number;
}

interface ProjectAnalytics {
  projectName: string;
  totalHours: number;
  userCount: number;
  averageHoursPerUser: number;
}

interface UserAnalytics {
  userName: string;
  totalHours: number;
  projectCount: number;
  averageHoursPerProject: number;
}

export default function UserAnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics[]>([]);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('team');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      // Get all work logs with related data
      const { data: workLogs, error: logsError } = await supabase
        .from('work_logs')
        .select(`
          *,
          project:projects(*)
        `)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Get teams and team members
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(*)
        `);

      if (teamsError) throw teamsError;

      // Get users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      const logs = workLogs || [];
      const teamsData = teams || [];
      const usersData = users || [];

      // Calculate team analytics
      const teamStats = teamsData.map(team => {
        const teamMembers = team.team_members || [];
        const memberEmails = teamMembers.map((member: any) => {
          const user = usersData.find(u => u.id === member.user_id);
          return user?.email;
        }).filter(Boolean);

        const teamLogs = logs.filter(log => memberEmails.includes(log.user_email));
        const totalHours = teamLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

        return {
          teamName: team.name,
          totalHours: Math.round(totalHours * 100) / 100,
          memberCount: memberEmails.length,
          averageHoursPerMember: memberEmails.length > 0 ? Math.round((totalHours / memberEmails.length) * 100) / 100 : 0,
        };
      });

      // Calculate project analytics
      const projectMap = new Map<string, { logs: any[], users: Set<string> }>();
      logs.forEach(log => {
        const projectName = log.project?.name || 'Unknown Project';
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, { logs: [], users: new Set() });
        }
        const project = projectMap.get(projectName)!;
        project.logs.push(log);
        project.users.add(log.user_email);
      });

      const projectStats = Array.from(projectMap.entries()).map(([name, data]) => {
        const totalHours = data.logs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
        return {
          projectName: name,
          totalHours: Math.round(totalHours * 100) / 100,
          userCount: data.users.size,
          averageHoursPerUser: data.users.size > 0 ? Math.round((totalHours / data.users.size) * 100) / 100 : 0,
        };
      });

      // Calculate user analytics
      const userMap = new Map<string, { logs: any[], projects: Set<string> }>();
      logs.forEach(log => {
        if (!userMap.has(log.user_email)) {
          userMap.set(log.user_email, { logs: [], projects: new Set() });
        }
        const user = userMap.get(log.user_email)!;
        user.logs.push(log);
        user.projects.add(log.project?.name || 'Unknown Project');
      });

      const userStats = Array.from(userMap.entries()).map(([email, data]) => {
        const totalHours = data.logs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
        const userName = usersData.find(u => u.email === email)?.full_name || email;
        return {
          userName,
          totalHours: Math.round(totalHours * 100) / 100,
          projectCount: data.projects.size,
          averageHoursPerProject: data.projects.size > 0 ? Math.round((totalHours / data.projects.size) * 100) / 100 : 0,
        };
      });

      setTeamAnalytics(teamStats);
      setProjectAnalytics(projectStats);
      setUserAnalytics(userStats);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    let csvContent = '';
    let filename = '';

    if (selectedFilter === 'team') {
      csvContent = [
        ['Team Name', 'Total Hours', 'Member Count', 'Average Hours per Member'],
        ...teamAnalytics.map(team => [
          team.teamName,
          team.totalHours.toString(),
          team.memberCount.toString(),
          team.averageHoursPerMember.toString(),
        ])
      ].map(row => row.join(',')).join('\n');
      filename = 'team-analytics.csv';
    } else if (selectedFilter === 'project') {
      csvContent = [
        ['Project Name', 'Total Hours', 'User Count', 'Average Hours per User'],
        ...projectAnalytics.map(project => [
          project.projectName,
          project.totalHours.toString(),
          project.userCount.toString(),
          project.averageHoursPerUser.toString(),
        ])
      ].map(row => row.join(',')).join('\n');
      filename = 'project-analytics.csv';
    } else {
      csvContent = [
        ['User Name', 'Total Hours', 'Project Count', 'Average Hours per Project'],
        ...userAnalytics.map(user => [
          user.userName,
          user.totalHours.toString(),
          user.projectCount.toString(),
          user.averageHoursPerProject.toString(),
        ])
      ].map(row => row.join(',')).join('\n');
      filename = 'user-analytics.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getChartData = () => {
    if (selectedFilter === 'team') {
      return teamAnalytics.map(team => ({
        name: team.teamName,
        value: team.totalHours,
        memberCount: team.memberCount,
      }));
    } else if (selectedFilter === 'project') {
      return projectAnalytics.map(project => ({
        name: project.projectName,
        value: project.totalHours,
        userCount: project.userCount,
      }));
    } else {
      return userAnalytics.map(user => ({
        name: user.userName,
        value: user.totalHours,
        projectCount: user.projectCount,
      }));
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Team and project performance insights</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedFilter('team')}
            className={`px-4 py-2 rounded-md font-medium ${
              selectedFilter === 'team'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Team Analytics
          </button>
          <button
            onClick={() => setSelectedFilter('project')}
            className={`px-4 py-2 rounded-md font-medium ${
              selectedFilter === 'project'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="inline h-4 w-4 mr-2" />
            Project Analytics
          </button>
          <button
            onClick={() => setSelectedFilter('user')}
            className={`px-4 py-2 rounded-md font-medium ${
              selectedFilter === 'user'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="inline h-4 w-4 mr-2" />
            User Analytics
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {selectedFilter === 'team' ? 'Team Hours' : selectedFilter === 'project' ? 'Project Hours' : 'User Hours'}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value} hours`, 'Duration']}
                  labelFormatter={(label) => `${selectedFilter === 'team' ? 'Team' : selectedFilter === 'project' ? 'Project' : 'User'}: ${label}`}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {selectedFilter === 'team' ? 'Team Distribution' : selectedFilter === 'project' ? 'Project Distribution' : 'User Distribution'}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={getChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Duration']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedFilter === 'team' ? 'Team Details' : selectedFilter === 'project' ? 'Project Details' : 'User Details'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {selectedFilter === 'team' ? 'Team Name' : selectedFilter === 'project' ? 'Project Name' : 'User Name'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {selectedFilter === 'team' ? 'Member Count' : selectedFilter === 'project' ? 'User Count' : 'Project Count'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Hours
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(selectedFilter === 'team' ? teamAnalytics : selectedFilter === 'project' ? projectAnalytics : userAnalytics).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedFilter === 'team' ? (item as TeamAnalytics).teamName : 
                       selectedFilter === 'project' ? (item as ProjectAnalytics).projectName : 
                       (item as UserAnalytics).userName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {selectedFilter === 'team' ? (item as TeamAnalytics).totalHours : 
                       selectedFilter === 'project' ? (item as ProjectAnalytics).totalHours : 
                       (item as UserAnalytics).totalHours}h
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {selectedFilter === 'team' ? (item as TeamAnalytics).memberCount : 
                       selectedFilter === 'project' ? (item as ProjectAnalytics).userCount : 
                       (item as UserAnalytics).projectCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {selectedFilter === 'team' ? (item as TeamAnalytics).averageHoursPerMember : 
                       selectedFilter === 'project' ? (item as ProjectAnalytics).averageHoursPerUser : 
                       (item as UserAnalytics).averageHoursPerProject}h
                    </div>
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
