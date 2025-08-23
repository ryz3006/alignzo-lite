'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, getUserIdFromEmail } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { WorkLog, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { Clock, TrendingUp, Calendar, BarChart3, RefreshCw, Users, Eye, Activity, Target, Zap, X } from 'lucide-react';
import { formatDuration, formatDateTime, formatTimeAgo, getTodayRange, getWeekRange, getMonthRange } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';


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
  
  // Individual loading states for sequential loading
  const [userLoading, setUserLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load user first
      await loadUser();
      
      // Then load other components sequentially
      await loadWorkLogs();
      await loadShiftInformation();
      await loadTeamAvailability();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const loadUser = async () => {
    try {
      setUserLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (!currentUser?.email) {
        throw new Error('No user email found');
      }
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error loading user:', error);
      throw error;
    } finally {
      setUserLoading(false);
    }
  };

  const loadWorkLogs = async () => {
    if (!user?.email) return;
    
    try {
      setStatsLoading(true);
      setProjectsLoading(true);
      setActivityLoading(true);
      
      const response = await supabaseClient.getUserWorkLogs(user.email, {
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
          return logDate >= todayRange.start && logDate <= todayRange.end;
        })
        .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      const weekHours = logs
        .filter((log: any) => {
          const logDate = new Date(log.start_time);
          return logDate >= weekRange.start && logDate <= weekRange.end;
        })
        .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;

      const monthHours = logs
        .filter((log: any) => {
          const logDate = new Date(log.start_time);
          return logDate >= monthRange.start && logDate <= monthRange.end;
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
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Error loading work logs:', error);
      throw error;
    } finally {
      setStatsLoading(false);
      setProjectsLoading(false);
      setActivityLoading(false);
    }
  };

  const loadShiftInformation = async () => {
    if (!user?.email) return;
    
    try {
      setShiftLoading(true);
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get user's shifts for today and tomorrow
      const shiftsResponse = await supabaseClient.getShiftSchedules({
        filters: { 
          user_email: user.email,
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
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Error loading shift information:', error);
      throw error;
    } finally {
      setShiftLoading(false);
    }
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
    try {
      setTeamLoading(true);
      
      // Get all teams and their members for today
      const today = new Date().toISOString().split('T')[0];
      
      const teamsResponse = await supabaseClient.getTeams();
      
      if (teamsResponse.error) {
        console.error('Error loading teams:', teamsResponse.error);
        throw new Error(teamsResponse.error);
      }

      const teams = teamsResponse.data || [];
      const availability: TeamAvailability[] = [];

      for (const team of teams) {
        try {
          // Get team members
          const teamMembersResponse = await supabaseClient.getTeamMembers(team.id);
          
          if (teamMembersResponse.error) {
            console.error(`Error loading team members for team ${team.id}:`, teamMembersResponse.error);
            continue;
          }

          const teamMembers = teamMembersResponse.data || [];

          // Get shifts for today for this team
          const shiftsResponse = await supabaseClient.getShiftSchedules({
            filters: {
              team_id: team.id,
              shift_date: today
            }
          });

          if (shiftsResponse.error) {
            console.error(`Error loading shifts for team ${team.id}:`, shiftsResponse.error);
            continue;
          }

          const shifts = shiftsResponse.data || [];

          // Group users by shift type
          const shiftGroups: { [key: string]: string[] } = {};
          
          teamMembers.forEach((member: any) => {
            const userEmail = member.users?.email;
            if (!userEmail) return;
            
            const shift = shifts.find((s: any) => s.user_email === userEmail);
            const shiftType = shift?.shift_type || 'G';
            
            if (!shiftGroups[shiftType]) {
              shiftGroups[shiftType] = [];
            }
            shiftGroups[shiftType].push(userEmail);
          });

          // Get custom shift enums for this team (if any)
          let customEnums: any[] = [];
          try {
            const projectAssignmentsResponse = await supabaseClient.get('team_project_assignments', {
              select: 'project_id',
              filters: { team_id: team.id }
            });

            if (!projectAssignmentsResponse.error && projectAssignmentsResponse.data && projectAssignmentsResponse.data.length > 0) {
              const projectId = projectAssignmentsResponse.data[0].project_id;
              
              // Get custom shift enums for this project-team combination
              const enumsResponse = await supabaseClient.get('custom_shift_enums', {
                select: '*',
                filters: {
                  project_id: projectId,
                  team_id: team.id
                }
              });

              if (!enumsResponse.error && enumsResponse.data) {
                customEnums = enumsResponse.data;
              }
            }
          } catch (enumError) {
            console.error(`Error loading custom enums for team ${team.id}:`, enumError);
          }

          availability.push({
            teamName: team.name,
            shifts: shiftGroups,
            customEnums: customEnums
          });
        } catch (teamError) {
          console.error(`Error processing team ${team.id}:`, teamError);
          continue;
        }
      }

      setTeamAvailability(availability);
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('Error loading team availability:', error);
      toast.error('Failed to load team availability');
      setTeamAvailability([]);
    } finally {
      setTeamLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Today',
      value: `${stats.todayHours}h`,
      icon: Clock,
      gradient: 'gradient-primary',
      description: 'Hours worked today'
    },
    {
      title: 'This Week',
      value: `${stats.weekHours}h`,
      icon: Calendar,
      gradient: 'gradient-success',
      description: 'Hours worked this week'
    },
    {
      title: 'This Month',
      value: `${stats.monthHours}h`,
      icon: TrendingUp,
      gradient: 'gradient-warning',
      description: 'Hours worked this month'
    },
    {
      title: 'Total',
      value: `${stats.totalHours}h`,
      icon: BarChart3,
      gradient: 'gradient-danger',
      description: 'Total hours tracked'
    },
  ];

  // Loading component for individual sections
  const SectionLoader = ({ children, loading, delay = 0 }: { children: React.ReactNode, loading: boolean, delay?: number }) => {
    if (loading) {
      return (
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className="animate-fade-in-up" 
        style={{ animationDelay: `${delay}ms` }}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Welcome and Refresh */}
      <SectionLoader loading={userLoading} delay={0}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={loadDashboardData}
              className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft hover:shadow-medium"
              title="Refresh Dashboard"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Welcome back, {user?.full_name || user?.email?.split('@')[0] || 'User'}! 👋
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">Here's your work summary and shift information.</p>
            </div>
          </div>
        </div>
      </SectionLoader>

      {/* Shift Information Cards */}
      <SectionLoader loading={shiftLoading} delay={300}>
        {userShift && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card card-hover">
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

            <div className="card card-hover">
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
      </SectionLoader>

      {/* KPI Cards */}
      <SectionLoader loading={statsLoading} delay={600}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <div key={stat.title} className="stats-card group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.gradient} shadow-medium`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {stat.value}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{stat.title}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">{stat.description}</p>
            </div>
          ))}
        </div>
      </SectionLoader>

      {/* Team Availability Table */}
      <SectionLoader loading={teamLoading} delay={900}>
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Today's Team Availability</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Users className="h-4 w-4" />
              <span>{teamAvailability.length} teams</span>
            </div>
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
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th className="text-left">
                          Team
                        </th>
                        {uniqueShiftTypes.map(([shiftType, shiftName]) => (
                          <th key={shiftType} className="text-center">
                            {shiftName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamAvailability.map((team) => (
                        <tr key={team.teamName}>
                          <td className="font-medium text-neutral-900 dark:text-white">
                            {team.teamName}
                          </td>
                          {uniqueShiftTypes.map(([shiftType]) => {
                            const users = team.shifts[shiftType] || [];
                            return (
                              <td key={shiftType} className="text-center">
                                {users.length > 0 ? (
                                  <div className="flex flex-col space-y-1">
                                    {users.map((email, index) => (
                                      <button
                                        key={index}
                                        onClick={() => showUserDetails(email)}
                                        className="badge badge-primary hover:bg-primary-200 transition-colors cursor-pointer text-xs"
                                      >
                                        {email.split('@')[0]}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-neutral-400 dark:text-neutral-500">-</span>
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
                  <p className="text-neutral-600 dark:text-neutral-400 font-medium">No team availability data found.</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Team schedules will appear here once configured.</p>
                </div>
              );
            })()}
        </div>
      </SectionLoader>

      {/* Project Breakdown Chart */}
      <SectionLoader loading={projectsLoading} delay={1200}>
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Hours by Project</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Your time distribution across projects</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <BarChart3 className="h-4 w-4" />
              <span>{projectHours.length} projects</span>
            </div>
          </div>
          {projectHours.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectHours}>
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
                  <Bar dataKey="hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
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
      </SectionLoader>

      {/* Recent Activity */}
      <SectionLoader loading={activityLoading} delay={1500}>
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Recent Activity</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Your latest work sessions</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Activity className="h-4 w-4" />
              <span>{recentWorkLogs.length} activities</span>
            </div>
          </div>
          <div className="space-y-4">
            {recentWorkLogs.length > 0 ? (
              recentWorkLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary-600 dark:text-primary-400" />
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
      </SectionLoader>

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
  );
}
