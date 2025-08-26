// =====================================================
// OPTIMIZED KANBAN COLUMN COMPONENT
// =====================================================

import React, { memo, useMemo } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { Plus, MoreVertical } from 'lucide-react';
import TaskCard from './TaskCard';
import { KanbanColumnWithTasks } from '@/lib/kanban-types';

interface KanbanColumnProps {
  column: KanbanColumnWithTasks;
  onTaskClick: (task: any) => void;
  onAddTask: (columnId: string) => void;
  onColumnMenu: (column: KanbanColumnWithTasks, event: React.MouseEvent) => void;
  searchQuery: string;
  viewMode: 'kanban' | 'list';
}

const KanbanColumn = memo(({ 
  column, 
  onTaskClick, 
  onAddTask, 
  onColumnMenu,
  searchQuery,
  viewMode 
}: KanbanColumnProps) => {
  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    let tasks = column.tasks || [];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.jira_ticket_key?.toLowerCase().includes(query)
      );
    }
    
    return tasks;
  }, [column.tasks, searchQuery]);

  // Memoized task count
  const taskCount = useMemo(() => filteredTasks.length, [filteredTasks]);

  return (
    <div className="flex-shrink-0 w-80 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {column.name}
          </h3>
          <span className="bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs px-2 py-1 rounded-full">
            {taskCount}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onAddTask(column.id)}
            className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => onColumnMenu(column, e)}
            className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Column options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Column Description */}
      {column.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {column.description}
        </p>
      )}

      {/* Tasks Container */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] transition-colors ${
              snapshot.isDraggingOver 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600' 
                : ''
            }`}
          >
            {filteredTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={() => onTaskClick(task)}
                viewMode={viewMode}
              />
            ))}
            {provided.placeholder}
            
            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                <p className="text-sm">No tasks</p>
                <button
                  onClick={() => onAddTask(column.id)}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add your first task
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
