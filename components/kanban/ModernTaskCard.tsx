// =====================================================
// MODERN REDESIGNED TASK CARD COMPONENT
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
  Clock as ClockIcon,
  Play,
  Edit3,
  Trash2,
  Tag,
  MessageSquare,
  Zap,
  Target,
  Star,
  ChevronRight,
  Eye,
  Activity
} from 'lucide-react';
import { KanbanTask } from '@/lib/kanban-types';
import { animationClasses } from './SimpleAnimations';

interface ModernTaskCardProps {
  task: KanbanTask;
  index: number;
  onClick: () => void;
  viewMode: 'kanban' | 'list';
  isMoving?: boolean;
  onEdit?: (task: KanbanTask) => void;
  onDelete?: (taskId: string) => void;
  onStartTimer?: (task: KanbanTask) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ModernTaskCard = memo(({ task, index, onClick, viewMode, isMoving, onEdit, onDelete, onStartTimer, canEdit, canDelete }: ModernTaskCardProps) => {
  // Enhanced priority colors with modern gradients
  const getPriorityConfig = useCallback((priority: string) => {
    const configs = {
      urgent: {
        gradient: 'from-red-500 to-pink-600',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: '🔥',
        pulse: true
      },
      high: {
        gradient: 'from-orange-500 to-red-500',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
        icon: '⚡',
        pulse: false
      },
      medium: {
        gradient: 'from-yellow-500 to-orange-500',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: '📋',
        pulse: false
      },
      low: {
        gradient: 'from-green-500 to-emerald-500',
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: '🌱',
        pulse: false
      }
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  }, []);

  // Enhanced scope configuration
  const getScopeConfig = useCallback((scope: string) => {
    const configs = {
      personal: {
        gradient: 'from-purple-500 to-indigo-600',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-700 dark:text-purple-300',
        icon: '👤'
      },
      project: {
        gradient: 'from-blue-500 to-cyan-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        icon: '🏢'
      }
    };
    return configs[scope as keyof typeof configs] || configs.project;
  }, []);

  // Enhanced task age calculation
  const taskAgeInfo = useMemo(() => {
    const createdDate = new Date(task.created_at);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let ageText: string;
    let ageColor: string;
    let freshness: 'new' | 'recent' | 'stale' | 'old';

    if (diffMinutes < 1) {
      ageText = 'Just now';
      ageColor = 'bg-gradient-to-r from-emerald-500 to-green-500 text-white';
      freshness = 'new';
    } else if (diffMinutes < 60) {
      ageText = `${diffMinutes}m ago`;
      ageColor = 'bg-gradient-to-r from-emerald-500 to-green-500 text-white';
      freshness = 'new';
    } else if (diffHours < 24) {
      ageText = `${diffHours}h ago`;
      ageColor = diffHours < 6 
        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
        : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      freshness = diffHours < 6 ? 'new' : 'recent';
    } else if (diffDays < 7) {
      ageText = `${diffDays}d ago`;
      ageColor = diffDays < 3 
        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      freshness = diffDays < 3 ? 'recent' : 'stale';
    } else {
      ageText = `${diffDays}d ago`;
      ageColor = 'bg-gradient-to-r from-red-500 to-pink-600 text-white';
      freshness = 'old';
    }

    return { ageText, ageColor, freshness };
  }, [task.created_at]);

  // Priority and scope configurations
  const priorityConfig = useMemo(() => getPriorityConfig(task.priority), [task.priority, getPriorityConfig]);
  const scopeConfig = useMemo(() => getScopeConfig(task.scope), [task.scope, getScopeConfig]);

  // Due date status with enhanced logic
  const dueDateInfo = useMemo(() => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal';
    let color: string;
    let urgency: 'critical' | 'high' | 'medium' | 'low';
    
    if (diffDays < 0) {
      status = 'overdue';
      color = 'text-red-600 dark:text-red-400';
      urgency = 'critical';
    } else if (diffDays === 0) {
      status = 'today';
      color = 'text-orange-600 dark:text-orange-400';
      urgency = 'high';
    } else if (diffDays === 1) {
      status = 'tomorrow';
      color = 'text-yellow-600 dark:text-yellow-400';
      urgency = 'medium';
    } else if (diffDays <= 3) {
      status = 'soon';
      color = 'text-blue-600 dark:text-blue-400';
      urgency = 'medium';
    } else {
      status = 'normal';
      color = 'text-slate-600 dark:text-slate-400';
      urgency = 'low';
    }
    
    return { status, color, urgency, diffDays };
  }, [task.due_date]);

  // Formatted due date
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, [task.due_date]);

  // Progress calculation
  const progressInfo = useMemo(() => {
    const estimated = task.estimated_hours || 0;
    const actual = task.actual_hours || 0;
    
    if (estimated === 0) return null;
    
    const progress = Math.min((actual / estimated) * 100, 100);
    const isOvertime = actual > estimated;
    
    return {
      progress,
      isOvertime,
      estimated,
      actual,
      remaining: Math.max(estimated - actual, 0)
    };
  }, [task.estimated_hours, task.actual_hours]);

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="group flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 sm:p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/30 transition-all duration-300 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-1"
      >
        {/* Priority Indicator */}
        <div className={`w-1 sm:h-16 h-4 sm:w-1 w-full rounded-full bg-gradient-to-b ${priorityConfig.gradient} shadow-lg ${priorityConfig.pulse ? 'animate-pulse' : ''}`} />
        
        {/* Task Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 flex-1 min-w-0">
              {task.title}
            </h4>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {onStartTimer && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTimer(task);
                  }}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                  title="Start Timer"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {task.description && (
            <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center flex-wrap gap-3">
            {/* Priority Badge */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${priorityConfig.gradient} text-white shadow-sm`}>
              <span className="mr-1">{priorityConfig.icon}</span>
              {task.priority}
            </span>
            
            {/* Scope Badge (icon-only to avoid overflow) */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${scopeConfig.gradient} text-white shadow-sm`} title={task.scope}>
              <span>{scopeConfig.icon}</span>
            </span>
            
            {/* JIRA Ticket */}
            {task.jira_ticket_key && (
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <Link className="h-3 w-3" />
                <span className="text-xs font-medium">{task.jira_ticket_key}</span>
              </div>
            )}
            
            {/* Assignee */}
            {task.assigned_to && task.assigned_to.trim() !== '' && (
              <div className="flex items-center space-x-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <User className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-700 dark:text-slate-300">{task.assigned_to}</span>
              </div>
            )}
            
            {/* Due Date */}
            {formattedDueDate && dueDateInfo && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${dueDateInfo.urgency === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Calendar className={`h-3 w-3 ${dueDateInfo.color}`} />
                <span className={`text-xs font-medium ${dueDateInfo.color}`}>{formattedDueDate}</span>
                {dueDateInfo.status === 'overdue' && <AlertCircle className="h-3 w-3 text-red-500" />}
              </div>
            )}
            
            {/* Progress Info */}
            {progressInfo && (
              <div className="flex items-center space-x-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Clock className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {progressInfo.actual}h / {progressInfo.estimated}h
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* View Arrow */}
        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
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
          className={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-5 mb-4 cursor-pointer ${animationClasses.cardHover} ${
            snapshot.isDragging 
              ? animationClasses.dragging + ' bg-white dark:bg-slate-800 ring-2 ring-blue-500/50' 
              : ''
          } ${isMoving ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {/* Loading Overlay */}
          {isMoving && (
            <div className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full ${animationClasses.spin}`} />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Moving...</span>
              </div>
            </div>
          )}
          
          {/* Task Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 mr-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {task.title}
              </h4>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Task Age Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${taskAgeInfo.ageColor} shadow-sm ${taskAgeInfo.freshness === 'new' ? 'animate-pulse' : ''}`}>
                {taskAgeInfo.ageText}
              </span>
            </div>
          </div>

          {/* Task Description */}
          {task.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Progress Bar */}
          {progressInfo && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Progress</span>
                <span className={`text-xs font-medium ${progressInfo.isOvertime ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {progressInfo.actual}h / {progressInfo.estimated}h
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    progressInfo.isOvertime 
                      ? 'bg-gradient-to-r from-red-500 to-pink-600' 
                      : progressInfo.progress > 80 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-600'
                  }`}
                  style={{ width: `${Math.min(progressInfo.progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Task Meta Information */}
          <div className="space-y-3">
            {/* JIRA Ticket */}
            {task.jira_ticket_key && (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Link className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{task.jira_ticket_key}</span>
              </div>
            )}

            {/* Assignee */}
            {task.assigned_to && task.assigned_to.trim() !== '' && (
              <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {task.assigned_to.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1">{task.assigned_to}</span>
              </div>
            )}

            {/* Due Date */}
            {formattedDueDate && dueDateInfo && (
              <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                dueDateInfo.urgency === 'critical' 
                  ? 'bg-red-50 dark:bg-red-900/20' 
                  : dueDateInfo.urgency === 'high'
                    ? 'bg-orange-50 dark:bg-orange-900/20'
                    : 'bg-slate-50 dark:bg-slate-700/50'
              }`}>
                <Calendar className={`h-4 w-4 ${dueDateInfo.color}`} />
                <span className={`text-sm font-medium ${dueDateInfo.color}`}>{formattedDueDate}</span>
                {dueDateInfo.status === 'overdue' && (
                  <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                )}
              </div>
            )}

            {/* Bottom Row: Priority, Scope, and Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                {/* Priority Badge */}
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r ${priorityConfig.gradient} text-white shadow-lg ${priorityConfig.pulse ? 'animate-pulse' : ''}`}>
                  <span className="mr-1">{priorityConfig.icon}</span>
                  {task.priority}
                </span>
                
                {/* Scope Badge (icon-only to avoid overflow) */}
                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r ${scopeConfig.gradient} text-white shadow-lg`} title={task.scope}>
                  <span>{scopeConfig.icon}</span>
                </span>
                
                {/* Completion Status */}
                {task.status === 'completed' && (
                  <div className="inline-flex items-center px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10">
                {onStartTimer && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartTimer(task);
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all transform hover:scale-110"
                    title="Start Timer"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all transform hover:scale-110"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {canEdit && onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all transform hover:scale-110"
                    title="Edit Task"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all transform hover:scale-110"
                    title="Delete Task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Drag Indicator */}
          {snapshot.isDragging && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-ping"></div>
          )}
        </div>
      )}
    </Draggable>
  );
});

ModernTaskCard.displayName = 'ModernTaskCard';

export default ModernTaskCard;
