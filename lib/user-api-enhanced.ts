import { supabaseClient } from './supabase-client';
import { userCache, UserTeamData, UserShiftData, UserProjectData, UserDashboardData } from './user-cache';
import { getCurrentUser } from './auth';

// Enhanced user teams API with caching
export async function getUserTeamsWithCache(userEmail: string): Promise<UserTeamData[]> {
  try {
    // Try cache first
    const cached = await userCache.getUserTeams(userEmail);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback to database
    console.log(`[Cache] User teams miss for ${userEmail}, fetching from database`);
    
    // Get user's team memberships
    const teamResponse = await supabaseClient.get('team_members', {
      select: 'team_id,teams(name,is_active),team_project_assignments(project_id,projects(name))',
      filters: { 'users.email': userEmail }
    });

    if (teamResponse.error) throw new Error(teamResponse.error);

    const teams: UserTeamData[] = (teamResponse.data || []).map((membership: any) => ({
      teamId: membership.team_id,
      teamName: membership.teams?.name || 'Unknown Team',
      projectId: membership.team_project_assignments?.[0]?.project_id,
      projectName: membership.team_project_assignments?.[0]?.projects?.name,
      isActive: membership.teams?.is_active !== false
    }));

    // Cache the result (non-blocking)
    userCache.setUserTeams(userEmail, teams)
      .catch(error => console.warn('Failed to cache user teams:', error));

    return teams;
  } catch (error) {
    console.error('Error in cached user teams fetch:', error);
    return [];
  }
}

// Enhanced user shifts API with caching
export async function getUserShiftsWithCache(userEmail: string, date?: string): Promise<UserShiftData[]> {
  try {
    // Try cache first
    const cached = await userCache.getUserShifts(userEmail, date);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback to database
    console.log(`[Cache] User shifts miss for ${userEmail}${date ? `:${date}` : ''}, fetching from database`);
    
    const filters: any = { user_email: userEmail };
    if (date) {
      filters.shift_date = date;
    }

    const shiftsResponse = await supabaseClient.getShiftSchedules({ filters });

    if (shiftsResponse.error) throw new Error(shiftsResponse.error);

    const shifts: UserShiftData[] = (shiftsResponse.data || []).map((shift: any) => ({
      shiftDate: shift.shift_date,
      shiftType: shift.shift_type,
      shiftName: shift.shift_type, // Will be enhanced with custom enum data
      startTime: shift.start_time,
      endTime: shift.end_time,
      projectId: shift.project_id,
      teamId: shift.team_id
    }));

    // Cache the result (non-blocking)
    userCache.setUserShifts(userEmail, shifts, date)
      .catch(error => console.warn('Failed to cache user shifts:', error));

    return shifts;
  } catch (error) {
    console.error('Error in cached user shifts fetch:', error);
    return [];
  }
}

// Enhanced user projects API with caching
export async function getUserProjectsWithCache(userEmail: string): Promise<UserProjectData[]> {
  try {
    // Try cache first
    const cached = await userCache.getUserProjects(userEmail);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback to database
    console.log(`[Cache] User projects miss for ${userEmail}, fetching from database`);
    
    // Get user's team memberships first
    const teamResponse = await supabaseClient.get('team_members', {
      select: 'team_id',
      filters: { 'users.email': userEmail }
    });

    if (teamResponse.error) throw new Error(teamResponse.error);

    const userTeamIds = teamResponse.data?.map((membership: any) => membership.team_id) || [];
    
    if (userTeamIds.length === 0) {
      return [];
    }

    // Get projects assigned to user's teams
    const projectResponse = await supabaseClient.get('team_project_assignments', {
      select: 'project_id,projects(id,name,product,country,is_active)',
      filters: { team_id: userTeamIds }
    });

    if (projectResponse.error) throw new Error(projectResponse.error);

    const projects: UserProjectData[] = (projectResponse.data || []).map((assignment: any) => ({
      projectId: assignment.project_id,
      projectName: assignment.projects?.name || 'Unknown Project',
      product: assignment.projects?.product || '',
      country: assignment.projects?.country || '',
      isActive: assignment.projects?.is_active !== false
    }));

    // Cache the result (non-blocking)
    userCache.setUserProjects(userEmail, projects)
      .catch(error => console.warn('Failed to cache user projects:', error));

    return projects;
  } catch (error) {
    console.error('Error in cached user projects fetch:', error);
    return [];
  }
}

// Enhanced team members API with caching
export async function getTeamMembersWithCache(teamId: string): Promise<any[]> {
  try {
    // Try cache first
    const cached = await userCache.getTeamMembers(teamId);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback to database
    console.log(`[Cache] Team members miss for ${teamId}, fetching from database`);
    
    const response = await supabaseClient.get('team_members', {
      select: 'user_id,users(email,full_name)',
      filters: { team_id: teamId }
    });

    if (response.error) throw new Error(response.error);

    const members = response.data || [];

    // Cache the result (non-blocking)
    userCache.setTeamMembers(teamId, members)
      .catch(error => console.warn('Failed to cache team members:', error));

    return members;
  } catch (error) {
    console.error('Error in cached team members fetch:', error);
    return [];
  }
}

