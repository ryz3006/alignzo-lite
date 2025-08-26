// =====================================================
// OPTIMIZED TASK CARD COMPONENT
// =====================================================

import React, { memo, useMemo, useCallback } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Clock, 
  User, 
  Link, 
  AlertCircle,
  CheckCircle,
  Clock as ClockIcon
} from 'lucide-react';
import { KanbanTask } from '@/lib/kanban-types';

interface TaskCardProps {
  task: KanbanTask;
  index: number;
  onClick: () => void;
  viewMode: 'kanban' | 'list';
  isMoving?: boolean;
}

const TaskCard = memo(({ task, index, onClick, viewMode, isMoving }: TaskCardProps) => {
  // Memoized priority colors
  const getPriorityColor = useCallback((priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  }, []);

  // Memoized scope colors
  const getScopeColor = useCallback((scope: string) => {
    const colors = {
      personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      project: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    };
    return colors[scope as keyof typeof colors] || colors.project;
  }, []);

  // Memoized priority color
  const priorityColor = useMemo(() => getPriorityColor(task.priority), [task.priority, getPriorityColor]);

  // Memoized scope color
  const scopeColor = useMemo(() => getScopeColor(task.scope), [task.scope, getScopeColor]);

  // Memoized due date status
  const dueDateStatus = useMemo(() => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  }, [task.due_date]);

  // Memoized due date color
  const dueDateColor = useMemo(() => {
    switch (dueDateStatus) {
      case 'overdue': return 'text-red-600 dark:text-red-400';
      case 'today': return 'text-orange-600 dark:text-orange-400';
      case 'soon': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-neutral-600 dark:text-neutral-400';
    }
  }, [dueDateStatus]);

  // Memoized formatted due date
  const formattedDueDate = useMemo(() => {
    if (!task.due_date) return null;
    
    const date = new Date(task.due_date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  }, [task.due_date]);

  // Memoized estimated hours display
  const estimatedHoursDisplay = useMemo(() => {
    if (!task.estimated_hours) return null;
    return `${task.estimated_hours}h`;
  }, [task.estimated_hours]);

  // Memoized actual hours display
  const actualHoursDisplay = useMemo(() => {
    if (!task.actual_hours) return null;
    return `${task.actual_hours}h`;
  }, [task.actual_hours]);

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="flex items-center space-x-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:shadow-md transition-all cursor-pointer"
      >
        {/* Priority Indicator */}
        <div className={`w-2 h-2 rounded-full ${priorityColor.split(' ')[0]}`} />
        
        {/* Task Title */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-neutral-900 dark:text-white truncate">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
              {task.description}
            </p>
          )}
        </div>
        
        {/* Task Meta */}
        <div className="flex items-center space-x-3 text-sm">
          {task.jira_ticket_key && (
            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
              <Link className="h-3 w-3" />
              <span>{task.jira_ticket_key}</span>
            </div>
          )}
          
          {task.assigned_to && (
            <div className="flex items-center space-x-1 text-neutral-600 dark:text-neutral-400">
              <User className="h-3 w-3" />
              <span>{task.assigned_to}</span>
            </div>
          )}
          
          {formattedDueDate && (
            <div className={`flex items-center space-x-1 ${dueDateColor}`}>
              <Calendar className="h-3 w-3" />
              <span>{formattedDueDate}</span>
            </div>
          )}
          
          {estimatedHoursDisplay && (
            <div className="flex items-center space-x-1 text-neutral-600 dark:text-neutral-400">
              <ClockIcon className="h-3 w-3" />
              <span>{estimatedHoursDisplay}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3 cursor-pointer transition-all relative ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
          } ${isMoving ? 'opacity-50' : ''}`}
        >
          {/* Loading Overlay for Moving Task */}
          {isMoving && (
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Moving...
                </span>
              </div>
            </div>
          )}
          {/* Task Header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-neutral-900 dark:text-white text-sm leading-tight flex-1 mr-2">
              {task.title}
            </h4>
            
            {/* Priority Badge */}
            <span className={`text-xs px-2 py-1 rounded-full ${priorityColor}`}>
              {task.priority}
            </span>
          </div>

          {/* Task Description */}
          {task.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Task Meta */}
          <div className="space-y-2">
            {/* JIRA Ticket */}
            {task.jira_ticket_key && (
              <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                <Link className="h-3 w-3" />
                <span>{task.jira_ticket_key}</span>
              </div>
            )}

            {/* Assigned To */}
            {task.assigned_to && (
              <div className="flex items-center space-x-1 text-xs text-neutral-600 dark:text-neutral-400">
                <User className="h-3 w-3" />
                <span>{task.assigned_to}</span>
              </div>
            )}

            {/* Due Date */}
            {formattedDueDate && (
              <div className={`flex items-center space-x-1 text-xs ${dueDateColor}`}>
                <Calendar className="h-3 w-3" />
                <span>{formattedDueDate}</span>
                {dueDateStatus === 'overdue' && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </div>
            )}

            {/* Hours */}
            {(estimatedHoursDisplay || actualHoursDisplay) && (
              <div className="flex items-center space-x-1 text-xs text-neutral-600 dark:text-neutral-400">
                <Clock className="h-3 w-3" />
                <span>
                  {actualHoursDisplay && estimatedHoursDisplay 
                    ? `${actualHoursDisplay}/${estimatedHoursDisplay}`
                    : actualHoursDisplay || estimatedHoursDisplay
                  }
                </span>
              </div>
            )}

            {/* Scope Badge */}
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${scopeColor}`}>
                {task.scope}
              </span>
              
              {/* Completion Status */}
              {task.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
