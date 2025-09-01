// =====================================================
// MODERN EDIT COLUMN MODAL
// =====================================================

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { KanbanColumn } from '@/lib/kanban-types';
import ModernModal from './ModernModal';

interface ModernEditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (columnId: string, updates: { name: string; description?: string; color: string; sort_order?: number }) => void;
  column: KanbanColumn | null;
  allColumns: KanbanColumn[];
}

export default function ModernEditColumnModal({
  isOpen,
  onClose,
  onSubmit,
  column,
  allColumns
}: ModernEditColumnModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    sort_order: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && column) {
      setFormData({
        name: column.name || '',
        description: column.description || '',
        color: column.color || '#6366f1',
        sort_order: column.sort_order || 0
      });
      setErrors({});
    }
  }, [isOpen, column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Column name is required';
    }
    
    if (Object.values(newErrors).some(error => error)) {
      setErrors(newErrors);
      return;
    }

    if (!column) return;

    setIsLoading(true);
    try {
      await onSubmit(column.id, formData);
      onClose();
    } catch (error) {
      console.error('Error updating column:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'
  ];

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Column"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Column Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Column Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm transition-all duration-200 ${
              errors.name 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400' 
                : 'border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400'
            } focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20`}
            placeholder="Enter column name..."
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            placeholder="Enter column description..."
          />
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Column Color
          </label>
          <div className="grid grid-cols-4 gap-3">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleInputChange('color', color)}
                className={`w-12 h-12 rounded-xl border-2 transition-all duration-200 ${
                  formData.color === color 
                    ? 'border-slate-900 dark:border-white scale-110 shadow-lg' 
                    : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-3">
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm cursor-pointer"
            />
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Sort Order
          </label>
          <input
            type="number"
            value={formData.sort_order}
            onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Column</span>
            )}
          </button>
        </div>
      </form>
    </ModernModal>
  );
}
