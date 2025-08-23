'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { WorkLog, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  RefreshCw, 
  Users, 
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
  Timer,
  ChevronRight,
  User,
  Building2,
  CalendarDays,
  Clock3
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

// Helper function to safely get shift type info
const getShiftTypeInfo = (shiftType: string) => {
  if (shiftType in SHIFT_TYPES) {
    return SHIFT_TYPES[shiftType as ShiftType];
  }
  return {
    label: shiftType,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    icon: Clock3
  };
};

interface DashboardData {
  user: any;
  stats: DashboardStats;
  projectHours: ProjectHours[];
  recentWorkLogs: WorkLogWithProject[];
  userShift: UserShift | null;
  teamAvailability: TeamAvailability[];
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string; icon: any } } = {
  M: { label: 'Morning', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: Sun },
  A: { label: 'Afternoon', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: Sun },
  N: { label: 'Night', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Moon },
  G: { label: 'General', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: Clock3 },
  H: { label: 'Holiday', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: CalendarDays },
  L: { label: 'Leave', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', icon: User }
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function DashboardNew() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize dashboard
  useEffect(() => {
    setMounted(true);
    initializeDashboard();
    
    // Check system preference for dark mode
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser?.email) {
        toast.error('User not authenticated');
        return;
      }

      // Load all data in parallel for better performance
      const [stats, projectHours, recentWorkLogs, userShift, teamAvailability] = await Promise.all([
        loadUserStats(currentUser.email),
        loadProjectHours(currentUser.email),
        loadRecentWorkLogs(currentUser.email),
        loadUserShifts(currentUser.email),
        loadTeamAvailability(currentUser.email)
      ]);

      setData({
        user: currentUser,
        stats,
        projectHours,
        recentWorkLogs,
        userShift,
        teamAvailability
      });
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userEmail: string): Promise<DashboardStats> => {
    try {
      const todayRange = getTodayRange();
      const weekRange = getWeekRange();
      const monthRange = getMonthRange();
      const yearStart = new Date(new Date().getFullYear(), 0, 1);

      const [todayResponse, weekResponse, monthResponse, yearResponse, totalResponse] = await Promise.all([
        supabaseClient.get('work_logs', {
          select: 'logged_duration_seconds',
          filters: {
            user_email: userEmail,
            start_time_gte: todayRange.start.toISOString(),
            start_time_lte: todayRange.end.toISOString()
          }
        }),
        supabaseClient.get('work_logs', {
          select: 'logged_duration_seconds',
          filters: {
            user_email: userEmail,
            start_time_gte: weekRange.start.toISOString(),
            start_time_lte: weekRange.end.toISOString()
          }
        }),
        supabaseClient.get('work_logs', {
          select: 'logged_duration_seconds',
          filters: {
            user_email: userEmail,
            start_time_gte: monthRange.start.toISOString(),
            start_time_lte: monthRange.end.toISOString()
          }
        }),
        supabaseClient.get('work_logs', {
          select: 'logged_duration_seconds',
          filters: {
            user_email: userEmail,
            start_time_gte: yearStart.toISOString()
          }
        }),
        supabaseClient.get('work_logs', {
          select: 'logged_duration_seconds',
          filters: { user_email: userEmail }
        })
      ]);

      const calculateTotalSeconds = (data: any[]) => 
        data.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0);

      return {
        todayHours: calculateTotalSeconds(todayResponse.data || []) / 3600,
        weekHours: calculateTotalSeconds(weekResponse.data || []) / 3600,
        monthHours: calculateTotalSeconds(monthResponse.data || []) / 3600,
        yearHours: calculateTotalSeconds(yearResponse.data || []) / 3600,
        totalHours: calculateTotalSeconds(totalResponse.data || []) / 3600
      };
    } catch (error) {
      console.error('Error loading user stats:', error);
      return { todayHours: 0, weekHours: 0, monthHours: 0, yearHours: 0, totalHours: 0 };
    }
  };

  const loadProjectHours = async (userEmail: string): Promise<ProjectHours[]> => {
    try {
      const response = await supabaseClient.get('work_logs', {
        select: 'logged_duration_seconds,project:projects(name)',
        filters: { user_email: userEmail },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) throw new Error(response.error);

      const projectMap = new Map<string, number>();
      (response.data || []).forEach((log: any) => {
        const projectName = log.project?.name || 'Unknown Project';
        projectMap.set(projectName, (projectMap.get(projectName) || 0) + (log.logged_duration_seconds || 0));
      });

      return Array.from(projectMap.entries()).map(([name, seconds], index) => ({
        projectName: name,
        hours: seconds / 3600,
        color: COLORS[index % COLORS.length]
      })).sort((a, b) => b.hours - a.hours).slice(0, 8);
    } catch (error) {
      console.error('Error loading project hours:', error);
      return [];
    }
  };

  const loadRecentWorkLogs = async (userEmail: string): Promise<WorkLogWithProject[]> => {
    try {
      const response = await supabaseClient.get('work_logs', {
        select: '*,project:projects(*)',
        filters: { user_email: userEmail },
        order: { column: 'created_at', ascending: false },
        limit: 5
      });

      if (response.error) throw new Error(response.error);
      return response.data || [];
    } catch (error) {
      console.error('Error loading recent work logs:', error);
      return [];
    }
  };

  const loadUserShifts = async (userEmail: string): Promise<UserShift | null> => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayResponse, tomorrowResponse] = await Promise.all([
        supabaseClient.get('shift_schedules', {
          select: 'shift_type,project:projects(name),team:teams(name)',
          filters: {
            user_email: userEmail,
            shift_date: today.toISOString().split('T')[0]
          }
        }),
        supabaseClient.get('shift_schedules', {
          select: 'shift_type,project:projects(name),team:teams(name)',
          filters: {
            user_email: userEmail,
            shift_date: tomorrow.toISOString().split('T')[0]
          }
        })
      ]);

      const todayShift = todayResponse.data?.[0];
      const tomorrowShift = tomorrowResponse.data?.[0];

      if (!todayShift && !tomorrowShift) return null;

      return {
        todayShift: todayShift?.shift_type || 'G',
        tomorrowShift: tomorrowShift?.shift_type || 'G',
        todayShiftName: todayShift ? `${todayShift.project?.name} - ${todayShift.team?.name}` : 'No Shift',
        tomorrowShiftName: tomorrowShift ? `${tomorrowShift.project?.name} - ${tomorrowShift.team?.name}` : 'No Shift',
        todayShiftColor: getShiftTypeInfo(todayShift?.shift_type || 'G').color,
        tomorrowShiftColor: getShiftTypeInfo(tomorrowShift?.shift_type || 'G').color,
        todayShiftTime: todayShift ? `${getShiftTypeInfo(todayShift.shift_type).label}` : undefined,
        tomorrowShiftTime: tomorrowShift ? `${getShiftTypeInfo(tomorrowShift.shift_type).label}` : undefined
      };
    } catch (error) {
      console.error('Error loading user shifts:', error);
      return null;
    }
  };

  const loadTeamAvailability = async (userEmail: string): Promise<TeamAvailability[]> => {
    try {
      // Get user's teams and projects
      const userResponse = await supabaseClient.get('team_members', {
        select: 'team:teams(id,name)',
        filters: { user_id: userEmail }
      });

      if (userResponse.error) throw new Error(userResponse.error);
      const userTeams = userResponse.data || [];

      const teamAvailability: TeamAvailability[] = [];

      for (const teamMember of userTeams) {
        const team = teamMember.team;
        
        // Get projects for this team
        const projectResponse = await supabaseClient.get('team_project_assignments', {
          select: 'project:projects(id,name)',
          filters: { team_id: team.id }
        });

        if (projectResponse.error) continue;
        const projects = projectResponse.data || [];

        for (const projectAssignment of projects) {
          const project = projectAssignment.project;
          
          // Get today's shifts for this team-project combination
          const shiftsResponse = await supabaseClient.get('shift_schedules', {
            select: 'shift_type,user_email,user:users(full_name)',
            filters: {
              project_id: project.id,
              team_id: team.id,
              shift_date: new Date().toISOString().split('T')[0]
            }
          });

          if (shiftsResponse.error) continue;

          const shifts = shiftsResponse.data || [];
          const shiftMap: { [key: string]: { users: string[]; count: number } } = {};

          shifts.forEach((shift: any) => {
            const shiftType = shift.shift_type;
            if (!shiftMap[shiftType]) {
              shiftMap[shiftType] = { users: [], count: 0 };
            }
            shiftMap[shiftType].users.push(shift.user?.full_name || shift.user_email);
            shiftMap[shiftType].count++;
          });

          // Get custom shift enums for this team-project
          const customEnumsResponse = await supabaseClient.get('custom_shift_enums', {
            select: '*',
            filters: {
              project_id: project.id,
              team_id: team.id
            }
          });

          teamAvailability.push({
            teamName: team.name,
            projectName: project.name,
            shifts: shiftMap,
            customEnums: customEnumsResponse.data || []
          });
        }
      }

      return teamAvailability;
    } catch (error) {
      console.error('Error loading team availability:', error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
    toast.success('Dashboard refreshed!');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Failed to load dashboard data</p>
          <button 
            onClick={initializeDashboard}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Alignzo Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome, {data.user?.full_name?.split(' ')[0] || 'User'}! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  Here's your work summary for today
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Today', value: data.stats.todayHours, icon: Clock, color: 'from-blue-500 to-blue-600' },
            { label: 'This Week', value: data.stats.weekHours, icon: Calendar, color: 'from-green-500 to-green-600' },
            { label: 'This Month', value: data.stats.monthHours, icon: BarChart3, color: 'from-purple-500 to-purple-600' },
            { label: 'This Year', value: data.stats.yearHours, icon: TrendingUp, color: 'from-orange-500 to-orange-600' }
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 transform hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value.toFixed(1)}h
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Shift Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
                My Shifts
              </h2>
            </div>
            
            {data.userShift ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${getShiftTypeInfo(data.userShift.todayShift).bgColor} rounded-lg flex items-center justify-center`}>
                      {React.createElement(getShiftTypeInfo(data.userShift.todayShift).icon, { className: `w-5 h-5 ${getShiftTypeInfo(data.userShift.todayShift).color}` })}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Today</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{data.userShift.todayShiftName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getShiftTypeInfo(data.userShift.todayShift).color}`}>
                      {getShiftTypeInfo(data.userShift.todayShift).label}
                    </p>
                    {data.userShift.todayShiftTime && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{data.userShift.todayShiftTime}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${getShiftTypeInfo(data.userShift.tomorrowShift).bgColor} rounded-lg flex items-center justify-center`}>
                      {React.createElement(getShiftTypeInfo(data.userShift.tomorrowShift).icon, { className: `w-5 h-5 ${getShiftTypeInfo(data.userShift.tomorrowShift).color}` })}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Tomorrow</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{data.userShift.tomorrowShiftName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getShiftTypeInfo(data.userShift.tomorrowShift).color}`}>
                      {getShiftTypeInfo(data.userShift.tomorrowShift).label}
                    </p>
                    {data.userShift.tomorrowShiftTime && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{data.userShift.tomorrowShiftTime}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No shifts scheduled</p>
              </div>
            )}
          </div>

          {/* Project Hours Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                Project Hours
              </h2>
            </div>
            
            {data.projectHours.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.projectHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis 
                      dataKey="projectName" 
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(1)}h`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#374151' : '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`${value.toFixed(1)} hours`, 'Duration']}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {data.projectHours.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No project data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Availability */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Today's Team Availability
            </h2>
          </div>
          
          {data.teamAvailability.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.teamAvailability.map((team, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{team.teamName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{team.projectName}</p>
                    </div>
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(team.shifts).map(([shiftType, shiftData]) => (
                      <div key={shiftType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 ${getShiftTypeInfo(shiftType).bgColor} rounded-full`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getShiftTypeInfo(shiftType).label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {shiftData.count} available
                          </span>
                          <div className="flex -space-x-1">
                            {shiftData.users.slice(0, 3).map((user, userIndex) => (
                              <div
                                key={userIndex}
                                className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center"
                                title={user}
                              >
                                <span className="text-xs text-white font-medium">
                                  {user.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                            {shiftData.users.length > 3 && (
                              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                <span className="text-xs text-gray-600 dark:text-gray-700 font-medium">
                                  +{shiftData.users.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No team availability data</p>
            </div>
          )}
        </div>

        {/* Recent Work Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-600" />
              Recent Work Logs
            </h2>
            <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {data.recentWorkLogs.length > 0 ? (
            <div className="space-y-4">
              {data.recentWorkLogs.map((log, index) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Timer className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{log.ticket_id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{log.project?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatDuration(log.logged_duration_seconds)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(log.start_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recent work logs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
