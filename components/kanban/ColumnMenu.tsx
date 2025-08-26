'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { KanbanColumn } from '@/lib/kanban-types';

interface ColumnMenuProps {
  column: KanbanColumn;
  taskCount: number;
  onEdit: (column: KanbanColumn) => void;
  onDelete: (columnId: string) => void;
  isOwner: boolean;
}

export default function ColumnMenu({ column, taskCount, onEdit, onDelete, isOwner }: ColumnMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    if (taskCount > 0) {
      alert(`Cannot delete column "${column.name}" because it contains ${taskCount} task(s). Please move or delete all tasks first.`);
      return;
    }
    onDelete(column.id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onEdit(column);
                setIsOpen(false);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Column
            </button>
            
            {isOwner && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </button>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
