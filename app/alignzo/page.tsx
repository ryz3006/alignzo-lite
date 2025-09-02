'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentUser, getUserIdFromEmail } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { getDashboardDataWithCache } from '@/lib/user-api-client';
import { WorkLog, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
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
  Timer,
  RefreshCw
} from 'lucide-react';
import { formatDuration, formatDateTime, formatTimeAgo, getTodayRange, getWeekRange, getMonthRange, getTodayString, getTomorrowString } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { useDashboardRefresh } from '@/components/DashboardRefreshContext';
import { useTheme } from '@/hooks/useTheme';

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
  projectId?: string;
  teamId?: string;
}

interface TeamAvailability {
  teamName: string;
  projectName: string;
  projectId: string;
  teamId: string;
  shifts: {
    [key: string]: {
      users: string[];
      count: number;
    };
  };
  customEnums: {
    shiftIdentifier: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    isDefault: boolean;
    color?: string;
  }[];
}

interface DashboardData {
  user: any;
  stats: DashboardStats;
  projectHours: ProjectHours[];
  recentWorkLogs: WorkLogWithProject[];
  userShift: UserShift | null;
  teamAvailability: TeamAvailability[];
}

// Function to get shift icon component
const getShiftIcon = (shiftType: string) => {
  const iconMap: { [key: string]: any } = {
    'G': Sun,
    'N': Moon,
    'E': Sun,
    'H': Calendar,
    'M': Clock
  };
  return iconMap[shiftType] || Sun;
};

