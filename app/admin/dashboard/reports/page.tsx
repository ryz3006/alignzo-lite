'use client';

import { useEffect, useState } from 'react';
import { supabase, WorkLog, Project, User } from '@/lib/supabase';
import { Edit, Trash2, Search, Download, Filter } from 'lucide-react';
import { formatDuration, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface WorkLogWithDetails extends WorkLog {
  project: Project;
  user: User;
}

export default function WorkReportsPage() {
  const [workLogs, setWorkLogs] = useState<WorkLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLogWithDetails | null>(null);
  const [formData, setFormData] = useState({
    ticket_id: '',
    task_detail: '',
    logged_duration_seconds: 0,
  });

  useEffect(() => {
    loadWorkLogs();
  }, []);

  const loadWorkLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          project:projects(*),
          user:users!work_logs_user_email_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error loading work logs:', error);
      toast.error('Failed to load work logs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log: WorkLogWithDetails) => {
    setEditingLog(log);
    setFormData({
      ticket_id: log.ticket_id,
      task_detail: log.task_detail,
      logged_duration_seconds: log.logged_duration_seconds,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLog) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .update(formData)
        .eq('id', editingLog.id);

      if (error) throw error;
      toast.success('Work log updated successfully');
      setShowEditModal(false);
      setEditingLog(null);
      loadWorkLogs();
    } catch (error: any) {
      console.error('Error updating work log:', error);
      toast.error(error.message || 'Failed to update work log');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this work log?')) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      toast.success('Work log deleted successfully');
      loadWorkLogs();
    } catch (error: any) {
      console.error('Error deleting work log:', error);
      toast.error(error.message || 'Failed to delete work log');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['User Email', 'Project', 'Ticket ID', 'Task Detail', 'Start Time', 'End Time', 'Duration (hours)', 'Created'],
      ...workLogs.map(log => [
        log.user_email,
        log.project?.name || 'N/A',
        log.ticket_id,
        log.task_detail,
        new Date(log.start_time).toLocaleString(),
        new Date(log.end_time).toLocaleString(),
        (log.logged_duration_seconds / 3600).toFixed(2),
        new Date(log.created_at).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = workLogs.filter(log =>
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.task_detail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

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
          <h1 className="text-3xl font-bold text-gray-900">Work Reports</h1>
          <p className="text-gray-600">View and manage all work logs</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search work logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Work Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task Detail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.user_email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {log.project?.name || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.ticket_id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate" title={log.task_detail}>
                    {log.task_detail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {formatDateTime(log.start_time)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDuration(log.logged_duration_seconds)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(log)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Work Log
              </h3>
              <form onSubmit={handleUpdate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ticket_id}
                    onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Detail
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.task_detail}
                    onChange={(e) => setFormData({ ...formData, task_detail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.logged_duration_seconds}
                    onChange={(e) => setFormData({ ...formData, logged_duration_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingLog(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Update
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
