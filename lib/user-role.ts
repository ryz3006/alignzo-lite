import { supabaseClient } from '@/lib/supabase-client';

export interface UserWithRole {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export async function getUserRole(userEmail: string, teamId?: string): Promise<string> {
  try {
    // First get the user ID from the users table
    const userResponse = await supabaseClient.get('users', {
      select: 'id',
      filters: { email: userEmail }
    });

    if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
      return 'member'; // Default role if user not found
    }

    const userId = userResponse.data[0].id;

    // If teamId is provided, get the user's role in that specific team
    if (teamId) {
      const teamMemberResponse = await supabaseClient.get('team_members', {
        select: 'role',
        filters: { user_id: userId, team_id: teamId }
      });

      if (teamMemberResponse.error || !teamMemberResponse.data || teamMemberResponse.data.length === 0) {
        return 'member'; // Default role if not a team member
      }

      return teamMemberResponse.data[0].role || 'member';
    }

    // If no teamId provided, get the highest role across all teams
    const teamMembersResponse = await supabaseClient.get('team_members', {
      select: 'role',
      filters: { user_id: userId }
    });

    if (teamMembersResponse.error || !teamMembersResponse.data || teamMembersResponse.data.length === 0) {
      return 'member'; // Default role if not in any teams
    }

    // Return the highest priority role (owner > member)
    const roles = teamMembersResponse.data.map((member: any) => member.role);
    if (roles.includes('owner')) {
      return 'owner';
    }

    return 'member';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'member'; // Default role on error
  }
}

export async function getUserWithRole(userEmail: string, teamId?: string): Promise<UserWithRole | null> {
  try {
    // Get user details
    const userResponse = await supabaseClient.get('users', {
      select: 'id,email,full_name',
      filters: { email: userEmail }
    });

    if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
      return null;
    }

    const user = userResponse.data[0];
    const role = await getUserRole(userEmail, teamId);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role
    };
  } catch (error) {
    console.error('Error getting user with role:', error);
    return null;
  }
}