// Enhanced team shifts API with caching
export async function getTeamShiftsWithCache(teamId: string, date?: string): Promise<any[]> {
  try {
    // Try cache first
    const cached = await userCache.getTeamShifts(teamId, date);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Fallback to database
    console.log(`[Cache] Team shifts miss for ${teamId}${date ? `:${date}` : ''}, fetching from database`);
    
    const filters: any = { team_id: teamId };
    if (date) {
      filters.shift_date = date;
    }

    const response = await supabaseClient.getShiftSchedules({ filters });

    if (response.error) throw new Error(response.error);

    const shifts = response.data || [];

    // Cache the result (non-blocking)
    userCache.setTeamShifts(teamId, shifts, date)
      .catch(error => console.warn('Failed to cache team shifts:', error));

    return shifts;
  } catch (error) {
    console.error('Error in cached team shifts fetch:', error);
    return [];
  }
}

// Enhanced dashboard data API with comprehensive caching
export async function getDashboardDataWithCache(userEmail: string): Promise<UserDashboardData | null> {
  try {
    // Try cache first
    const cached = await userCache.getDashboardData(userEmail);
    if (cached) {
      return cached;
    }

    // Fallback to database - load all data in parallel
    console.log(`[Cache] Dashboard data miss for ${userEmail}, fetching from database`);
    
    const [
      user,
      teams,
      shifts,
      projects,
      workLogsData
    ] = await Promise.all([
      getCurrentUser(),
      getUserTeamsWithCache(userEmail),
      getUserShiftsWithCache(userEmail),
      getUserProjectsWithCache(userEmail),
      loadWorkLogsData(userEmail)
    ]);

    // Load team availability data
    const teamAvailability = await loadTeamAvailabilityData();

    // Process shifts into userShift format for dashboard display
    const userShift = processShiftsForDashboard(shifts, userEmail);

    const dashboardData: UserDashboardData = {
      user,
      teams,
      shifts,
      projects,
      userShift,
      stats: workLogsData.stats,
      projectHours: workLogsData.projectHours,
      recentWorkLogs: workLogsData.recentWorkLogs,
      teamAvailability
    };

    // Cache the result (non-blocking)
    userCache.setDashboardData(userEmail, dashboardData)
      .catch(error => console.warn('Failed to cache dashboard data:', error));

    return dashboardData;
  } catch (error) {
    console.error('Error in cached dashboard data fetch:', error);
    return null;
  }
}

// Helper function to process shifts for dashboard display
function processShiftsForDashboard(shifts: any[], userEmail: string) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayShift = shifts?.find((s: any) => s.shiftDate === todayStr);
  const tomorrowShift = shifts?.find((s: any) => s.shiftDate === tomorrowStr);
  
  // Use fallback shift types if no shifts found
  const todayShiftType = todayShift?.shiftType || 'G';
  const tomorrowShiftType = tomorrowShift?.shiftType || 'G';
  
  // Get shift display info (simplified version)
  const getShiftDisplay = (shiftType: string) => {
    // Default shift mappings
    const shiftMappings: { [key: string]: any } = {
      'G': { name: 'General', color: 'text-green-600', icon: 'Sun' },
      'N': { name: 'Night', color: 'text-blue-600', icon: 'Moon' },
      'E': { name: 'Evening', color: 'text-orange-600', icon: 'Sun' },
      'H': { name: 'Holiday', color: 'text-red-600', icon: 'Sun' },
      'M': { name: 'Morning', color: 'text-yellow-600', icon: 'Sun' }
    };
    
    return shiftMappings[shiftType] || shiftMappings['G'];
  };

  const todayShiftInfo = getShiftDisplay(todayShiftType);
  const tomorrowShiftInfo = getShiftDisplay(tomorrowShiftType);

  return {
    todayShift: todayShiftType,
    tomorrowShift: tomorrowShiftType,
    todayShiftName: todayShiftInfo.name,
    tomorrowShiftName: tomorrowShiftInfo.name,
    todayShiftColor: todayShiftInfo.color,
    tomorrowShiftColor: tomorrowShiftInfo.color,
    todayShiftTime: undefined,
    tomorrowShiftTime: undefined,
    todayShiftIcon: todayShiftInfo.icon,
    tomorrowShiftIcon: tomorrowShiftInfo.icon,
    projectId: todayShift?.projectId,
    teamId: todayShift?.teamId
  };
}

