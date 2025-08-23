'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { ShiftSchedule, ShiftType, Project, Team } from '@/lib/supabase';
import { Calendar, Clock, Users, MapPin, Filter, RefreshCw } from 'lucide-react';
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

interface TeamShiftData {
  teamName: string;
  shifts: {
    [key: string]: string[]; // shift type -> array of user emails
  };
  customEnums: any[];
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string; darkBgColor: string } } = {
  M: { 
    label: 'Morning', 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    darkBgColor: 'dark:bg-blue-900/30'
  },
  A: { 
    label: 'Afternoon', 
    color: 'text-purple-700 dark:text-purple-400', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    darkBgColor: 'dark:bg-purple-900/30'
  },
  N: { 
    label: 'Night', 
    color: 'text-indigo-700 dark:text-indigo-400', 
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    darkBgColor: 'dark:bg-indigo-900/30'
  },
  G: { 
    label: 'General/Day', 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    darkBgColor: 'dark:bg-green-900/30'
  },
  H: { 
    label: 'Holiday', 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    darkBgColor: 'dark:bg-red-900/30'
  },
  L: { 
    label: 'Leave', 
    color: 'text-yellow-700 dark:text-yellow-400', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    darkBgColor: 'dark:bg-yellow-900/30'
  },
};

export default function ShiftSchedulePage() {
  const [user, setUser] = useState<any>(null);
  const [userShift, setUserShift] = useState<UserShift | null>(null);
  const [teamShifts, setTeamShifts] = useState<TeamShiftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  useEffect(() => {
    loadShiftData();
  }, [selectedDate, selectedTeam]);

  const loadShiftData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      const userEmail = currentUser.email;

      // Load user's shift information
      await loadUserShiftInformation(userEmail);
      
      // Load team availability
      await loadTeamAvailability();
    } catch (error) {
      console.error('Error loading shift data:', error);
      toast.error('Failed to load shift data');
    } finally {
      setLoading(false);
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

  const loadTeamAvailability = async () => {
    try {
      // Get all teams and their members for the selected date
      const teamsResponse = await supabaseClient.getTeams();
      
      if (teamsResponse.error) {
        console.error('Error loading teams:', teamsResponse.error);
        throw new Error(teamsResponse.error);
      }

      const teams = teamsResponse.data || [];
      const availability: TeamShiftData[] = [];
      const teamNames: string[] = [];

      for (const team of teams) {
        teamNames.push(team.name);
        
        try {
          // Get team members
          const teamMembersResponse = await supabaseClient.getTeamMembers(team.id);
          
          if (teamMembersResponse.error) {
            console.error(`Error loading team members for team ${team.id}:`, teamMembersResponse.error);
            continue;
          }

          const teamMembers = teamMembersResponse.data || [];

          // Get shifts for the selected date for this team
          const shiftsResponse = await supabaseClient.getShiftSchedules({
            filters: {
              team_id: team.id,
              shift_date: selectedDate
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

      setTeamShifts(availability);
      setAvailableTeams(['all', ...teamNames]);
    } catch (error) {
      console.error('Error loading team availability:', error);
      toast.error('Failed to load team availability');
      setTeamShifts([]);
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
      
      if (user) {
        toast.success(`${user.full_name} (${email})`);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading shift schedule...</p>
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
            onClick={loadShiftData}
            className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 transition-all duration-200 shadow-soft hover:shadow-medium"
            title="Refresh Shift Schedule"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Shift Schedule
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">View and manage team shift schedules</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="form-label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-modern"
            />
          </div>
          <div className="flex-1">
            <label className="form-label">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="input-modern"
            >
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team === 'all' ? 'All Teams' : team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* User's Current Shift Information */}
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

      {/* Team Availability Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Team Availability</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Users className="h-4 w-4" />
            <span>{teamShifts.length} teams</span>
          </div>
        </div>
        
        {(() => {
            // Filter teams based on selection
            const filteredTeams = selectedTeam === 'all' 
              ? teamShifts 
              : teamShifts.filter(team => team.teamName === selectedTeam);

            // Collect all unique shift types across all teams with their display names
            const allShiftTypesMap = new Map<string, string>();
            
            // Add default shift types
            Object.entries(SHIFT_TYPES).forEach(([key, value]) => {
              allShiftTypesMap.set(key, value.label);
            });
            
            // Add custom shift types from all teams
            filteredTeams.forEach(team => {
              team.customEnums?.forEach((customEnum: any) => {
                allShiftTypesMap.set(customEnum.shift_identifier, customEnum.shift_name);
              });
            });
            
            const uniqueShiftTypes = Array.from(allShiftTypesMap.entries());
            
            return filteredTeams.length > 0 ? (
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
                    {filteredTeams.map((team) => (
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
                                      className="badge badge-primary hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors cursor-pointer text-xs"
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
    </div>
  );
}
