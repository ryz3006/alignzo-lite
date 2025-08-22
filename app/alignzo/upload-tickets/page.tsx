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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Tickets</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage ticket data from external sources.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </button>
          <button
            onClick={() => setShowMappingModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Mappings
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload New Tickets</h2>
        
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File (CSV, Excel)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV, XLSX up to 10MB</p>
                {selectedFile && (
                  <p className="text-sm text-green-600 font-medium">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mapping Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Upload Mapping
            </label>
            <select
              value={selectedMapping}
              onChange={(e) => setSelectedMapping(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-sm text-yellow-600 mt-1">
                No mappings configured. Create a mapping first.
              </p>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedMapping}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload History</h2>
        
        {uploadSessions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No uploads yet</h3>
            <p className="mt-1 text-sm text-gray-500">Upload your first ticket file to see history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {session.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.total_records}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {session.successful_uploads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {session.failed_uploads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium">Manage Upload Mappings</h3>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Create New Mapping Form */}
            <form onSubmit={handleCreateMapping} className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-lg font-medium mb-4">Create New Mapping</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    value={newMapping.source_id}
                    onChange={(e) => setNewMapping({...newMapping, source_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select
                    value={newMapping.project_id}
                    onChange={(e) => setNewMapping({...newMapping, project_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Field</label>
                  <input
                    type="text"
                    value={newMapping.source_organization_field}
                    onChange={(e) => setNewMapping({...newMapping, source_organization_field: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., department"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Value</label>
                  <input
                    type="text"
                    value={newMapping.source_organization_value}
                    onChange={(e) => setNewMapping({...newMapping, source_organization_value: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., IT Support"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Mapping
                </button>
              </div>
            </form>

            {/* Existing Mappings */}
            <div>
              <h4 className="text-lg font-medium mb-4">Existing Mappings</h4>
              {uploadMappings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No mappings configured yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadMappings.map((mapping) => (
                        <tr key={mapping.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(mapping as any).source?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(mapping as any).project?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mapping.source_organization_field}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mapping.source_organization_value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
