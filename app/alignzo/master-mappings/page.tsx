'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { TicketSource, TicketMasterMapping } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, RefreshCw, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterMappingsPage() {
  const [sources, setSources] = useState<TicketSource[]>([]);
  const [masterMappings, setMasterMappings] = useState<TicketMasterMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<TicketMasterMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<TicketMasterMapping | null>(null);
  
  // Form states
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sourceAssigneeValue, setSourceAssigneeValue] = useState<string>('');
  const [mappedUserEmail, setMappedUserEmail] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Filter mappings based on search term
    const filtered = masterMappings.filter(mapping => 
      mapping.source_assignee_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.mapped_user_email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMappings(filtered);
  }, [searchTerm, masterMappings]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load sources first, then master mappings
      await loadSources();
      await loadMasterMappings();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    const response = await supabaseClient.getTicketSources();
    
    if (response.error) {
      console.error('Error loading sources:', response.error);
      throw new Error(response.error);
    }
    setSources(response.data || []);
  };

  const loadMasterMappings = async () => {
    try {
      const response = await fetch('/api/master-mappings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load master mappings');
      }

      const result = await response.json();
      
      // Ensure sources are loaded before creating the map
      if (sources.length === 0) {
        console.warn('Sources not loaded yet, loading them now...');
        await loadSources();
      }
      
      // Get the current sources state after loading
      const currentSources = sources.length > 0 ? sources : await supabaseClient.getTicketSources().then(r => r.data || []);
      
      // Create a map of source_id to source name for manual joining
      const sourceMap = new Map(currentSources.map((source: any) => [source.id, source.name]));
      
      // Add source information to each mapping
      const mappingsWithSource = (result.data || []).map((mapping: any) => {
        // Check if the mapping has a nested source object from the join
        const sourceName = mapping.source?.name || sourceMap.get(mapping.source_id) || 'Unknown';
        
        return {
          ...mapping,
          source: {
            id: mapping.source_id,
            name: sourceName
          }
        };
      });
      
      setMasterMappings(mappingsWithSource);
    } catch (error) {
      console.error('Error loading master mappings:', error);
      toast.error('Failed to load master mappings');
    }
  };

  const handleAddMapping = async () => {
    if (!selectedSource || !sourceAssigneeValue.trim() || !mappedUserEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/master-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: selectedSource,
          source_assignee_value: sourceAssigneeValue.trim(),
          mapped_user_email: mappedUserEmail.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create mapping');
      }

      toast.success('Master mapping created successfully');
      setShowAddModal(false);
      resetForm();
      loadMasterMappings();
    } catch (error: any) {
      console.error('Error creating mapping:', error);
      toast.error(error.message || 'Failed to create mapping');
    }
  };

  const handleEditMapping = (mapping: TicketMasterMapping) => {
    setEditingMapping(mapping);
    setSelectedSource(mapping.source_id);
    setSourceAssigneeValue(mapping.source_assignee_value);
    setMappedUserEmail(mapping.mapped_user_email);
    setShowEditModal(true);
  };

  const handleUpdateMapping = async () => {
    if (!editingMapping || !selectedSource || !sourceAssigneeValue.trim() || !mappedUserEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/master-mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingMapping.id,
          source_id: selectedSource,
          source_assignee_value: sourceAssigneeValue.trim(),
          mapped_user_email: mappedUserEmail.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update mapping');
      }

      toast.success('Master mapping updated successfully');
      setShowEditModal(false);
      setEditingMapping(null);
      resetForm();
      loadMasterMappings();
    } catch (error: any) {
      console.error('Error updating mapping:', error);
      toast.error(error.message || 'Failed to update mapping');
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this master mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/master-mappings?id=${mappingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete mapping');
      }

      toast.success('Master mapping deleted successfully');
      loadMasterMappings();
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast.error(error.message || 'Failed to delete mapping');
    }
  };

  const handleToggleActive = async (mapping: TicketMasterMapping) => {
    try {
      const response = await fetch('/api/master-mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: mapping.id,
          is_active: !mapping.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update mapping status');
      }

      toast.success(`Mapping ${mapping.is_active ? 'deactivated' : 'activated'} successfully`);
      loadMasterMappings();
    } catch (error: any) {
      console.error('Error toggling mapping status:', error);
      toast.error(error.message || 'Failed to update mapping status');
    }
  };

  const resetForm = () => {
    setSelectedSource('');
    setSourceAssigneeValue('');
    setMappedUserEmail('');
    setEditingMapping(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-32 w-32"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Master Mappings</h1>
          <p className="text-gray-600 dark:text-neutral-400">Centralized user mappings for all ticket sources (similar to JIRA integrations)</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Master Mapping
          </button>
          <button
            onClick={loadData}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-neutral-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by assignee value or mapped user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern w-full pl-10 pr-4"
            />
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
        <div className="p-6">
          {filteredMappings.length === 0 ? (
            <div className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {searchTerm ? 'No mappings found' : 'No master mappings'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first master mapping.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Source Assignee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Mapped User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredMappings.map((mapping) => (
                    <tr key={mapping.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {(mapping as any).source?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {mapping.source_assignee_value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {mapping.mapped_user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(mapping)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mapping.is_active 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300'
                          }`}
                        >
                          {mapping.is_active ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                        {new Date(mapping.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditMapping(mapping)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit mapping"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMapping(mapping.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete mapping"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Mapping Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-md">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Master Mapping</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Source Assignee Value
                  </label>
                  <input
                    type="text"
                    value={sourceAssigneeValue}
                    onChange={(e) => setSourceAssigneeValue(e.target.value)}
                    placeholder="e.g., john.doe@company.com"
                    className="input-modern w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                    The assignee value as it appears in the source system
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Mapped User Email
                  </label>
                  <input
                    type="email"
                    value={mappedUserEmail}
                    onChange={(e) => setMappedUserEmail(e.target.value)}
                    placeholder="e.g., john.doe@alignzo.com"
                    className="input-modern w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                    The user email in your system
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMapping}
                    className="btn-primary text-sm"
                  >
                    Add Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mapping Modal */}
      {showEditModal && editingMapping && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-md">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Master Mapping</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Ticket Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="input-modern w-full"
                  >
                    <option value="">Select a source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Source Assignee Value
                  </label>
                  <input
                    type="text"
                    value={sourceAssigneeValue}
                    onChange={(e) => setSourceAssigneeValue(e.target.value)}
                    placeholder="e.g., john.doe@company.com"
                    className="input-modern w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Mapped User Email
                  </label>
                  <input
                    type="email"
                    value={mappedUserEmail}
                    onChange={(e) => setMappedUserEmail(e.target.value)}
                    placeholder="e.g., john.doe@alignzo.com"
                    className="input-modern w-full"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMapping}
                    className="btn-primary text-sm"
                  >
                    Update Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
