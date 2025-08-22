'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserIdFromEmail } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { WorkLog, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { Clock, TrendingUp, Calendar, BarChart3, RefreshCw, Users, Eye } from 'lucide-react';
import { formatDuration, formatDateTime, formatTimeAgo, getTodayRange, getWeekRange, getMonthRange } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import ShiftScheduleViewer from '@/components/ShiftScheduleViewer';

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
}

interface TeamAvailability {
  teamName: string;
  shifts: {
    [key: string]: string[]; // shift type -> array of user emails
  };
  customEnums: any[];
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string } } = {
  M: { label: 'Morning', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  A: { label: 'Afternoon', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  N: { label: 'Night', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  G: { label: 'General/Day', color: 'text-green-700', bgColor: 'bg-green-100' },
  H: { label: 'Holiday', color: 'text-red-700', bgColor: 'bg-red-100' },
  L: { label: 'Leave', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

export default function UserDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    totalHours: 0,
  });
  const [projectHours, setProjectHours] = useState<ProjectHours[]>([]);
  const [recentWorkLogs, setRecentWorkLogs] = useState<WorkLogWithProject[]>([]);
  const [userShift, setUserShift] = useState<UserShift | null>(null);
  const [teamAvailability, setTeamAvailability] = useState<TeamAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShiftSchedule, setShowShiftSchedule] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      const userEmail = currentUser.email;

      // Load work logs and stats
      await loadWorkLogs(userEmail);
      
      // Load shift information
      await loadShiftInformation(userEmail);
      
      // Load team availability - TODO: Update with proxy calls
      await loadTeamAvailability();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkLogs = async (userEmail: string) => {
    const response = await supabaseClient.getUserWorkLogs(userEmail, {
      order: { column: 'created_at', ascending: false }
    });

    if (response.error) {
      console.error('Error loading work logs:', response.error);
      throw new Error(response.error);
    }

    const logs = response.data || [];
    const todayRange = getTodayRange();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();

    // Calculate stats
    const todayHours = logs
      .filter((log: any) => {
        const logDate = new Date(log.start_time);
        return logDate >= todayRange.startOfDay && logDate <= todayRange.endOfDay;
      })
      .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

    const weekHours = logs
      .filter((log: any) => {
        const logDate = new Date(log.start_time);
        return logDate >= weekRange.startOfWeek && logDate <= weekRange.endOfWeek;
      })
      .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

    const monthHours = logs
      .filter((log: any) => {
        const logDate = new Date(log.start_time);
        return logDate >= monthRange.startOfMonth && logDate <= monthRange.endOfMonth;
      })
      .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

    const totalHours = logs
      .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

    setStats({
      todayHours: Math.round(todayHours * 100) / 100,
      weekHours: Math.round(weekHours * 100) / 100,
      monthHours: Math.round(monthHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
    });

    // Calculate project breakdown
    const projectMap = new Map<string, number>();
    logs.forEach((log: any) => {
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
      .slice(0, 10);

    setProjectHours(projectData);
    setRecentWorkLogs(logs.slice(0, 5));
  };

  const loadShiftInformation = async (userEmail: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get user's shifts for today and tomorrow
    const shiftsResponse = await supabaseClient.getShiftSchedules({
      filters: { 
        user_email: userEmail,
        shift_date: [todayStr, tomorrowStr]
      }
    });

    if (shiftsResponse.error) {
      console.error('Error loading shifts:', shiftsResponse.error);
      throw new Error(shiftsResponse.error);
    }

    const shifts = shiftsResponse.data;

    const todayShift = shifts?.find((s: any) => s.shift_date === todayStr)?.shift_type || 'G';
    const tomorrowShift = shifts?.find((s: any) => s.shift_date === tomorrowStr)?.shift_type || 'G';

    // TODO: Get user's team and project for custom shift enums
    // This requires complex queries that need to be updated for the proxy system
    let customEnums: any[] = [];

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

  const showUserDetails = async (email: string) => {
    try {
      const response = await supabaseClient.get('users', {
        select: 'full_name, email, phone_number',
        filters: { email }
      });

      if (response.error) {
        console.error('Error loading user details:', response.error);
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

  const loadTeamAvailability = async () => {
    // Get all teams and their members for today
    const today = new Date().toISOString().split('T')[0];
    
    const teamsResponse = await supabaseClient.getTeams();
    
    if (teamsResponse.error) {
      console.error('Error loading teams:', teamsResponse.error);
      throw new Error(teamsResponse.error);
    }

    const teams = teamsResponse.data;

    const availability: TeamAvailability[] = [];

    // TODO: Complex team queries need to be updated for proxy system
    // Temporarily setting empty team availability
    setTeamAvailability([]);
    return;
    
    /*
    for (const team of teams || []) {
      // Get project assignments for this team
      const { data: projectAssignments } = await supabase
        .from('team_project_assignments')
        .select('project_id')
        .eq('team_id', team.id);

      let customEnums: any[] = [];
      if (projectAssignments && projectAssignments.length > 0) {
        // Use the first project assignment for custom shift enums
        const { data: enums } = await supabase.rpc('get_custom_shift_enums', {
          p_project_id: projectAssignments[0].project_id,
          p_team_id: team.id
        });
        customEnums = enums || [];
      }

      // Get team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          users (email, full_name, phone_number)
        `)
        .eq('team_id', team.id);

      if (membersError) continue;

      // Get shifts for today for this team
      const { data: shifts, error: shiftsError } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('team_id', team.id)
        .eq('shift_date', today);

      if (shiftsError) continue;

      // Group users by shift type
      const shiftGroups: { [key: string]: string[] } = {};
      
      teamMembers?.forEach(member => {
        const userEmail = (member.users as any).email;
        const shift = shifts?.find(s => s.user_email === userEmail);
        const shiftType = shift?.shift_type || 'G';
        
        if (!shiftGroups[shiftType]) {
          shiftGroups[shiftType] = [];
        }
        shiftGroups[shiftType].push(userEmail);
      });

      availability.push({
        teamName: team.name,
        shifts: shiftGroups,
        customEnums: customEnums || []
      });
    }

    setTeamAvailability(availability);
    */
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
      {/* Header with Welcome and Refresh */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user?.full_name || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-gray-600">Here's your work summary and shift information.</p>
            </div>
          </div>
          <button
            onClick={() => setShowShiftSchedule(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Shift Schedule
          </button>
        </div>
      </div>

      {/* Shift Information Cards */}
      {userShift && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Today's Shift</h3>
                <p className="text-2xl font-bold" style={{ color: userShift.todayShiftColor }}>
                  {userShift.todayShiftName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {userShift.todayShift} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: userShift.todayShiftColor }}
              >
                {userShift.todayShift}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tomorrow's Shift</h3>
                <p className="text-2xl font-bold" style={{ color: userShift.tomorrowShiftColor }}>
                  {userShift.tomorrowShiftName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {userShift.tomorrowShift} • {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: userShift.tomorrowShiftColor }}
              >
                {userShift.tomorrowShift}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Team Availability Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Today's Team Availability</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {(() => {
            // Collect all unique shift types across all teams with their display names
            const allShiftTypesMap = new Map<string, string>();
            
            // Add default shift types
            Object.entries(SHIFT_TYPES).forEach(([key, value]) => {
              allShiftTypesMap.set(key, value.label);
            });
            
            // Add custom shift types from all teams
            teamAvailability.forEach(team => {
              team.customEnums?.forEach((customEnum: any) => {
                allShiftTypesMap.set(customEnum.shift_identifier, customEnum.shift_name);
              });
            });
            
            const uniqueShiftTypes = Array.from(allShiftTypesMap.entries());
            
            return teamAvailability.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      {uniqueShiftTypes.map(([shiftType, shiftName]) => (
                        <th key={shiftType} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {shiftName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamAvailability.map((team) => (
                      <tr key={team.teamName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.teamName}
                        </td>
                        {uniqueShiftTypes.map(([shiftType]) => {
                          const users = team.shifts[shiftType] || [];
                          return (
                            <td key={shiftType} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                              {users.length > 0 ? (
                                <div className="flex flex-col space-y-1">
                                  {users.map((email, index) => (
                                    <button
                                      key={index}
                                      onClick={() => showUserDetails(email)}
                                      className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                                    >
                                      {email.split('@')[0]}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
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
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No team availability data found.</p>
              </div>
            );
          })()}
      </div>

      {/* Project Breakdown Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentWorkLogs.length > 0 ? (
            recentWorkLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {log.project?.name || 'Unknown Project'}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">
                      {log.ticket_id} - {log.task_detail}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(log.start_time)} • {formatDuration(log.logged_duration_seconds)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(log.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No recent activity. Start a timer to begin tracking your work.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shift Schedule Viewer Modal */}
      {showShiftSchedule && (
        <ShiftScheduleViewer
          isOpen={showShiftSchedule}
          onClose={() => setShowShiftSchedule(false)}
          userEmail={user?.email}
        />
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.phone_number || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
