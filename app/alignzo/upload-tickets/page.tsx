'use client';

import { useEffect, useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText, Settings, Trash2, X } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';
import { Project, TicketSource, TicketUploadMapping } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface UploadSession {
  id: string;
  filename: string;
  total_records: number;
  processed_records: number;
  successful_uploads: number;
  failed_uploads: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  error_message?: string;
}

export default function UploadTicketsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ticketSources, setTicketSources] = useState<TicketSource[]>([]);
  const [uploadMappings, setUploadMappings] = useState<TicketUploadMapping[]>([]);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<string>('');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [newMapping, setNewMapping] = useState({
    source_id: '',
    project_id: '',
    source_organization_field: '',
    source_organization_value: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const projectsResponse = await supabaseClient.getProjects();
      if (projectsResponse.error) {
        throw new Error(projectsResponse.error);
      }
      setProjects(projectsResponse.data || []);

      // Load ticket sources
      const sourcesResponse = await supabaseClient.getTicketSources();
      if (sourcesResponse.error) {
        throw new Error(sourcesResponse.error);
      }
      setTicketSources(sourcesResponse.data || []);

      // Load upload mappings
      const mappingsResponse = await supabaseClient.getTicketUploadMappings();
      if (mappingsResponse.error) {
        throw new Error(mappingsResponse.error);
      }
      setUploadMappings(mappingsResponse.data || []);

      // Load upload sessions
      const sessionsResponse = await supabaseClient.getUploadSessions();
      if (sessionsResponse.error) {
        throw new Error(sessionsResponse.error);
      }
      setUploadSessions(sessionsResponse.data || []);

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please select a CSV or Excel file');
        return;
      }
      
      // Validate file size (1MB limit)
      const maxSize = 1 * 1024 * 1024; // 1MB in bytes
      if (file.size > maxSize) {
        toast.error('File size must be less than 1MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedMapping) {
      toast.error('Please select a file and mapping configuration');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mapping_id', selectedMapping);

      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      toast.success(`Upload started successfully! Session ID: ${result.session_id}`);
      
      // Reset form
      setSelectedFile(null);
      setSelectedMapping('');
      
      // Reload sessions
      loadInitialData();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await supabaseClient.insert('ticket_upload_mappings', newMapping);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('Mapping created successfully');
      setShowMappingModal(false);
      setNewMapping({
        source_id: '',
        project_id: '',
        source_organization_field: '',
        source_organization_value: ''
      });
      
      // Reload mappings
      loadInitialData();
      
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast.error('Failed to create mapping');
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) {
      return;
    }

    try {
      const response = await supabaseClient.delete('ticket_upload_mappings', mappingId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('Mapping deleted successfully');
      loadInitialData();
      
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'incident_id,priority,status,assignee,summary,description,created_date',
      'INC000001,High,Open,john.doe@company.com,Sample ticket,Sample description,2024-01-01 10:00:00',
      'INC000002,Medium,In Progress,jane.smith@company.com,Another ticket,Another description,2024-01-01 11:00:00'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticket_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await supabaseClient.delete('upload_sessions', sessionId);
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('Upload session deleted successfully');
      loadInitialData();
      
    } catch (error) {
      console.error('Error deleting upload session:', error);
      toast.error('Failed to delete upload session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading upload interface...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Upload Tickets</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Upload and manage ticket data from external sources.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="btn-success flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </button>
          <button
            onClick={() => setShowMappingModal(true)}
            className="btn-primary flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Mappings
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Upload New Tickets</h2>
        
        <div className="space-y-6">
          {/* File Selection */}
          <div>
            <label className="form-label">
              Select File (CSV, Excel)
            </label>
            <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-neutral-300 dark:border-neutral-600 border-dashed rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
              <div className="space-y-3 text-center">
                <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                <div className="flex text-sm text-neutral-600 dark:text-neutral-400">
                  <label className="relative cursor-pointer bg-white dark:bg-neutral-800 rounded-lg font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 px-4 py-2 border border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-3 self-center">or drag and drop</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">CSV, XLSX up to 1MB</p>
                {selectedFile && (
                  <div className="mt-3 p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-700">
                    <p className="text-sm text-success-700 dark:text-success-300 font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Selected: {selectedFile.name}
                    </p>
                    <p className="text-xs text-success-600 dark:text-success-400 mt-1">
                      Size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mapping Selection */}
          <div>
            <label className="form-label">
              Select Upload Mapping
            </label>
            <select
              value={selectedMapping}
              onChange={(e) => setSelectedMapping(e.target.value)}
              className="input-modern"
            >
              <option value="">Choose a mapping configuration...</option>
              {uploadMappings.map((mapping) => (
                <option key={mapping.id} value={mapping.id}>
                  {(mapping as any).source?.name} → {(mapping as any).project?.name} 
                  ({mapping.source_organization_field}: {mapping.source_organization_value})
                </option>
              ))}
            </select>
            {uploadMappings.length === 0 && (
              <p className="text-sm text-warning-600 dark:text-warning-400 mt-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                No mappings configured. Create a mapping first.
              </p>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedMapping}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {uploading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Tickets
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload History */}
      <div className="card">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Upload History</h2>
        
        {uploadSessions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-16 w-16 text-neutral-400 dark:text-neutral-500" />
            <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">No uploads yet</h3>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">Upload your first ticket file to see history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th className="text-left">Filename</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Date Time</th>
                  <th className="text-left">Uploaded By</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                    <td className="font-medium text-neutral-900 dark:text-white">
                      {session.filename}
                    </td>
                    <td>
                      <span className={`badge ${
                        session.status === 'completed' ? 'badge-success' :
                        session.status === 'failed' ? 'badge-danger' :
                        'badge-warning'
                      } flex items-center w-fit`}>
                        {session.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {session.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-neutral-600 dark:text-neutral-400">
                      {new Date(session.created_at).toLocaleString()}
                    </td>
                    <td className="text-neutral-600 dark:text-neutral-400">
                      System
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300 p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
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
        )}
      </div>

      {/* Mapping Management Modal */}
      {showMappingModal && (
        <div className="modal-overlay" onClick={() => setShowMappingModal(false)}>
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Manage Upload Mappings</h3>
              <button
                onClick={() => setShowMappingModal(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Create New Mapping Form */}
            <form onSubmit={handleCreateMapping} className="mb-8 p-6 bg-neutral-50 dark:bg-neutral-700 rounded-xl">
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Create New Mapping</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select
                    value={newMapping.source_id}
                    onChange={(e) => setNewMapping({...newMapping, source_id: e.target.value})}
                    className="input-modern"
                    required
                  >
                    <option value="">Select source...</option>
                    {ticketSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Project</label>
                  <select
                    value={newMapping.project_id}
                    onChange={(e) => setNewMapping({...newMapping, project_id: e.target.value})}
                    className="input-modern"
                    required
                  >
                    <option value="">Select project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Field</label>
                  <input
                    type="text"
                    value={newMapping.source_organization_field}
                    onChange={(e) => setNewMapping({...newMapping, source_organization_field: e.target.value})}
                    className="input-modern"
                    placeholder="e.g., department"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Value</label>
                  <input
                    type="text"
                    value={newMapping.source_organization_value}
                    onChange={(e) => setNewMapping({...newMapping, source_organization_value: e.target.value})}
                    className="input-modern"
                    placeholder="e.g., IT Support"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Mapping
                </button>
              </div>
            </form>

            {/* Existing Mappings */}
            <div>
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Existing Mappings</h4>
              {uploadMappings.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">No mappings configured yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th className="text-left">Source</th>
                        <th className="text-left">Project</th>
                        <th className="text-left">Field</th>
                        <th className="text-left">Value</th>
                        <th className="text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadMappings.map((mapping) => (
                        <tr key={mapping.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                          <td className="text-neutral-900 dark:text-white">
                            {(mapping as any).source?.name || 'Unknown'}
                          </td>
                          <td className="text-neutral-900 dark:text-white">
                            {(mapping as any).project?.name || 'Unknown'}
                          </td>
                          <td className="text-neutral-900 dark:text-white">
                            {mapping.source_organization_field}
                          </td>
                          <td className="text-neutral-900 dark:text-white">
                            {mapping.source_organization_value}
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              className="p-2 text-danger-600 hover:text-danger-700 dark:text-danger-400 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                              title="Delete mapping"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
