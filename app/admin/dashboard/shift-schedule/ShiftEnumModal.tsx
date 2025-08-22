'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { CustomShiftEnum } from '@/lib/supabase';
import { X, Plus, Trash2, Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftEnumModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  teamId: string;
  projectName: string;
  teamName: string;
  onShiftsUpdated: () => void;
}

interface ShiftEnumForm {
  shift_identifier: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_default: boolean;
  color: string;
}

export default function ShiftEnumModal({
  isOpen,
  onClose,
  projectId,
  teamId,
  projectName,
  teamName,
  onShiftsUpdated
}: ShiftEnumModalProps) {
  const [shiftEnums, setShiftEnums] = useState<CustomShiftEnum[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ShiftEnumForm>({
    shift_identifier: '',
    shift_name: '',
    start_time: '',
    end_time: '',
    is_default: false,
    color: '#3B82F6' // Default blue color
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId && teamId) {
      loadShiftEnums();
    }
  }, [isOpen, projectId, teamId]);

  const loadShiftEnums = async () => {
    try {
      setLoading(true);
      
      // Use the proxy client to get custom shift enums
      const response = await supabaseClient.get('custom_shift_enums', {
        select: '*',
        filters: { 
          project_id: projectId,
          team_id: teamId
        },
        order: { column: 'shift_identifier', ascending: true }
      });

      if (response.error) throw new Error(response.error);
      
      let enums = response.data || [];
      
      // Ensure mandatory H, G, and L enums exist
      await ensureMandatoryEnums();
      
      // Reload after ensuring mandatory enums
      const updatedResponse = await supabaseClient.get('custom_shift_enums', {
        select: '*',
        filters: { 
          project_id: projectId,
          team_id: teamId
        },
        order: { column: 'shift_identifier', ascending: true }
      });
      
      if (updatedResponse.error) throw new Error(updatedResponse.error);
      setShiftEnums(updatedResponse.data || []);
    } catch (error) {
      console.error('Error loading shift enums:', error);
      toast.error('Failed to load shift enums');
    } finally {
      setLoading(false);
    }
  };

  const ensureMandatoryEnums = async () => {
    try {
      // Check if mandatory enums exist
      const existingResponse = await supabaseClient.get('custom_shift_enums', {
        select: 'shift_identifier',
        filters: { 
          project_id: projectId,
          team_id: teamId,
          shift_identifier: ['H', 'G', 'L']
        }
      });

      if (existingResponse.error) throw new Error(existingResponse.error);

      const existingIdentifiers = existingResponse.data?.map((e: any) => e.shift_identifier) || [];
      const mandatoryEnums = [
        { shift_identifier: 'H', shift_name: 'Holiday', start_time: '00:00', end_time: '23:59', is_default: false, color: '#EF4444' },
        { shift_identifier: 'G', shift_name: 'General/Day', start_time: '09:00', end_time: '17:00', is_default: true, color: '#10B981' },
        { shift_identifier: 'L', shift_name: 'Leave', start_time: '00:00', end_time: '23:59', is_default: false, color: '#F59E0B' }
      ];

      for (const mandatoryEnum of mandatoryEnums) {
        if (!existingIdentifiers.includes(mandatoryEnum.shift_identifier)) {
          await supabaseClient.insert('custom_shift_enums', {
            project_id: projectId,
            team_id: teamId,
            ...mandatoryEnum
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring mandatory enums:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.shift_identifier.trim() || !formData.shift_name.trim() || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.shift_identifier.length > 10) {
      toast.error('Shift identifier must be 10 characters or less');
      return;
    }

    // Check for duplicate identifier
    const existing = shiftEnums.find(enum_ => 
      enum_.shift_identifier.toUpperCase() === formData.shift_identifier.toUpperCase() && 
      enum_.id !== editingId
    );
    if (existing) {
      toast.error('Shift identifier already exists');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // Update existing
        const response = await supabaseClient.update('custom_shift_enums', editingId, {
          shift_identifier: formData.shift_identifier.toUpperCase(),
          shift_name: formData.shift_name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_default: formData.is_default,
          color: formData.color
        });

        if (response.error) throw new Error(response.error);
        toast.success('Shift enum updated successfully');
      } else {
        // Create new
        const response = await supabaseClient.insert('custom_shift_enums', {
          project_id: projectId,
          team_id: teamId,
          shift_identifier: formData.shift_identifier.toUpperCase(),
          shift_name: formData.shift_name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_default: formData.is_default,
          color: formData.color
        });

        if (response.error) throw new Error(response.error);
        toast.success('Shift enum created successfully');
      }

      // If setting as default, unset other defaults
      if (formData.is_default) {
        // Get all other enums and update them
        const otherEnumsResponse = await supabaseClient.get('custom_shift_enums', {
          select: 'id',
          filters: { 
            project_id: projectId,
            team_id: teamId,
            id: { neq: editingId || '' }
          }
        });

        if (!otherEnumsResponse.error && otherEnumsResponse.data) {
          for (const enumItem of otherEnumsResponse.data) {
            await supabaseClient.update('custom_shift_enums', enumItem.id, { is_default: false });
          }
        }
      }

      resetForm();
      await loadShiftEnums();
      // Add a small delay to ensure database update is complete
      setTimeout(() => {
        onShiftsUpdated();
      }, 200);
    } catch (error) {
      console.error('Error saving shift enum:', error);
      toast.error('Failed to save shift enum');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, shiftIdentifier: string) => {
    // Prevent deletion of mandatory enums
    if (shiftIdentifier === 'H' || shiftIdentifier === 'G' || shiftIdentifier === 'L') {
      toast.error('Cannot delete mandatory shift types (H - Holiday, G - General, L - Leave)');
      return;
    }

    if (!confirm('Are you sure you want to delete this shift enum?')) return;

    try {
      const response = await supabaseClient.delete('custom_shift_enums', id);

      if (response.error) throw new Error(response.error);
      toast.success('Shift enum deleted successfully');
      await loadShiftEnums();
      // Add a small delay to ensure database update is complete
      setTimeout(() => {
        onShiftsUpdated();
      }, 200);
    } catch (error: any) {
      console.error('Error deleting shift enum:', error);
      toast.error(error.message || 'Failed to delete shift enum');
    }
  };

  const handleEdit = (shiftEnum: CustomShiftEnum) => {
    setFormData({
      shift_identifier: shiftEnum.shift_identifier,
      shift_name: shiftEnum.shift_name,
      start_time: shiftEnum.start_time,
      end_time: shiftEnum.end_time,
      is_default: shiftEnum.is_default,
      color: shiftEnum.color || '#3B82F6'
    });
    setEditingId(shiftEnum.id);
    setShowForm(true);
  };

  const isMandatoryEnum = (identifier: string) => {
    return identifier === 'H' || identifier === 'G' || identifier === 'L';
  };

  const resetForm = () => {
    setFormData({
      shift_identifier: '',
      shift_name: '',
      start_time: '',
      end_time: '',
      is_default: false,
      color: '#3B82F6'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleValidateShifts = async () => {
    try {
      setSaving(true);
      const currentDate = new Date();
      
      // Since RPC calls are not supported through the proxy, we'll implement this logic directly
      // Get all shift schedules for the current month
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`;

      const shiftsResponse = await supabaseClient.get('shift_schedules', {
        select: '*',
        filters: { 
          project_id: projectId,
          team_id: teamId,
          shift_date: { gte: startDate, lte: endDate }
        }
      });

      if (shiftsResponse.error) throw new Error(shiftsResponse.error);

      // Validate shifts against custom enums
      const validShiftTypes = shiftEnums.map(enumItem => enumItem.shift_identifier);
      const invalidShifts = shiftsResponse.data?.filter((shift: any) => 
        !validShiftTypes.includes(shift.shift_type)
      ) || [];

      if (invalidShifts.length > 0) {
        toast.error(`${invalidShifts.length} shifts have invalid shift types`);
        return;
      }

      toast.success('All shifts are valid!');
    } catch (error: any) {
      console.error('Error validating shifts:', error);
      toast.error(error.message || 'Failed to validate shifts');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Shift Enums</h2>
            <p className="text-sm text-gray-500 mt-1">
              {projectName} - {teamName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Shift Enum
              </button>
              <button
                onClick={handleValidateShifts}
                disabled={saving || shiftEnums.length === 0}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                <Clock className="h-4 w-4 mr-1" />
                Validate Shifts
              </button>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingId ? 'Edit Shift Enum' : 'Add New Shift Enum'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Identifier *
                      {editingId && isMandatoryEnum(formData.shift_identifier) && (
                        <span className="text-xs text-red-600 ml-1">(Cannot edit mandatory)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.shift_identifier}
                      onChange={(e) => setFormData(prev => ({ ...prev, shift_identifier: e.target.value }))}
                      disabled={!!(editingId && isMandatoryEnum(formData.shift_identifier))}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editingId && isMandatoryEnum(formData.shift_identifier) 
                          ? 'bg-gray-100 cursor-not-allowed' 
                          : ''
                      }`}
                      placeholder="e.g., M, A, N"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Name *
                    </label>
                    <input
                      type="text"
                      value={formData.shift_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, shift_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Morning, Afternoon, Night"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Color *
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                        title="Choose shift color"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        title="Hex color code (e.g., #3B82F6)"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose a color to represent this shift type in the schedule
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                    Set as default shift (for invalid assignments)
                  </label>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Shift Enums List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading shift enums...</p>
            </div>
          ) : shiftEnums.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shift enums defined</h3>
              <p className="text-gray-500 mb-4">
                Create custom shift enums for this project-team combination to enable validation.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 mx-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Shift Enum
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Current Shift Enums</h3>
              <div className="grid gap-4">
                {shiftEnums.map((shiftEnum) => (
                  <div
                    key={shiftEnum.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: shiftEnum.color || '#3B82F6' }}
                            title={`Color: ${shiftEnum.color || '#3B82F6'}`}
                          ></div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isMandatoryEnum(shiftEnum.shift_identifier)
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {shiftEnum.shift_identifier}
                          </span>
                          {isMandatoryEnum(shiftEnum.shift_identifier) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Mandatory
                            </span>
                          )}
                          {shiftEnum.is_default && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {shiftEnum.shift_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {shiftEnum.start_time} - {shiftEnum.end_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(shiftEnum)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                          title="Edit shift enum"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shiftEnum.id, shiftEnum.shift_identifier)}
                          disabled={isMandatoryEnum(shiftEnum.shift_identifier)}
                          className={`p-2 rounded-md ${
                            isMandatoryEnum(shiftEnum.shift_identifier)
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                          title={
                            isMandatoryEnum(shiftEnum.shift_identifier)
                              ? 'Cannot delete mandatory shift types'
                              : 'Delete shift enum'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