// Helper function to load work logs data
async function loadWorkLogsData(userEmail: string) {
  try {
    const response = await supabaseClient.getUserWorkLogs(userEmail, {
      order: { column: 'created_at', ascending: false }
    });

    if (response.error) throw new Error(response.error);

    const logs = response.data || [];
    const todayRange = getTodayRange();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    // Calculate stats
    const stats = {
      todayHours: calculateHoursInRange(logs, todayRange.start, todayRange.end),
      weekHours: calculateHoursInRange(logs, weekRange.start, weekRange.end),
      monthHours: calculateHoursInRange(logs, monthRange.start, monthRange.end),
      yearHours: calculateHoursInRange(logs, yearStart, new Date()),
      totalHours: logs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600
    };

    // Calculate project breakdown
    const projectMap = new Map<string, number>();
    logs.forEach((log: any) => {
      const projectName = log.project?.name || 'Unknown Project';
      const hours = (log.logged_duration_seconds || 0) / 3600;
      projectMap.set(projectName, (projectMap.get(projectName) || 0) + hours);
    });

    const projectHours = Array.from(projectMap.entries())
      .map(([name, hours], index) => ({
        projectName: name,
        hours: Math.round(hours * 100) / 100,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);

    return {
      stats,
      projectHours,
      recentWorkLogs: logs.slice(0, 5)
    };
  } catch (error) {
    console.error('Error loading work logs data:', error);
    return {
      stats: { todayHours: 0, weekHours: 0, monthHours: 0, yearHours: 0, totalHours: 0 },
      projectHours: [],
      recentWorkLogs: []
    };
  }
}

// Helper function to load team availability data
async function loadTeamAvailabilityData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch all teams with their members, today's shifts, and project assignments in parallel
    const [teamsResponse, allTeamMembersResponse, allShiftsResponse, projectAssignmentsResponse] = await Promise.all([
      supabaseClient.getTeams(),
      supabaseClient.query({
        table: 'team_members',
        action: 'select',
        select: 'team_id,user_id,users(email,full_name)'
      }),
      supabaseClient.getShiftSchedules({
        filters: { shift_date: today }
      }),
      supabaseClient.query({
        table: 'team_project_assignments',
        action: 'select',
        select: 'team_id,project_id,projects(name)'
      })
    ]);

    if (teamsResponse.error || allTeamMembersResponse.error || allShiftsResponse.error || projectAssignmentsResponse.error) {
      throw new Error('Failed to fetch team data');
    }

    const teams = teamsResponse.data || [];
    const allTeamMembers = allTeamMembersResponse.data || [];
    const allShifts = allShiftsResponse.data || [];
    const projectAssignments = projectAssignmentsResponse.data || [];

    // Create a map of team_id to project data for quick lookup
    const teamProjectMap = new Map();
    projectAssignments.forEach((assignment: any) => {
      teamProjectMap.set(assignment.team_id, {
        projectId: assignment.project_id,
        projectName: assignment.projects?.name || 'Unknown Project'
      });
    });

    // Process teams efficiently
    const availability = [];

    for (const team of teams) {
      try {
        const teamMembers = allTeamMembers.filter((member: any) => member.team_id === team.id);
        const shifts = allShifts.filter((shift: any) => shift.team_id === team.id);
        const projectData = teamProjectMap.get(team.id) || { projectId: '', projectName: 'Unknown Project' };

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

        // Get custom shift enums for this team
        let customEnums: any[] = [];
        try {
          const enumsResponse = await supabaseClient.query({
            table: 'custom_shift_enums',
            action: 'select',
            select: 'shift_identifier, shift_name, start_time, end_time, is_default, color',
            filters: { team_id: team.id }
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
        } catch (enumError) {
          console.error(`Error loading custom enums for team ${team.id}:`, enumError);
        }

        availability.push({
          teamName: team.name,
          projectName: projectData.projectName,
          projectId: projectData.projectId,
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
    console.error('Error loading team availability data:', error);
    return [];
  }
}

// Helper functions
function getTodayRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

function getWeekRange() {
  const today = new Date();
  const start = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

function getMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function calculateHoursInRange(logs: any[], start: Date, end: Date) {
  return logs
    .filter((log: any) => {
      const logDate = new Date(log.start_time);
      return logDate >= start && logDate <= end;
    })
    .reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
}

const PROJECT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

// Cache invalidation functions
export async function invalidateUserCache(userEmail: string): Promise<void> {
  await userCache.invalidateUserCache(userEmail);
}

export async function invalidateUserShifts(userEmail: string): Promise<void> {
  await userCache.invalidateUserShifts(userEmail);
}

export async function invalidateTeamCache(teamId: string): Promise<void> {
  await userCache.invalidateTeamCache(teamId);
}

export async function invalidateProjectCache(projectId: string): Promise<void> {
  await userCache.invalidateProjectCache(projectId);
}
