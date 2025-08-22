'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Team, User, TeamMember } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamWithMembers extends Team {
  members: User[];
  memberCount: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  const loadTeams = async () => {
    try {
      // Get teams
      const teamsResponse = await supabaseClient.get('teams', {
        order: { column: 'created_at', ascending: false }
      });

      if (teamsResponse.error) {
        console.error('Error loading teams:', teamsResponse.error);
        throw new Error(teamsResponse.error);
      }

      // Get team members
      const membersResponse = await supabaseClient.get('team_members', {
        select: '*,users(*)'
      });

      if (membersResponse.error) {
        console.error('Error loading team members:', membersResponse.error);
        throw new Error(membersResponse.error);
      }

      const teamsData = teamsResponse.data || [];
      const membersData = membersResponse.data || [];

      // Combine teams with their members
      const teamsWithMembers = teamsData.map((team: any) => {
        const teamMembers = membersData.filter((member: any) => member.team_id === team.id) || [];
        const users = teamMembers.map((member: any) => member.users).filter(Boolean) as User[];
        
        return {
          ...team,
          members: users,
          memberCount: users.length,
        };
      });

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await supabaseClient.getUsers({
        order: { column: 'full_name', ascending: true }
      });

      if (response.error) {
        console.error('Error loading users:', response.error);
        throw new Error(response.error);
      }
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTeam) {
        // Update existing team
        const response = await supabaseClient.update('teams', editingTeam.id, formData);

        if (response.error) {
          console.error('Error updating team:', response.error);
          throw new Error(response.error);
        }
        toast.success('Team updated successfully');
      } else {
        // Create new team
        const response = await supabaseClient.insert('teams', formData);

        if (response.error) {
          console.error('Error creating team:', response.error);
          throw new Error(response.error);
        }
        toast.success('Team created successfully');
      }

      setShowModal(false);
      setEditingTeam(null);
      setFormData({ name: '' });
      loadTeams();
    } catch (error: any) {
      console.error('Error saving team:', error);
      toast.error(error.message || 'Failed to save team');
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({ name: team.name });
    setShowModal(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const response = await supabaseClient.delete('teams', teamId);

      if (response.error) {
        console.error('Error deleting team:', response.error);
        throw new Error(response.error);
      }
      toast.success('Team deleted successfully');
      loadTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error(error.message || 'Failed to delete team');
    }
  };

  const handleManageMembers = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setSelectedMembers(team.members.map(member => member.id));
    setShowMembersModal(true);
  };

  const handleUpdateMembers = async () => {
    if (!selectedTeam) return;

    try {
      // Remove all current members
      const response = await supabaseClient.query({
        table: 'team_members',
        action: 'delete',
        filters: { team_id: selectedTeam.id }
      });

      if (response.error) {
        console.error('Error deleting team members:', response.error);
        throw new Error(response.error);
      }

      // Add new members
      if (selectedMembers.length > 0) {
        const newMembers = selectedMembers.map(userId => ({
          team_id: selectedTeam.id,
          user_id: userId,
        }));

        const insertResponse = await supabaseClient.insert('team_members', newMembers);

        if (insertResponse.error) {
          console.error('Error inserting team members:', insertResponse.error);
          throw new Error(insertResponse.error);
        }
      }

      toast.success('Team members updated successfully');
      setShowMembersModal(false);
      setSelectedTeam(null);
      setSelectedMembers([]);
      loadTeams();
    } catch (error: any) {
      console.error('Error updating team members:', error);
      toast.error(error.message || 'Failed to update team members');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600">Manage teams and assign users</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Team
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {team.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{team.memberCount} members</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(team.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleManageMembers(team)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                    title="Manage Members"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(team)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTeam ? 'Edit Team' : 'Add Team'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTeam(null);
                      setFormData({ name: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    {editingTeam ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manage Team Members - {selectedTeam.name}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Members
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, user.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== user.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-900">
                        {user.full_name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedTeam(null);
                    setSelectedMembers([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMembers}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Update Members
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
