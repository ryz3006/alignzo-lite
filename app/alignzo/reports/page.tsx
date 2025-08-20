'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, WorkLog, Project, ProjectCategory } from '@/lib/supabase';
import { Edit, Trash2, Search, Download, Plus, Eye, RefreshCw } from 'lucide-react';
import { formatDuration, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import EnhancedWorkLogModal from '@/components/EnhancedWorkLogModal';

interface WorkLogWithProject extends WorkLog {
  project: Project;
}

interface FormData {
  project_id: string;
  ticket_id: string;
  task_detail: string;
  dynamic_category_selections: Record<string, any>;
  start_time: string;
  end_time: string;
  total_pause_duration_seconds: number;
  logged_duration_seconds: number;
}

export default function UserWorkReportsPage() {
  const [workLogs, setWorkLogs] = useState<WorkLogWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLogWithProject | null>(null);
  const [viewingLog, setViewingLog] = useState<WorkLogWithProject | null>(null);
  
  // Form data for edit modal
  const [formData, setFormData] = useState<FormData>({
    project_id: '',
    ticket_id: '',
    task_detail: '',
    dynamic_category_selections: {},
    start_time: '',
    end_time: '',
    total_pause_duration_seconds: 0,
    logged_duration_seconds: 0,
  });

  // Break duration inputs for edit modal
  const [breakHours, setBreakHours] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Multi-select state
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadWorkLogs();
    loadProjects();
    
    // Set up real-time subscription for work logs to auto-refresh when timer stops
    const subscription = supabase
      .channel('work_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, () => {
        loadWorkLogs();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadWorkLogs = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('user_email', currentUser.email)
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

  const loadProjects = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // For now, let's load all projects that the user might have access to
      // This is a simplified approach - in production you'd want proper team-based filtering
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

      // Load categories for all projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id);
        const { data: categories, error: categoriesError } = await supabase
          .from('project_categories')
          .select('*')
          .in('project_id', projectIds);

        if (!categoriesError) {
          setProjectCategories(categories || []);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleEdit = (log: WorkLogWithProject) => {
    setEditingLog(log);
    
    // Format datetime for input fields (remove timezone info and format as YYYY-MM-DDTHH:MM)
    const formatDateTimeForInput = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      project_id: log.project_id,
      ticket_id: log.ticket_id,
      task_detail: log.task_detail,
      dynamic_category_selections: log.dynamic_category_selections || {},
      start_time: formatDateTimeForInput(log.start_time),
      end_time: formatDateTimeForInput(log.end_time),
      total_pause_duration_seconds: log.total_pause_duration_seconds,
      logged_duration_seconds: log.logged_duration_seconds,
    });
    
    // Set break duration
    const totalBreakSeconds = log.total_pause_duration_seconds;
    setBreakHours(Math.floor(totalBreakSeconds / 3600));
    setBreakMinutes(Math.floor((totalBreakSeconds % 3600) / 60));
    setBreakSeconds(totalBreakSeconds % 60);
    
    setShowEditModal(true);
  };

  const handleView = (log: WorkLogWithProject) => {
    setViewingLog(log);
    setShowViewModal(true);
  };

  const handleAddNew = () => {
    setFormData({
      project_id: '',
      ticket_id: '',
      task_detail: '',
      dynamic_category_selections: {},
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date().toISOString().slice(0, 16),
      total_pause_duration_seconds: 0,
      logged_duration_seconds: 0,
    });
    setBreakHours(0);
    setBreakMinutes(0);
    setBreakSeconds(0);
    setShowAddModal(true);
  };

  const calculateBreakDuration = () => {
    return breakHours * 3600 + breakMinutes * 60 + breakSeconds;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLog) return;

    try {
      const breakDuration = calculateBreakDuration();
      const updateData = {
        ...formData,
        total_pause_duration_seconds: breakDuration,
      };

      const { error } = await supabase
        .from('work_logs')
        .update(updateData)
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

  const handleBulkDelete = async () => {
    if (selectedLogs.size === 0) {
      toast.error('Please select work logs to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedLogs.size} work log(s)?`)) return;

    try {
      const logIds = Array.from(selectedLogs);
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .in('id', logIds);

      if (error) throw error;
      toast.success(`${selectedLogs.size} work log(s) deleted successfully`);
      setSelectedLogs(new Set());
      setSelectAll(false);
      loadWorkLogs();
    } catch (error: any) {
      console.error('Error deleting work logs:', error);
      toast.error(error.message || 'Failed to delete work logs');
    }
  };

  const handleSelectLog = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLogs(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(currentLogs.map(log => log.id));
      setSelectedLogs(allIds);
      setSelectAll(true);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Project', 'Ticket ID', 'Task Detail', 'Start Time', 'End Time', 'Duration (hours)', 'Break Duration', 'Created'],
      ...workLogs.map(log => [
        log.project?.name || 'N/A',
        log.ticket_id,
        log.task_detail,
        new Date(log.start_time).toLocaleString(),
        new Date(log.end_time).toLocaleString(),
        (log.logged_duration_seconds / 3600).toFixed(2),
        formatDuration(log.total_pause_duration_seconds),
        new Date(log.created_at).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-work-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setLoading(true);
    loadWorkLogs();
    toast.success('Data refreshed');
  };

  const getProjectCategories = (projectId: string) => {
    return projectCategories.filter(cat => cat.project_id === projectId);
  };

  const filteredLogs = workLogs.filter(log =>
    log.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.task_detail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
          <h1 className="text-3xl font-bold text-gray-900">My Work Reports</h1>
          <p className="text-gray-600">View and manage your work logs</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAddNew}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Work Log
          </button>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
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

      {/* Bulk Actions */}
      {selectedLogs.size > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              {selectedLogs.size} work log(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
            >
              Delete Selected ({selectedLogs.size})
            </button>
          </div>
        </div>
      )}

      {/* Work Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
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
                  <input
                    type="checkbox"
                    checked={selectedLogs.has(log.id)}
                    onChange={() => handleSelectLog(log.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
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
                    onClick={() => handleView(log)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(log)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
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

      {/* View Modal */}
      {showViewModal && viewingLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Work Log Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Project:</label>
                  <p className="text-gray-900">{viewingLog.project?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Ticket ID:</label>
                  <p className="text-gray-900">{viewingLog.ticket_id}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-gray-700">Task Detail:</label>
                  <p className="text-gray-900 mt-1">{viewingLog.task_detail}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Start Time:</label>
                  <p className="text-gray-900">{formatDateTime(viewingLog.start_time)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">End Time:</label>
                  <p className="text-gray-900">{formatDateTime(viewingLog.end_time)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Duration:</label>
                  <p className="text-gray-900">{formatDuration(viewingLog.logged_duration_seconds)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Break Duration:</label>
                  <p className="text-gray-900">{formatDuration(viewingLog.total_pause_duration_seconds)}</p>
                </div>
                {Object.keys(viewingLog.dynamic_category_selections || {}).length > 0 && (
                  <div className="col-span-2">
                    <label className="font-medium text-gray-700">Categories Selected:</label>
                    <div className="mt-1">
                      {Object.entries(viewingLog.dynamic_category_selections || {}).map(([key, value]) => (
                        <div key={key} className="text-gray-900">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Work Log
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project
                    </label>
                    <select
                      required
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
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
                </div>

                <div>
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

                {/* Categories */}
                {formData.project_id && getProjectCategories(formData.project_id).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories
                    </label>
                    <div className="space-y-2">
                      {getProjectCategories(formData.project_id).map(category => (
                        <div key={category.id}>
                          <label className="block text-sm text-gray-600 mb-1">
                            {category.name}
                          </label>
                          <select
                            value={formData.dynamic_category_selections[category.name] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              dynamic_category_selections: {
                                ...formData.dynamic_category_selections,
                                [category.name]: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select {category.name}</option>
                            {category.options.map((option: string) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={breakHours}
                        onChange={(e) => setBreakHours(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Minutes</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Seconds</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={breakSeconds}
                        onChange={(e) => setBreakSeconds(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
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

      {/* Enhanced Work Log Modal */}
      <EnhancedWorkLogModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  );
}
