'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { ShiftSchedule, ShiftType, Project, Team } from '@/lib/supabase';
import { Calendar, Clock, Users, MapPin, Filter, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserShift {
  todayShift: string;
  tomorrowShift: string;
  todayShiftName: string;
  tomorrowShiftName: string;
  todayShiftColor: string;
  tomorrowShiftColor: string;
}

interface ShiftMetricsData {
  userEmail: string;
  userName: string;
  teamName: string;
  projectName: string;
  shifts: {
    [date: string]: {
      shiftType: string;
      shiftName: string;
      color: string;
      bgColor: string;
    };
  };
}

interface CustomShiftEnum {
  shift_identifier: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_default: boolean;
  color: string;
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string; darkBgColor: string } } = {
  M: { 
    label: 'Morning', 
    color: '#3B82F6', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    darkBgColor: 'dark:bg-blue-900/30'
  },
  A: { 
    label: 'Afternoon', 
    color: '#8B5CF6', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    darkBgColor: 'dark:bg-purple-900/30'
  },
  N: { 
    label: 'Night', 
    color: '#6366F1', 
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    darkBgColor: 'dark:bg-indigo-900/30'
  },
  G: { 
    label: 'General/Day', 
    color: '#10B981', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    darkBgColor: 'dark:bg-green-900/30'
  },
  H: { 
    label: 'Holiday', 
    color: '#EF4444', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    darkBgColor: 'dark:bg-red-900/30'
  },
  L: { 
    label: 'Leave', 
    color: '#F59E0B', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    darkBgColor: 'dark:bg-yellow-900/30'
  },
};

