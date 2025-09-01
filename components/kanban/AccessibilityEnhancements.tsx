// =====================================================
// ACCESSIBILITY ENHANCEMENTS FOR KANBAN BOARD
// =====================================================

import React, { useEffect, useRef, useState } from 'react';

// Keyboard navigation hook
export const useKeyboardNavigation = (
  items: any[],
  onSelect?: (item: any) => void,
  onActivate?: (item: any) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onActivate && items[focusedIndex]) {
            onActivate(items[focusedIndex]);
          }
          break;
        case 'Tab':
          if (onSelect && items[focusedIndex]) {
            onSelect(items[focusedIndex]);
          }
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [items, focusedIndex, onSelect, onActivate]);

  return { focusedIndex, containerRef, setFocusedIndex };
};

// Screen reader announcements
export const useScreenReaderAnnouncements = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};

// Focus management for modals
export const useFocusTrap = (isOpen: boolean) => {
  const firstFocusableRef = useRef<HTMLElement>(null);
  const lastFocusableRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the first element when modal opens
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstFocusableRef.current) {
              event.preventDefault();
              lastFocusableRef.current?.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastFocusableRef.current) {
              event.preventDefault();
              firstFocusableRef.current?.focus();
            }
          }
        }
        
        if (event.key === 'Escape') {
          event.preventDefault();
          // Trigger close modal logic here
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus when modal closes
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  return { firstFocusableRef, lastFocusableRef };
};

// Accessible task card component
interface AccessibleTaskCardProps {
  task: any;
  index: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const AccessibleTaskCard: React.FC<AccessibleTaskCardProps> = ({
  task,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  children
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReaderAnnouncements();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.();
        announce(`Selected task: ${task.title}`, 'polite');
        break;
      case 'e':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onEdit?.();
          announce(`Editing task: ${task.title}`, 'polite');
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onDelete?.();
          announce(`Deleted task: ${task.title}`, 'assertive');
        }
        break;
    }
  };

  const getTaskStatusDescription = () => {
    const priority = task.priority || 'medium';
    const status = task.status || 'active';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
    const assignee = task.assigned_to || 'Unassigned';
    
    return `${task.title}. Priority: ${priority}. Status: ${status}. Due: ${dueDate}. Assigned to: ${assignee}.`;
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={getTaskStatusDescription()}
      aria-describedby={`task-description-${task.id}`}
      onKeyDown={handleKeyDown}
      onClick={onSelect}
      className={`
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        transition-all duration-200 rounded-lg
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      {children}
      
      {/* Hidden description for screen readers */}
      <div id={`task-description-${task.id}`} className="sr-only">
        {task.description && `Description: ${task.description}.`}
        {task.jira_ticket_key && ` JIRA ticket: ${task.jira_ticket_key}.`}
        Press Enter to view details, Ctrl+E to edit, Ctrl+Delete to delete.
      </div>
    </div>
  );
};

// Accessible column component
interface AccessibleColumnProps {
  column: any;
  tasks: any[];
  onAddTask?: () => void;
  children: React.ReactNode;
}

export const AccessibleColumn: React.FC<AccessibleColumnProps> = ({
  column,
  tasks,
  onAddTask,
  children
}) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReaderAnnouncements();

  const getColumnDescription = () => {
    const taskCount = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    
    return `Column ${column.name}. ${taskCount} tasks, ${completedTasks} completed. ${column.description || ''}`;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      onAddTask?.();
      announce(`Adding new task to ${column.name}`, 'polite');
    }
  };

  return (
    <section
      ref={columnRef}
      role="region"
      aria-label={getColumnDescription()}
      onKeyDown={handleKeyDown}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      tabIndex={0}
    >
      <h3 className="sr-only">{getColumnDescription()}</h3>
      {children}
      
      {/* Instructions for screen readers */}
      <div className="sr-only">
        Press Ctrl+Enter to add a new task to this column.
        Use arrow keys to navigate between tasks.
      </div>
    </section>
  );
};

// High contrast mode detector
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Skip to content link
export const SkipToContentLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
};

// ARIA live region for dynamic updates
export const LiveRegion: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

export default {
  useKeyboardNavigation,
  useScreenReaderAnnouncements,
  useFocusTrap,
  AccessibleTaskCard,
  AccessibleColumn,
  useHighContrastMode,
  useReducedMotion,
  SkipToContentLink,
  LiveRegion
};