// Dynamic shift type mapping function
const getShiftTypeInfo = (shiftType: string, customEnums: any[] = []) => {
  // First try to find in custom enums
  const customShift = customEnums.find(enum_ => enum_.shiftIdentifier === shiftType);
  if (customShift) {
    return {
      label: customShift.shiftName,
      color: customShift.color ? `text-[${customShift.color}]` : 'text-blue-600',
      bgColor: customShift.color ? `bg-[${customShift.color}]/10 dark:bg-[${customShift.color}]/20` : 'bg-blue-100 dark:bg-blue-900/20',
      icon: Sun, // Default icon for custom shifts
      startTime: customShift.startTime,
      endTime: customShift.endTime
    };
  }

  // Fallback to default shift types based on the actual enum values in the database
  const defaultShifts: { [key: string]: { label: string; color: string; bgColor: string; icon: any; startTime?: string; endTime?: string } } = {
    M: { label: 'Morning', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20', icon: Sun },
    A: { label: 'Afternoon', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/20', icon: Sun },
    N: { label: 'Night', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', icon: Moon },
    G: { label: 'General/Day', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20', icon: Sun },
    H: { label: 'Holiday', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/20', icon: CheckCircle },
    L: { label: 'Leave', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', icon: AlertCircle },
    E: { label: 'Evening', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/20', icon: Moon }, // Evening shift
  };

  return defaultShifts[shiftType] || defaultShifts['G'];
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
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { isDark } = useTheme();
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{shiftType: string, teamName: string, projectName: string} | null>(null);
  const [shiftUsers, setShiftUsers] = useState<any[]>([]);
  const [loadingShiftUsers, setLoadingShiftUsers] = useState(false);
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const { isRefreshing } = useDashboardRefresh();
  const [expectedHours, setExpectedHours] = useState<{ today: number; week: number; month: number }>({ today: 0, week: 0, month: 0 });

  // Theme is now managed globally by the shared hook

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      console.log('🔄 Loading dashboard data with cache...');
      
      // Try to load from cache first
      const cachedData = await getDashboardDataWithCache();
      
      if (cachedData) {
        console.log('✅ Dashboard data loaded from cache');
        setDashboardData(cachedData);
        setGreetingLoaded(true);
        setIsLoading(false);
        setIsLoadingShifts(false);
        return;
      }

      console.log('🔄 Cache miss, loading from database...');

      // Load user first for quick greeting display
      const userResult = await loadUser();
      if (userResult) {
        setDashboardData(prev => ({ ...prev, user: userResult }));
        setGreetingLoaded(true);
      }



      // Load rest of the data in parallel (only if cache miss)
      const [workLogsResult, teamsResult, expectedHoursResult] = await Promise.allSettled([
        loadWorkLogs(),
        loadTeamAvailability(),
        loadExpectedHoursForPeriods()
      ]);

      // Handle results and update state
      const newData: Partial<DashboardData> = {};
      
      if (workLogsResult.status === 'fulfilled') {
        const { stats, projectHours, recentWorkLogs } = workLogsResult.value;
        newData.stats = stats;
        newData.projectHours = projectHours;
        newData.recentWorkLogs = recentWorkLogs;
      }
      
      if (teamsResult.status === 'fulfilled') {
        newData.teamAvailability = teamsResult.value;
      }

      setDashboardData(prev => ({ ...prev, ...newData }));

      if (expectedHoursResult.status === 'fulfilled') {
        setExpectedHours(expectedHoursResult.value);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const loadExpectedHoursForPeriods = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return { today: 0, week: 0, month: 0 };

      const todayStr = getTodayString();
      const { start: weekStart, end: weekEnd } = getWeekRange();
      const { start: monthStart, end: monthEnd } = getMonthRange();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabaseClient.getShiftSchedules({
          filters: { user_email: currentUser.email, shift_date_in: [todayStr] }
        }),
        supabaseClient.getShiftSchedules({
          filters: { user_email: currentUser.email, shift_date_gte: formatYMD(weekStart), shift_date_lte: formatYMD(weekEnd) }
        }),
        supabaseClient.getShiftSchedules({
          filters: { user_email: currentUser.email, shift_date_gte: formatYMD(monthStart), shift_date_lte: formatYMD(monthEnd) }
        })
      ]);

      const countWorking = (rows: any[]) => rows.filter((r: any) => r.shift_type && !['H','L'].includes(r.shift_type)).length;
      const todayCount = countWorking(todayRes.data || []);
      const weekCount = countWorking(weekRes.data || []);
      const monthCount = countWorking(monthRes.data || []);

      return {
        today: todayCount * 8,
        week: weekCount * 8,
        month: monthCount * 8,
      };
    } catch (e) {
      console.error('Failed to load expected hours:', e);
      return { today: 0, week: 0, month: 0 };
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Reload dashboard data when refresh is triggered
  useEffect(() => {
    if (isRefreshing) {
      loadDashboardData();
    }
  }, [isRefreshing, loadDashboardData]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      throw new Error('No user email found');
    }
    
    // Fetch user's complete profile from database including full_name
    try {
      const response = await supabaseClient.get('users', {
        select: 'id, email, full_name, phone_number',
        filters: { email: currentUser.email }
      });

      if (response.error) {
        console.error('Error fetching user profile:', response.error);
        // Return Firebase user data as fallback
        return currentUser;
      }

      const userProfile = response.data?.[0];
      if (userProfile) {
        // Merge Firebase user data with database profile
        return {
          ...currentUser,
          full_name: userProfile.full_name,
          phone_number: userProfile.phone_number,
          user_id: userProfile.id
        } as any; // Use any to avoid type conflicts
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
    
    // Return Firebase user data as fallback
    return currentUser;
  };

  const loadWorkLogs = async () => {
    // Get current user email directly instead of relying on dashboardData.user
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.log('❌ No user email found in loadWorkLogs, returning empty data');
      return { stats: dashboardData.stats, projectHours: [], recentWorkLogs: [] };
    }
    
    const response = await supabaseClient.getUserWorkLogs(currentUser.email, {
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
    // Get current user email directly instead of relying on dashboardData.user
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.log('❌ No user email found, returning default shift');
      return {
        todayShift: 'G',
        tomorrowShift: 'G',
        todayShiftName: 'General',
        tomorrowShiftName: 'General',
        todayShiftColor: 'text-green-600',
        tomorrowShiftColor: 'text-green-600',
        todayShiftTime: undefined,
        tomorrowShiftTime: undefined,
        todayShiftIcon: Sun,
        tomorrowShiftIcon: Sun,
        projectId: undefined,
        teamId: undefined
      };
    }
    
    const todayStr = getTodayString();
    const tomorrowStr = getTomorrowString();

    console.log('🔄 Loading shift information for:', currentUser.email);
    console.log('📅 Date range:', { today: todayStr, tomorrow: tomorrowStr });

    try {
            // Get user's shifts for today and tomorrow - using the same logic as shift schedule page
      console.log('🔍 Querying shifts for user:', currentUser.email);
      console.log('📅 Today:', todayStr, 'Tomorrow:', tomorrowStr);
      
      const shiftsResponse = await supabaseClient.getShiftSchedules({
        filters: { 
          user_email: currentUser.email,
          shift_date_in: [todayStr, tomorrowStr]
        }
      });

      if (shiftsResponse.error) {
        console.error('❌ Error fetching shifts:', shiftsResponse.error);
        throw new Error(shiftsResponse.error);
      }

      const shifts = shiftsResponse.data || [];
      console.log('📋 Found shifts:', shifts);
      
      const todayShift = shifts?.find((s: any) => s.shift_date === todayStr);
      const tomorrowShift = shifts?.find((s: any) => s.shift_date === tomorrowStr);
      
      // Use the same logic as shift schedule page - always provide a fallback
      const todayShiftType = todayShift?.shift_type || 'G';
      const tomorrowShiftType = tomorrowShift?.shift_type || 'G';
      
      console.log('🔍 Shift type resolution:', {
        todayShift,
        tomorrowShift,
        todayShiftType,
        tomorrowShiftType,
        shiftsFound: shifts.length
      });

      // Get custom shift enums for the user's team/project
      let customEnums: any[] = [];
      try {
        const userResponse = await supabaseClient.get('users', {
          select: 'id',
          filters: { email: currentUser.email }
        });

        if (!userResponse.error && userResponse.data && userResponse.data.length > 0) {
          const userId = userResponse.data[0].id;
          
          // Get user's team assignments
          const teamAssignmentsResponse = await supabaseClient.get('team_members', {
            select: 'team_id',
            filters: { user_id: userId }
          });

          if (!teamAssignmentsResponse.error && teamAssignmentsResponse.data && teamAssignmentsResponse.data.length > 0) {
            const teamId = teamAssignmentsResponse.data[0].team_id;
            
            // Get custom shift enums for this team
            const enumsResponse = await supabaseClient.get('custom_shift_enums', {
              select: '*',
              filters: { team_id: teamId }
            });

                         if (!enumsResponse.error && enumsResponse.data) {
               customEnums = enumsResponse.data;
             }
          }
        }
      } catch (enumError) {
        console.error('Error loading custom enums:', enumError);
      }

      const getShiftDisplay = (shiftType: string) => {
        const shiftInfo = getShiftTypeInfo(shiftType, customEnums);
        return {
          name: shiftInfo.label,
          color: shiftInfo.color,
          bgColor: shiftInfo.bgColor,
          icon: shiftInfo.icon,
          startTime: shiftInfo.startTime,
          endTime: shiftInfo.endTime
        };
      };

      const todayShiftInfo = getShiftDisplay(todayShiftType);
      const tomorrowShiftInfo = getShiftDisplay(tomorrowShiftType);

      const result = {
        todayShift: todayShiftType,
        tomorrowShift: tomorrowShiftType,
        todayShiftName: todayShiftInfo.name,
        tomorrowShiftName: tomorrowShiftInfo.name,
        todayShiftColor: todayShiftInfo.color,
        tomorrowShiftColor: tomorrowShiftInfo.color,
        todayShiftTime: todayShiftInfo.startTime,
        tomorrowShiftTime: tomorrowShiftInfo.startTime,
        todayShiftIcon: todayShiftInfo.icon,
        tomorrowShiftIcon: tomorrowShiftInfo.icon,
        projectId: todayShift?.project_id,
        teamId: todayShift?.team_id
      };

      console.log('✅ Final shift result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in loadShiftInformation:', error);
      // Return default shift on error (same as shift schedule page)
      return {
        todayShift: 'G',
        tomorrowShift: 'G',
        todayShiftName: 'General',
        tomorrowShiftName: 'General',
        todayShiftColor: 'text-green-600',
        tomorrowShiftColor: 'text-green-600',
        todayShiftTime: undefined,
        tomorrowShiftTime: undefined,
        todayShiftIcon: Sun,
        tomorrowShiftIcon: Sun,
        projectId: undefined,
        teamId: undefined
      };
    }
  };

  const loadTeamAvailability = async () => {
    const today = getTodayString();
    
    try {
      // Fetch all teams with their members and today's shifts in parallel
      const teamsResponse = await supabaseClient.getTeams();
      if (teamsResponse.error) {
        throw new Error(teamsResponse.error);
      }

      const teams = teamsResponse.data || [];
      
      // Fetch all team members and shifts for today in parallel
      const [allTeamMembersResponse, allShiftsResponse] = await Promise.all([
        supabaseClient.query({
          table: 'team_members',
          action: 'select',
          select: 'team_id,user_id,users(email,full_name)'
        }),
        supabaseClient.getShiftSchedules({
          filters: { shift_date: today }
        })
      ]);

      if (allTeamMembersResponse.error || allShiftsResponse.error) {
        throw new Error('Failed to fetch team data');
      }

      const allTeamMembers = allTeamMembersResponse.data || [];
      const allShifts = allShiftsResponse.data || [];

      // Group team members by team
      const teamMembersMap = new Map<string, any[]>();
      allTeamMembers.forEach((member: any) => {
        const teamId = member.team_id;
        if (!teamMembersMap.has(teamId)) {
          teamMembersMap.set(teamId, []);
        }
        teamMembersMap.get(teamId)!.push(member);
      });

      // Group shifts by team
      const shiftsMap = new Map<string, any[]>();
      allShifts.forEach((shift: any) => {
        const teamId = shift.team_id;
        if (!shiftsMap.has(teamId)) {
          shiftsMap.set(teamId, []);
        }
        shiftsMap.get(teamId)!.push(shift);
      });

      // Process teams efficiently
      const availability: TeamAvailability[] = [];

      for (const team of teams) {
        try {
          const teamMembers = teamMembersMap.get(team.id) || [];
          const shifts = shiftsMap.get(team.id) || [];

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

          // Get project name and custom shift enums for this team
          let projectName = 'Unknown Project';
          let projectId = null;
          let customEnums: any[] = [];
          
          try {
            const projectResponse = await supabaseClient.query({
              table: 'team_project_assignments',
              action: 'select',
              select: 'project_id,projects(name)',
              filters: { team_id: team.id }
            });

            if (!projectResponse.error && projectResponse.data && projectResponse.data.length > 0) {
              projectId = projectResponse.data[0].project_id;
              projectName = projectResponse.data[0].projects?.name || 'Unknown Project';

              // Get custom shift enums for this project-team combination
              const enumsResponse = await supabaseClient.query({
                table: 'custom_shift_enums',
                action: 'select',
                select: 'shift_identifier, shift_name, start_time, end_time, is_default, color',
                filters: { project_id: projectId, team_id: team.id }
              });

              if (!enumsResponse.error && enumsResponse.data) {
                customEnums = enumsResponse.data.map((enum_: any) => ({
                  shiftIdentifier: enum_.shift_identifier,
                  shiftName: enum_.shift_name,
                  startTime: enum_.start_time,
                  endTime: enum_.end_time,
                  isDefault: enum_.is_default,
                  color: enum_.color
                }));
              }
            }
          } catch (error) {
            console.error(`Error loading project for team ${team.id}:`, error);
          }

          availability.push({
            teamName: team.name,
            projectName,
            projectId: projectId || '',
            teamId: team.id,
            shifts: shiftGroups,
            customEnums
          });
        } catch (error) {
          console.error(`Error processing team ${team.id}:`, error);
        }
      }

      return availability;
    } catch (error) {
      console.error('Error in loadTeamAvailability:', error);
      return [];
    }
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

  const showShiftDetails = async (shiftType: string, teamName: string, projectName: string) => {
    setSelectedShift({ shiftType, teamName, projectName });
    setShowShiftDetailsModal(true);
    setLoadingShiftUsers(true);
    setShiftUsers([]);

    try {
      // Find the team and get users for this shift
      const team = dashboardData.teamAvailability.find(t => t.teamName === teamName);
      if (team && team.shifts[shiftType]) {
        const userEmails = team.shifts[shiftType].users;
        
        // Load user details for each email
        const userPromises = userEmails.map(async (email: string) => {
          const response = await supabaseClient.get('users', {
            select: 'full_name, email, phone_number',
            filters: { email }
          });
          return response.data?.[0] || { full_name: email, email, phone_number: 'Not provided' };
        });

        const users = await Promise.all(userPromises);
        setShiftUsers(users);
      }
    } catch (error) {
      console.error('Error loading shift users:', error);
      toast.error('Failed to load shift user details');
    } finally {
      setLoadingShiftUsers(false);
    }
  };

  const calculateTrend = (currentHours: number, previousHours: number): { trend: 'up' | 'down' | 'stable', value: string, percentage: number } => {
    if (previousHours === 0) return { trend: 'stable', value: '0%', percentage: 0 };
    
    const change = currentHours - previousHours;
    const percentage = (change / previousHours) * 100;
    
    if (percentage > 5) return { trend: 'up', value: `+${percentage.toFixed(1)}%`, percentage };
    if (percentage < -5) return { trend: 'down', value: `${percentage.toFixed(1)}%`, percentage };
    return { trend: 'stable', value: '0%', percentage: 0 };
  };

  const statCards = useMemo(() => {
    // Calculate trends based on previous periods
    const todayTrend = calculateTrend(dashboardData.stats.todayHours, dashboardData.stats.weekHours / 7);
    const weekTrend = calculateTrend(dashboardData.stats.weekHours, dashboardData.stats.monthHours / 4);
    const monthTrend = calculateTrend(dashboardData.stats.monthHours, dashboardData.stats.yearHours / 12);
    const totalTrend = calculateTrend(dashboardData.stats.totalHours, dashboardData.stats.totalHours * 0.9); // Compare with 90% of current total

    const utilization = {
      today: expectedHours.today > 0 ? Math.min(100, Math.round((dashboardData.stats.todayHours / expectedHours.today) * 100)) : null,
      week: expectedHours.week > 0 ? Math.min(100, Math.round((dashboardData.stats.weekHours / expectedHours.week) * 100)) : null,
      month: expectedHours.month > 0 ? Math.min(100, Math.round((dashboardData.stats.monthHours / expectedHours.month) * 100)) : null,
    };

    return [
      {
        title: 'Today',
        value: `${dashboardData.stats.todayHours.toFixed(1)}h`,
        icon: Clock,
        gradient: 'from-blue-500 to-blue-600',
        description: 'Hours worked today',
        trend: todayTrend.trend,
        trendValue: todayTrend.value,
        trendColor: todayTrend.trend === 'up' ? 'text-green-600' : todayTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600',
        utilization: utilization.today
      },
      {
        title: 'This Week',
        value: `${dashboardData.stats.weekHours.toFixed(1)}h`,
        icon: Calendar,
        gradient: 'from-purple-500 to-purple-600',
        description: 'Hours worked this week',
        trend: weekTrend.trend,
        trendValue: weekTrend.value,
        trendColor: weekTrend.trend === 'up' ? 'text-green-600' : weekTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600',
        utilization: utilization.week
      },
      {
        title: 'This Month',
        value: `${dashboardData.stats.monthHours.toFixed(1)}h`,
        icon: TrendingUp,
        gradient: 'from-green-500 to-green-600',
        description: 'Hours worked this month',
        trend: monthTrend.trend,
        trendValue: monthTrend.value,
        trendColor: monthTrend.trend === 'up' ? 'text-green-600' : monthTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600',
        utilization: utilization.month
      },
      {
        title: 'Total',
        value: `${dashboardData.stats.totalHours.toFixed(1)}h`,
        icon: BarChart3,
        gradient: 'from-orange-500 to-orange-600',
        description: 'Total hours worked',
        trend: totalTrend.trend,
        trendValue: totalTrend.value,
        trendColor: totalTrend.trend === 'up' ? 'text-green-600' : totalTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
      },
    ];
  }, [dashboardData.stats, expectedHours]);

  if (isLoading && !greetingLoaded) {
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
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                  Hey, {dashboardData.user?.full_name || dashboardData.user?.email?.split('@')[0] || 'User'}!
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-neutral-600 dark:text-neutral-400 mt-1">
                  Here's your work summary and shift information for today.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Shift Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Today's Shift */}
          <div className={`group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 ${isLoadingShifts ? 'opacity-75' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${isLoadingShifts ? 'bg-blue-400 animate-pulse' : 'bg-blue-500'}`}></div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Today's Shift</h3>
                  {isLoadingShifts && (
                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                      <div className="w-3 h-3 bg-blue-400 animate-spin rounded-full"></div>
                      <span>Loading...</span>
                    </div>
                  )}
                </div>
                {isLoadingShifts ? (
                  <div className="animate-pulse">
                    <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg mb-2"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32"></div>
                  </div>
                ) : dashboardData.userShift ? (
                  <>
                    <p className="text-4xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                      {dashboardData.userShift.todayShiftName}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-2 text-neutral-400 dark:text-neutral-500">
                      No Shift
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-medium bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                {isLoadingShifts ? (
                  <div className="animate-pulse">
                    <div className="w-8 h-8 bg-white/20 rounded"></div>
                  </div>
                ) : dashboardData.userShift ? (
                  React.createElement(getShiftIcon(dashboardData.userShift.todayShift), { className: "h-8 w-8" })
                ) : (
                  <Sun className="h-8 w-8" />
                )}
              </div>
            </div>
          </div>

          {/* Tomorrow's Shift */}
          <div className={`group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 ${isLoadingShifts ? 'opacity-75' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${isLoadingShifts ? 'bg-purple-400 animate-pulse' : 'bg-purple-500'}`}></div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Tomorrow's Shift</h3>
                  {isLoadingShifts && (
                    <div className="flex items-center space-x-1 text-xs text-purple-600 dark:text-purple-400">
                      <div className="w-3 h-3 bg-purple-400 animate-spin rounded-full"></div>
                      <span>Loading...</span>
                    </div>
                  )}
                </div>
                {isLoadingShifts ? (
                  <div className="animate-pulse">
                    <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg mb-2"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32"></div>
                  </div>
                ) : dashboardData.userShift ? (
                  <>
                    <p className="text-4xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                      {dashboardData.userShift.tomorrowShiftName}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-2 text-neutral-400 dark:text-neutral-500">
                      No Shift
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-medium bg-gradient-to-br from-purple-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                {isLoadingShifts ? (
                  <div className="animate-pulse">
                    <div className="w-8 h-8 bg-white/20 rounded"></div>
                  </div>
                ) : dashboardData.userShift ? (
                  React.createElement(getShiftIcon(dashboardData.userShift.tomorrowShift), { className: "h-8 w-8" })
                ) : (
                  <Sun className="h-8 w-8" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div 
              key={stat.title} 
              className={`group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 ${isRefreshing ? 'opacity-75' : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-medium group-hover:scale-110 transition-transform duration-300 relative`}>
                    <stat.icon className="h-6 w-6 text-white" />
                    {isRefreshing && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                        <RefreshCw className="h-2 w-2 text-primary-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {stat.utilization != null && (
                      <div className="relative h-10 w-10">
                        <svg viewBox="0 0 36 36" className="h-10 w-10">
                          <path className="text-neutral-200 dark:text-neutral-700" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-primary-600" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none"
                            strokeDasharray={`${stat.utilization}, 100`} d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{stat.utilization}%</span>
                        </div>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-3xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {stat.value}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">{stat.title}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">{stat.description}</p>
                <div className="flex items-center space-x-1 mt-2">
                  <span className={`text-xs font-medium ${stat.trendColor}`}>{stat.trendValue}</span>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : stat.trend === 'down' ? (
                    <TrendingUp className="h-3 w-3 text-red-600 dark:text-red-400 rotate-180" />
                  ) : (
                    <div className="h-3 w-3 text-gray-600 dark:text-gray-400">—</div>
                  )}
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
            
                         {isLoading ? (
               <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-modern">
                 {[...Array(3)].map((_, index) => (
                   <div 
                     key={index}
                     className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-600 animate-pulse"
                   >
                     <div className="flex items-center justify-between mb-3">
                       <div className="h-5 bg-neutral-200 dark:bg-neutral-600 rounded w-24"></div>
                       <div className="h-5 bg-neutral-200 dark:bg-neutral-600 rounded w-20"></div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       {[...Array(4)].map((_, shiftIndex) => (
                         <div key={shiftIndex} className="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg">
                           <div className="h-3 bg-neutral-200 dark:bg-neutral-600 rounded w-16"></div>
                           <div className="flex items-center space-x-1">
                             <div className="h-3 bg-neutral-200 dark:bg-neutral-600 rounded w-4"></div>
                             <div className="h-3 w-3 bg-neutral-200 dark:bg-neutral-600 rounded"></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             ) : dashboardData.teamAvailability.length > 0 ? (
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
                         const shiftInfo = getShiftTypeInfo(shiftType, team.customEnums);
                         return (
                           <button
                             key={shiftType}
                             onClick={() => showShiftDetails(shiftType, team.teamName, team.projectName)}
                             className="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer group"
                           >
                             <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600">
                               {shiftInfo.label}
                             </span>
                             <div className="flex items-center space-x-1">
                               <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                 {shiftData.count}
                               </span>
                               <Users className="h-3 w-3 text-neutral-400 group-hover:text-primary-600" />
                             </div>
                           </button>
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

        {/* Shift Details Modal */}
        {showShiftDetailsModal && selectedShift && (
          <div className="modal-overlay" onClick={() => setShowShiftDetailsModal(false)}>
            <div className="modal-content max-w-2xl shift-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white truncate">
                    Shift Details
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {selectedShift.teamName} - {selectedShift.projectName}
                  </p>
                </div>
                <button
                  onClick={() => setShowShiftDetailsModal(false)}
                  className="flex-shrink-0 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ml-3"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                    {(() => {
                      // Find the team's custom enums to get the shift name
                      const team = dashboardData.teamAvailability.find(t => t.teamName === selectedShift.teamName);
                      const shiftInfo = getShiftTypeInfo(selectedShift.shiftType, team?.customEnums || []);
                      return shiftInfo.label;
                    })()} Shift
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    People assigned to this shift
                  </p>
                </div>
                
                {loadingShiftUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">Loading shift details...</span>
                    </div>
                  </div>
                ) : shiftUsers.length > 0 ? (
                  <div className="space-y-4">
                    {shiftUsers.map((user, index) => (
                      <div 
                        key={index} 
                        className="group bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 hover:shadow-soft"
                      >
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                            {/* User Avatar */}
                            <div className="flex-shrink-0 flex justify-center sm:justify-start">
                              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-medium group-hover:scale-105 transition-transform duration-200">
                                <span className="text-white font-semibold text-base">
                                  {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* User Info */}
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="space-y-3">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-neutral-900 dark:text-white truncate">
                                    {user.full_name || 'Unknown Name'}
                                  </h4>
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                                    {user.email}
                                  </p>
                                </div>
                                
                                {/* Phone Number */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">
                                      Phone
                                    </span>
                                  </div>
                                  
                                  <div className="text-center sm:text-right">
                                    {user.phone_number ? (
                                      <div className="phone-container">
                                        <span className="text-lg">📞</span>
                                        <span className="phone-text">
                                          {user.phone_number}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center px-3 py-2 text-neutral-400 dark:text-neutral-500 italic bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
                                        Not provided
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Additional Info Row */}
                                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-600">
                                  <div className="flex items-center justify-center sm:justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>User #{index + 1}</span>
                                    <span className="flex items-center space-x-1">
                                      <span>👤</span>
                                      <span>Active</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                      No Users Found
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      No users are currently assigned to this shift.
                    </p>
                  </div>
                )}
                
                {/* Footer Actions */}
                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 text-center sm:text-left">
                      <span className="font-medium">{shiftUsers.length}</span> user{shiftUsers.length !== 1 ? 's' : ''} in this shift
                    </div>
                    <div className="flex items-center justify-center sm:justify-end space-x-3">
                      <button
                        onClick={() => setShowShiftDetailsModal(false)}
                        className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors duration-200"
                      >
                        Close
                      </button>
                    </div>
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