export default function ShiftSchedulePage() {
  const [user, setUser] = useState<any>(null);
  const [userShift, setUserShift] = useState<UserShift | null>(null);
  const [shiftMetrics, setShiftMetrics] = useState<ShiftMetricsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [customShiftEnums, setCustomShiftEnums] = useState<CustomShiftEnum[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      // Load user's shift information
      await loadUserShiftInformation(currentUser.email);
      
      // Load available teams
      await loadAvailableTeams();
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load initial data');
    }
  };

  const loadUserShiftInformation = async (userEmail: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get user's shifts for today and tomorrow
    const shiftsResponse = await supabaseClient.getShiftSchedules({
      filters: { 
        user_email: userEmail,
        shift_date_in: [todayStr, tomorrowStr]
      }
    });

    if (shiftsResponse.error) {
      console.error('Error loading shifts:', shiftsResponse.error);
      throw new Error(shiftsResponse.error);
    }

    const shifts = shiftsResponse.data;

    const todayShift = shifts?.find((s: any) => s.shift_date === todayStr)?.shift_type || 'G';
    const tomorrowShift = shifts?.find((s: any) => s.shift_date === tomorrowStr)?.shift_type || 'G';

    // Get custom shift enums for the user's team/project
    let customEnums: any[] = [];
    try {
      const userResponse = await supabaseClient.get('users', {
        select: 'id',
        filters: { email: userEmail }
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
      const customEnum = customEnums?.find((e: any) => e.shift_identifier === shiftType);
      if (customEnum) {
        return {
          name: customEnum.shift_name,
          color: customEnum.color || '#3B82F6'
        };
      }
      return {
        name: SHIFT_TYPES[shiftType as ShiftType]?.label || 'General',
        color: '#3B82F6'
      };
    };

    const todayShiftInfo = getShiftDisplay(todayShift);
    const tomorrowShiftInfo = getShiftDisplay(tomorrowShift);

    setUserShift({
      todayShift,
      tomorrowShift,
      todayShiftName: todayShiftInfo.name,
      tomorrowShiftName: tomorrowShiftInfo.name,
      todayShiftColor: todayShiftInfo.color,
      tomorrowShiftColor: tomorrowShiftInfo.color,
    });
  };

  const loadAvailableTeams = async () => {
    try {
      // Get user's team memberships first
      const userTeamsResponse = await supabaseClient.getTeamMemberships(user?.email || '');
      
      if (userTeamsResponse.error) {
        console.error('Error loading user teams:', userTeamsResponse.error);
        throw new Error(userTeamsResponse.error);
      }

      const userTeams = userTeamsResponse.data || [];
      
      if (userTeams.length === 0) {
        console.log('User is not assigned to any teams');
        setAvailableTeams(['all']);
        return;
      }

      // Get project assignments for user's teams
      const userTeamIds = userTeams.map((membership: any) => membership.team_id);
      const projectAssignmentsResponse = await supabaseClient.query({
        table: 'team_project_assignments',
        action: 'select',
        select: 'team_id,project_id,teams(id,name),projects(id,name)',
        filters: { team_id: userTeamIds }
      });

      if (projectAssignmentsResponse.error) {
        console.error('Error loading project assignments:', projectAssignmentsResponse.error);
        throw new Error(projectAssignmentsResponse.error);
      }

      const projectAssignments = projectAssignmentsResponse.data || [];
      
      // Get teams that belong to projects the user is assigned to
      const userProjectTeamIds = projectAssignments.map((assignment: any) => assignment.team_id);
      
      // Get only the teams the user has access to
      const teamsResponse = await supabaseClient.query({
        table: 'teams',
        action: 'select',
        select: '*',
        filters: { id: userProjectTeamIds }
      });
      
      if (teamsResponse.error) {
        console.error('Error loading teams:', teamsResponse.error);
        throw new Error(teamsResponse.error);
      }

      const teams = teamsResponse.data || [];
      const teamNames = teams.map((team: any) => team.name);
      setAvailableTeams(['all', ...teamNames]);
    } catch (error) {
      console.error('Error loading available teams:', error);
      toast.error('Failed to load available teams');
      setAvailableTeams(['all']);
    }
  };

  const loadShiftMetrics = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setDataLoaded(false);

      // Get month range
      const monthStart = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const monthEnd = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthEndDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${monthEnd}`;

      // Get all teams the user has access to
      let targetTeams: string[] = [];
      if (selectedTeam === 'all') {
        targetTeams = availableTeams.filter(team => team !== 'all');
      } else {
        targetTeams = [selectedTeam];
      }

      if (targetTeams.length === 0) {
        setShiftMetrics([]);
        setDataLoaded(true);
        return;
      }

      // Get team IDs for the selected teams
      const teamsResponse = await supabaseClient.query({
        table: 'teams',
        action: 'select',
        select: 'id,name',
        filters: { name: targetTeams }
      });

      if (teamsResponse.error) {
        throw new Error(teamsResponse.error);
      }

      const teams = teamsResponse.data || [];
      const teamIds = teams.map((team: any) => team.id);

      // Get all team members for the selected teams
      const teamMembersResponse = await supabaseClient.query({
        table: 'team_members',
        action: 'select',
        select: 'team_id,user_id,users(email,full_name),teams(name)',
        filters: { team_id: teamIds }
      });

      if (teamMembersResponse.error) {
        throw new Error(teamMembersResponse.error);
      }

      const teamMembers = teamMembersResponse.data || [];

      // Get project assignments for these teams
      const projectAssignmentsResponse = await supabaseClient.query({
        table: 'team_project_assignments',
        action: 'select',
        select: 'team_id,project_id,projects(name)',
        filters: { team_id: teamIds }
      });

      if (projectAssignmentsResponse.error) {
        throw new Error(projectAssignmentsResponse.error);
      }

      const projectAssignments = projectAssignmentsResponse.data || [];

      // Get custom shift enums for all teams
      const enumsResponse = await supabaseClient.query({
        table: 'custom_shift_enums',
        action: 'select',
        select: '*',
        filters: { team_id: teamIds }
      });

      if (!enumsResponse.error && enumsResponse.data) {
        setCustomShiftEnums(enumsResponse.data);
      }

      // Get all shifts for the selected month and teams
      const shiftsResponse = await supabaseClient.getShiftSchedules({
        filters: {
          team_id: teamIds,
          shift_date_gte: monthStart,
          shift_date_lte: monthEndDate
        }
      });

      if (shiftsResponse.error) {
        throw new Error(shiftsResponse.error);
      }

      const shifts = shiftsResponse.data || [];

      // Process data into metrics format
      const metrics: ShiftMetricsData[] = [];

      for (const member of teamMembers) {
        const teamId = member.team_id;
        const teamName = member.teams?.name || 'Unknown Team';
        const userEmail = member.users?.email;
        const userName = member.users?.full_name || userEmail?.split('@')[0] || 'Unknown User';

        // Find project for this team
        const projectAssignment = projectAssignments.find((pa: any) => pa.team_id === teamId);
        const projectName = projectAssignment?.projects?.name || 'Unknown Project';

        // Get shifts for this user in the selected month
        const userShifts = shifts.filter((shift: any) => shift.user_email === userEmail);

        // Create shifts object for each day of the month
        const userShiftsByDate: { [date: string]: any } = {};
        
        for (let day = 1; day <= monthEnd; day++) {
          const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const shift = userShifts.find((s: any) => s.shift_date === dateStr);
          
          if (shift) {
            const shiftInfo = getShiftDisplay(shift.shift_type, enumsResponse.data || []);
            userShiftsByDate[dateStr] = {
              shiftType: shift.shift_type,
              shiftName: shiftInfo.name,
              color: shiftInfo.color,
              bgColor: shiftInfo.bgColor
            };
          }
        }

        metrics.push({
          userEmail,
          userName,
          teamName,
          projectName,
          shifts: userShiftsByDate
        });
      }

      setShiftMetrics(metrics);
      setDataLoaded(true);
      toast.success('Shift metrics loaded successfully!');
    } catch (error) {
      console.error('Error loading shift metrics:', error);
      toast.error('Failed to load shift metrics');
      setShiftMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const getShiftDisplay = (shiftType: string, customEnums: CustomShiftEnum[] = []) => {
    // First try to find in custom enums
    const customShift = customEnums.find(enum_ => enum_.shift_identifier === shiftType);
    if (customShift) {
      return {
        name: customShift.shift_name,
        color: customShift.color || '#3B82F6',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20'
      };
    }

    // Fallback to default shift types
    const defaultShift = SHIFT_TYPES[shiftType as ShiftType];
    if (defaultShift) {
      return {
        name: defaultShift.label,
        color: defaultShift.color,
        bgColor: defaultShift.bgColor
      };
    }

    return {
      name: 'General',
      color: '#10B981',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    };
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ day, dayName, date: date.toISOString().split('T')[0] });
    }
    
    return days;
  };

  const handleApplyFilters = () => {
    loadShiftMetrics();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary-600" />
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={loadInitialData}
            className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft hover:shadow-medium"
            title="Refresh Data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Shift Schedule Metrics
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">View team shift schedules in metrics format</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team === 'all' ? 'All Teams' : team}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors duration-200 shadow-soft hover:shadow-medium disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* User's Current Shift Information */}
      {userShift && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Today's Shift</h3>
                </div>
                <p className="text-3xl font-bold mb-1" style={{ color: userShift.todayShiftColor }}>
                  {userShift.todayShiftName}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {userShift.todayShift} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-medium"
                style={{ backgroundColor: userShift.todayShiftColor }}
              >
                {userShift.todayShift}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Tomorrow's Shift</h3>
                </div>
                <p className="text-3xl font-bold mb-1" style={{ color: userShift.tomorrowShiftColor }}>
                  {userShift.tomorrowShiftName}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {userShift.tomorrowShift} • {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-medium"
                style={{ backgroundColor: userShift.tomorrowShiftColor }}
              >
                {userShift.tomorrowShift}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Metrics Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Shift Schedule Metrics</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • {selectedTeam === 'all' ? 'All Teams' : selectedTeam}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Users className="h-4 w-4" />
            <span>{shiftMetrics.length} users</span>
          </div>
        </div>
        
        {!dataLoaded ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">No data loaded</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Select filters and click Apply to load shift data</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary-600" />
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading shift metrics...</p>
            </div>
          </div>
        ) : shiftMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-600">
                  <th className="text-left p-3 font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-700/50 sticky left-0 z-10">
                    User
                  </th>
                  <th className="text-left p-3 font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-700/50">
                    Team
                  </th>
                  <th className="text-left p-3 font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-700/50">
                    Project
                  </th>
                  {getDaysInMonth().map(({ day, dayName, date }) => (
                    <th key={date} className="text-center p-2 font-semibold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-700/50 min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{dayName}</span>
                        <span className="text-sm">{day}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftMetrics.map((userMetric, index) => (
                  <tr key={userMetric.userEmail} className="border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="p-3 font-medium text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 sticky left-0 z-10">
                      <div className="flex flex-col">
                        <span className="font-semibold">{userMetric.userName}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{userMetric.userEmail}</span>
                      </div>
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">
                      {userMetric.teamName}
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">
                      {userMetric.projectName}
                    </td>
                    {getDaysInMonth().map(({ date }) => {
                      const shift = userMetric.shifts[date];
                      return (
                        <td key={date} className="p-2 text-center">
                          {shift ? (
                            <div 
                              className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-medium text-white min-w-[60px]"
                              style={{ backgroundColor: shift.color }}
                              title={`${shift.shiftName} (${shift.shiftType})`}
                            >
                              {shift.shiftType}
                            </div>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">No shift data found</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">No users found for the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
