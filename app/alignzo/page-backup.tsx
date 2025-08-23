'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentUser, getUserIdFromEmail } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { WorkLog, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  RefreshCw, 
  Users, 
  Eye, 
  Activity, 
  Target, 
  Zap, 
  X,
  Sun,
  Moon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Timer
} from 'lucide-react';
import { formatDuration, formatDateTime, formatTimeAgo, getTodayRange, getWeekRange, getMonthRange } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

interface DashboardStats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  yearHours: number;
  totalHours: number;
}

interface ProjectHours {
  projectName: string;
  hours: number;
  color: string;
}

interface WorkLogWithProject extends WorkLog {
  project: Project;
}

interface UserShift {
  todayShift: string;
  tomorrowShift: string;
  todayShiftName: string;
  tomorrowShiftName: string;
  todayShiftColor: string;
  tomorrowShiftColor: string;
  todayShiftTime?: string;
  tomorrowShiftTime?: string;
}

interface TeamAvailability {
  teamName: string;
  projectName: string;
  shifts: {
    [key: string]: {
      users: string[];
      count: number;
    };
  };
  customEnums: any[];
}

interface DashboardData {
  user: any;
  stats: DashboardStats;
  projectHours: ProjectHours[];
  recentWorkLogs: WorkLogWithProject[];
  userShift: UserShift | null;
  teamAvailability: TeamAvailability[];
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string; icon: any } } = {
  M: { label: 'Morning', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20', icon: Sun },
  A: { label: 'Afternoon', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/20', icon: Sun },
  N: { label: 'Night', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', icon: Moon },
  G: { label: 'General/Day', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20', icon: Sun },
  H: { label: 'Holiday', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/20', icon: CheckCircle },
  L: { label: 'Leave', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', icon: AlertCircle },
};

const PROJECT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export default function UserDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    user: null,
    stats: { todayHours: 0, weekHours: 0, monthHours: 0, yearHours: 0, totalHours: 0 },
    projectHours: [],
    recentWorkLogs: [],
    userShift: null,
    teamAvailability: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Check system preference for dark mode
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Load all data in parallel for better performance
      const [
        userResult,
        workLogsResult,
        shiftsResult,
        teamsResult
      ] = await Promise.allSettled([
        loadUser(),
        loadWorkLogs(),
        loadShiftInformation(),
        loadTeamAvailability()
      ]);

      // Handle results and update state
      const newData: Partial<DashboardData> = {};
      
      if (userResult.status === 'fulfilled') {
        newData.user = userResult.value;
      }
      
      if (workLogsResult.status === 'fulfilled') {
        const { stats, projectHours, recentWorkLogs } = workLogsResult.value;
        newData.stats = stats;
        newData.projectHours = projectHours;
        newData.recentWorkLogs = recentWorkLogs;
      }
      
      if (shiftsResult.status === 'fulfilled') {
        newData.userShift = shiftsResult.value;
      }
      
      if (teamsResult.status === 'fulfilled') {
        newData.teamAvailability = teamsResult.value;
      }

      setDashboardData(prev => ({ ...prev, ...newData }));
      
      if (isRefresh) {
        toast.success('Dashboard refreshed successfully!');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      throw new Error('No user email found');
    }
    return currentUser;
  };

  const loadWorkLogs = async () => {
    if (!dashboardData.user?.email) return { stats: dashboardData.stats, projectHours: [], recentWorkLogs: [] };
    
    const response = await supabaseClient.getUserWorkLogs(dashboardData.user.email, {
      order: { column: 'created_at', ascending: false }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const logs = response.data || [];
    const todayRange = getTodayRange();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    // Calculate stats efficiently
    const stats = {
      todayHours: calculateHoursInRange(logs, todayRange.start, todayRange.end),
      weekHours: calculateHoursInRange(logs, weekRange.start, weekRange.end),
      monthHours: calculateHoursInRange(logs, monthRange.start, monthRange.end),
      yearHours: calculateHoursInRange(logs, yearStart, new Date()),
      totalHours: logs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600
    };

    // Calculate project breakdown with colors
    const projectMap = new Map<string, number>();
    logs.forEach((log: any) => {
      const projectName = log.project?.name || 'Unknown Project';
      const hours = (log.logged_duration_seconds || 0) / 3600;
      projectMap.set(projectName, (projectMap.get(projectName) || 0) + hours);
    });

    const projectData = Array.from(projectMap.entries())
      .map(([name, hours], index) => ({
        projectName: name,
        hours: Math.round(hours * 100) / 100,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);

    return {
      stats,
      projectHours: projectData,
      recentWorkLogs: logs.slice(0, 5)
    };
  };

  const calculateHoursInRange = (logs: any[], start: Date, end: Date) => {
    return logs
      .filter((log: any) => {
        const logDate = new Date(log.start_time);
        return logDate >= start && logDate <= end;
      })
      .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
  };

  const loadShiftInformation = async () => {
    if (!dashboardData.user?.email) return null;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const shiftsResponse = await supabaseClient.getShiftSchedules({
      filters: { 
        user_email: dashboardData.user.email,
        shift_date: [todayStr, tomorrowStr]
      }
    });

    if (shiftsResponse.error) {
      throw new Error(shiftsResponse.error);
    }

    const shifts = shiftsResponse.data;
    const todayShift = shifts?.find((s: any) => s.shift_date === todayStr)?.shift_type || 'G';
    const tomorrowShift = shifts?.find((s: any) => s.shift_date === tomorrowStr)?.shift_type || 'G';

    const getShiftDisplay = (shiftType: string) => {
      const shiftInfo = SHIFT_TYPES[shiftType as ShiftType];
      return {
        name: shiftInfo?.label || 'General',
        color: shiftInfo?.color || '#3B82F6',
        bgColor: shiftInfo?.bgColor || 'bg-blue-100 dark:bg-blue-900/20',
        icon: shiftInfo?.icon || Sun
      };
    };

    const todayShiftInfo = getShiftDisplay(todayShift);
    const tomorrowShiftInfo = getShiftDisplay(tomorrowShift);

    return {
      todayShift,
      tomorrowShift,
      todayShiftName: todayShiftInfo.name,
      tomorrowShiftName: tomorrowShiftInfo.name,
      todayShiftColor: todayShiftInfo.color,
      tomorrowShiftColor: tomorrowShiftInfo.color,
      todayShiftBgColor: todayShiftInfo.bgColor,
      tomorrowShiftBgColor: tomorrowShiftInfo.bgColor,
      todayShiftIcon: todayShiftInfo.icon,
      tomorrowShiftIcon: tomorrowShiftInfo.icon
    };
  };

  const loadTeamAvailability = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const teamsResponse = await supabaseClient.getTeams();
    if (teamsResponse.error) {
      throw new Error(teamsResponse.error);
    }

    const teams = teamsResponse.data || [];
    const availability: TeamAvailability[] = [];

    // Process teams in parallel for better performance
    const teamPromises = teams.map(async (team) => {
      try {
        const [teamMembersResponse, shiftsResponse] = await Promise.all([
          supabaseClient.getTeamMembers(team.id),
          supabaseClient.getShiftSchedules({
            filters: { team_id: team.id, shift_date: today }
          })
        ]);

        if (teamMembersResponse.error || shiftsResponse.error) {
          return null;
        }

        const teamMembers = teamMembersResponse.data || [];
        const shifts = shiftsResponse.data || [];

        // Group users by shift type
        const shiftGroups: { [key: string]: { users: string[], count: number } } = {};
        
        teamMembers.forEach((member: any) => {
          const userEmail = member.users?.email;
          if (!userEmail) return;
          
          const shift = shifts.find((s: any) => s.user_email === userEmail);
          const shiftType = shift?.shift_type || 'G';
          
          if (!shiftGroups[shiftType]) {
            shiftGroups[shiftType] = { users: [], count: 0 };
          }
          shiftGroups[shiftType].users.push(userEmail);
          shiftGroups[shiftType].count++;
        });

        // Get project name for this team
        let projectName = 'Unknown Project';
        try {
          const projectResponse = await supabaseClient.get('team_project_assignments', {
            select: 'project_id',
            filters: { team_id: team.id }
          });

          if (!projectResponse.error && projectResponse.data && projectResponse.data.length > 0) {
            const projectId = projectResponse.data[0].project_id;
            const projectDetailsResponse = await supabaseClient.get('projects', {
              select: 'name',
              filters: { id: projectId }
            });

            if (!projectDetailsResponse.error && projectDetailsResponse.data) {
              projectName = projectDetailsResponse.data[0]?.name || 'Unknown Project';
            }
          }
        } catch (error) {
          console.error(`Error loading project for team ${team.id}:`, error);
        }

        return {
          teamName: team.name,
          projectName,
          shifts: shiftGroups,
          customEnums: []
        };
      } catch (error) {
        console.error(`Error processing team ${team.id}:`, error);
        return null;
      }
    });

    const teamResults = await Promise.all(teamPromises);
    return teamResults.filter(Boolean) as TeamAvailability[];
  };

  const showUserDetails = async (email: string) => {
    try {
      const response = await supabaseClient.get('users', {
        select: 'full_name, email, phone_number',
        filters: { email }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const user = response.data?.[0];
      setSelectedUser(user);
      setShowUserDetailsModal(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const statCards = useMemo(() => [
    {
      title: 'Today',
      value: `${dashboardData.stats.todayHours.toFixed(1)}h`,
      icon: Clock,
      gradient: 'from-blue-500 to-blue-600',
      description: 'Hours worked today',
      trend: 'up',
      trendValue: '+12%'
    },
    {
      title: 'This Week',
      value: `${dashboardData.stats.weekHours.toFixed(1)}h`,
      icon: Calendar,
      gradient: 'from-purple-500 to-purple-600',
      description: 'Hours worked this week',
      trend: 'up',
      trendValue: '+8%'
    },
    {
      title: 'This Month',
      value: `${dashboardData.stats.monthHours.toFixed(1)}h`,
      icon: TrendingUp,
      gradient: 'from-green-500 to-green-600',
      description: 'Hours worked this month',
      trend: 'up',
      trendValue: '+15%'
    },
    {
      title: 'This Year',
      value: `${dashboardData.stats.yearHours.toFixed(1)}h`,
      icon: BarChart3,
      gradient: 'from-orange-500 to-orange-600',
      description: 'Hours worked this year',
      trend: 'up',
      trendValue: '+22%'
    },
  ], [dashboardData.stats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-64"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-48"></div>
              </div>
            </div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Welcome and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing}
              className="group p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft hover:shadow-medium hover:-translate-y-0.5"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                  Welcome back, {dashboardData.user?.full_name || dashboardData.user?.email?.split('@')[0] || 'User'}! 👋
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-lg">
                  Here's your work summary and shift information for today.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft hover:shadow-medium"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Shift Information Cards */}
        {dashboardData.userShift && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Today's Shift</h3>
                  </div>
                  <p className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                    {dashboardData.userShift.todayShiftName}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-medium bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                  <dashboardData.userShift.todayShiftIcon className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Tomorrow's Shift</h3>
                  </div>
                  <p className="text-4xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                    {dashboardData.userShift.tomorrowShiftName}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-medium bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                  <dashboardData.userShift.tomorrowShiftIcon className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div 
              key={stat.title} 
              className="group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-medium group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">
                      {stat.value}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">{stat.title}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">{stat.description}</p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">{stat.trendValue}</span>
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Availability and Project Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Availability */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary-600" />
                  <span>Today's Team Availability</span>
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                <UserCheck className="h-4 w-4" />
                <span>{dashboardData.teamAvailability.length} teams</span>
              </div>
            </div>
            
            {dashboardData.teamAvailability.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-modern">
                {dashboardData.teamAvailability.map((team, teamIndex) => (
                  <div 
                    key={team.teamName}
                    className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-600"
                    style={{ animationDelay: `${teamIndex * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{team.teamName}</h3>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-600 px-2 py-1 rounded-full">
                        {team.projectName}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(team.shifts).map(([shiftType, shiftData]) => {
                        const shiftInfo = SHIFT_TYPES[shiftType as ShiftType];
                        return (
                          <div key={shiftType} className="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg">
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                              {shiftInfo?.label || shiftType}
                            </span>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {shiftData.count}
                              </span>
                              <Users className="h-3 w-3 text-neutral-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400 font-medium">No team availability data found.</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Team schedules will appear here once configured.</p>
              </div>
            )}
          </div>

          {/* Project Breakdown Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                  <span>Hours by Project</span>
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Your time distribution across projects</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Timer className="h-4 w-4" />
                <span>{dashboardData.projectHours.length} projects</span>
              </div>
            </div>
            {dashboardData.projectHours.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.projectHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="projectName" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis tick={{ fill: '#6b7280' }} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} hours`, 'Duration']}
                      labelFormatter={(label) => `Project: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {dashboardData.projectHours.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400 font-medium">No work logs found</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Start tracking your time to see project breakdown.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary-600" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Your latest work sessions</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Clock className="h-4 w-4" />
              <span>{dashboardData.recentWorkLogs.length} activities</span>
            </div>
          </div>
          <div className="space-y-4">
            {dashboardData.recentWorkLogs.length > 0 ? (
              dashboardData.recentWorkLogs.map((log, index) => (
                <div 
                  key={log.id} 
                  className="group flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-all duration-200 hover:shadow-soft"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {log.project?.name || 'Unknown Project'}
                      </h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                        {log.ticket_id} - {log.task_detail}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {formatDateTime(log.start_time)} • {formatDuration(log.logged_duration_seconds)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTimeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400 font-medium">No recent activity</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Start a timer to begin tracking your work.</p>
              </div>
            )}
          </div>
        </div>

        {/* User Details Modal */}
        {showUserDetailsModal && selectedUser && (
          <div className="modal-overlay" onClick={() => setShowUserDetailsModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">User Details</h2>
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Name</label>
                    <p className="text-sm text-neutral-900 dark:text-white">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <p className="text-sm text-neutral-900 dark:text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <p className="text-sm text-neutral-900 dark:text-white">{selectedUser.phone_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
