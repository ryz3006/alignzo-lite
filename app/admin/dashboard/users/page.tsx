'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { User } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const defaultFormData = {
    full_name: '',
    email: '',
    phone_number: '',
    access_dashboard: true,
    access_work_report: false,
    access_analytics: false,
    access_analytics_workload: false,
    access_analytics_project_health: false,
    access_analytics_tickets: false,
    access_analytics_operational: false,
    access_analytics_team_insights: false,
    access_analytics_remedy: false,
    access_upload_tickets: false,
    access_master_mappings: false,
    access_integrations: false,
  };

  const [formData, setFormData] = useState(defaultFormData);

  const resetForm = () => {
    setFormData({ ...defaultFormData });
    setEditingUser(null);
    setShowModal(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await supabaseClient.getUsers({
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) {
        console.error('Error loading users:', response.error);
        throw new Error(response.error);
      }
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        const response = await supabaseClient.update('users', editingUser.id, formData);

        if (response.error) {
          console.error('Error updating user:', response.error);
          throw new Error(response.error);
        }
        toast.success('User updated successfully');
      } else {
        // Create new user
        const response = await supabaseClient.insert('users', formData);

        if (response.error) {
          console.error('Error creating user:', response.error);
          throw new Error(response.error);
        }
        toast.success('User created successfully');
      }

      resetForm();
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number || '',
      access_dashboard: user.access_dashboard ?? true,
      access_work_report: user.access_work_report ?? false,
      access_analytics: user.access_analytics ?? false,
      access_analytics_workload: user.access_analytics_workload ?? false,
      access_analytics_project_health: user.access_analytics_project_health ?? false,
      access_analytics_tickets: user.access_analytics_tickets ?? false,
      access_analytics_operational: user.access_analytics_operational ?? false,
      access_analytics_team_insights: user.access_analytics_team_insights ?? false,
      access_analytics_remedy: user.access_analytics_remedy ?? false,
      access_upload_tickets: user.access_upload_tickets ?? false,
      access_master_mappings: user.access_master_mappings ?? false,
      access_integrations: user.access_integrations ?? false,
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await supabaseClient.delete('users', userId);

      if (response.error) {
        console.error('Error deleting user:', response.error);
        throw new Error(response.error);
      }
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage application users</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-primary-700 flex items-center text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="table-wrapper">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm text-gray-900 truncate">{user.email}</div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {user.phone_number || '-'}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-primary-600 hover:text-primary-900 mr-2 sm:mr-4"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+1234567890"
                  />
                </div>
                
                {/* Access Controls */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Access Controls</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_dashboard"
                        checked={formData.access_dashboard}
                        disabled
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_dashboard" className="ml-2 text-sm text-gray-700">
                        Dashboard (Always enabled)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_work_report"
                        checked={formData.access_work_report}
                        onChange={(e) => setFormData({ ...formData, access_work_report: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_work_report" className="ml-2 text-sm text-gray-700">
                        Work Report
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_analytics"
                        checked={formData.access_analytics}
                        onChange={(e) => setFormData({ ...formData, access_analytics: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_analytics" className="ml-2 text-sm text-gray-700">
                        Analytics
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_upload_tickets"
                        checked={formData.access_upload_tickets}
                        onChange={(e) => setFormData({ ...formData, access_upload_tickets: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_upload_tickets" className="ml-2 text-sm text-gray-700">
                        Upload Tickets
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_master_mappings"
                        checked={formData.access_master_mappings}
                        onChange={(e) => setFormData({ ...formData, access_master_mappings: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_master_mappings" className="ml-2 text-sm text-gray-700">
                        Master Mappings
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="access_integrations"
                        checked={formData.access_integrations}
                        onChange={(e) => setFormData({ ...formData, access_integrations: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="access_integrations" className="ml-2 text-sm text-gray-700">
                        Integrations
                      </label>
                    </div>
                  </div>
                  
                  {/* Analytics Sub-options */}
                  {formData.access_analytics && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Analytics Sub-modules:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_workload"
                            checked={formData.access_analytics_workload}
                            onChange={(e) => setFormData({ ...formData, access_analytics_workload: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_workload" className="ml-2 text-xs text-gray-600">
                            Workload & Utilization
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_project_health"
                            checked={formData.access_analytics_project_health}
                            onChange={(e) => setFormData({ ...formData, access_analytics_project_health: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_project_health" className="ml-2 text-xs text-gray-600">
                            Project Health & FTE
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_tickets"
                            checked={formData.access_analytics_tickets}
                            onChange={(e) => setFormData({ ...formData, access_analytics_tickets: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_tickets" className="ml-2 text-xs text-gray-600">
                            Tickets & Issues
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_operational"
                            checked={formData.access_analytics_operational}
                            onChange={(e) => setFormData({ ...formData, access_analytics_operational: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_operational" className="ml-2 text-xs text-gray-600">
                            Operational Efficiency
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_team_insights"
                            checked={formData.access_analytics_team_insights}
                            onChange={(e) => setFormData({ ...formData, access_analytics_team_insights: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_team_insights" className="ml-2 text-xs text-gray-600">
                            Team Insights
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="access_analytics_remedy"
                            checked={formData.access_analytics_remedy}
                            onChange={(e) => setFormData({ ...formData, access_analytics_remedy: e.target.checked })}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="access_analytics_remedy" className="ml-2 text-xs text-gray-600">
                            Remedy Dashboard
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
