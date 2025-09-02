// =====================================================
// MODERN REDESIGNED KANBAN COLUMN COMPONENT
// =====================================================

import React, { memo, useMemo } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { 
  Plus, 
  MoreVertical, 
  Target,
  Sparkles
} from 'lucide-react';
import ModernTaskCard from './ModernTaskCard';
import { KanbanColumnWithTasks } from '@/lib/kanban-types';
import { animationClasses } from './SimpleAnimations';

interface ModernKanbanColumnProps {
  column: KanbanColumnWithTasks;
  onTaskClick: (task: any) => void;
  onAddTask: (columnId: string) => void;
  onColumnMenu: (column: KanbanColumnWithTasks, event: React.MouseEvent) => void;
  searchQuery: string;
  viewMode: 'kanban' | 'list';
  movingTaskId?: string | null;
  onEditTask?: (task: any) => void;
  onDeleteTask?: (taskId: string) => void;
  onStartTimerForTask?: (task: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  userEmail?: string;
}

const ModernKanbanColumn = memo(({ 
  column, 
  onTaskClick, 
  onAddTask, 
  onColumnMenu,
  searchQuery,
  viewMode,
  movingTaskId,
  onEditTask,
  onDeleteTask,
  onStartTimerForTask,
  canEdit = true,
  canDelete = true,
  userEmail
}: ModernKanbanColumnProps) => {
  
  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    let tasks = column.tasks || [];
    
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

  // Simple column statistics - only total count needed
  const columnStats = useMemo(() => {
    const tasks = filteredTasks;
    const total = tasks.length;
    
    return { total };
  }, [filteredTasks]);

  // Enhanced column color configuration
  const getColumnTheme = useMemo(() => {
    const colorValue = column.color || '#6366f1';
    
    // Convert hex to RGB for better theme generation
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 99, g: 102, b: 241 };
    };
    
    const rgb = hexToRgb(colorValue);
    
    return {
      primary: colorValue,
      light: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
      medium: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
      dark: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`,
      gradient: `linear-gradient(135deg, ${colorValue}22 0%, ${colorValue}11 100%)`
    };
  }, [column.color]);

  return (
    <div className="flex-shrink-0 w-full sm:w-80 max-w-sm sm:max-w-none">
      <div 
        className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 h-full flex flex-col overflow-hidden ${animationClasses.columnHover}`}
        style={{
          background: `${getColumnTheme.gradient}, rgba(255, 255, 255, 0.8)`,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Enhanced Column Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div 
                className="relative w-4 h-4 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-800"
                style={{ backgroundColor: column.color }}
              >
                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: column.color }}></div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {column.name}
              </h3>
              <div className="flex items-center space-x-2">
                <span 
                  className="text-sm px-3 py-1 rounded-full font-semibold text-white shadow-sm"
                  style={{ backgroundColor: column.color }}
                >
                  {columnStats.total}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onAddTask(column.id)}
                className="group p-2.5 text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg"
                title="Add task"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => onColumnMenu(column, e)}
                className="group p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 transform hover:scale-105"
                title="Column options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Column Description */}
          {column.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {column.description}
            </p>
          )}
        </div>

        {/* Tasks Container */}
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 p-4 overflow-y-auto ${
                snapshot.isDraggingOver 
                  ? animationClasses.dragOver
                  : ''
              }`}
              style={{
                maxHeight: 'calc(100vh - 400px)',
                minHeight: '300px'
              }}
            >
              {/* Drag Over Indicator */}
              {snapshot.isDraggingOver && (
                <div className="mb-4 p-4 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Drop task here</p>
                  </div>
                </div>
              )}
              
              {filteredTasks.map((task, index) => (
                <ModernTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick(task)}
                  viewMode={viewMode}
                  isMoving={movingTaskId === task.id}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStartTimer={onStartTimerForTask}
                  canEdit={canEdit}
                  canDelete={canDelete && userEmail === task.created_by}
                />
              ))}
              {provided.placeholder}
              
              {/* Enhanced Empty State */}
              {filteredTasks.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div 
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${column.color}22 0%, ${column.color}11 100%)`,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {searchQuery ? (
                      <Target className="h-10 w-10 text-slate-400" />
                    ) : (
                      <Sparkles className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {searchQuery ? 'No matching tasks' : 'No tasks yet'}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search criteria'
                      : 'Start by creating your first task in this column'
                    }
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => onAddTask(column.id)}
                      className="group flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create First Task</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </Droppable>

        {/* Quick Add Button at Bottom */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-transparent transition-all duration-200 transform hover:scale-102 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">Add task</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ModernKanbanColumn.displayName = 'ModernKanbanColumn';

export default ModernKanbanColumn;
