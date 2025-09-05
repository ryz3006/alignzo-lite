// =====================================================
// KANBAN NOTIFICATION HELPERS
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { emailService, EmailNotificationData, NotificationType } from './email-service';
import { KanbanTask, User, KanbanColumn } from './kanban-types';

// Create Supabase client for database operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * Get user information by ID
 */
async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Get user information by email
 */
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

/**
 * Get project name by ID
 */
async function getProjectName(projectId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project name:', error);
      return null;
    }

    return data?.name || null;
  } catch (error) {
    console.error('Error fetching project name:', error);
    return null;
  }
}

/**
 * Get column name by ID
 */
async function getColumnName(columnId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('name')
      .eq('id', columnId)
      .single();

    if (error) {
      console.error('Error fetching column name:', error);
      return null;
    }

    return data?.name || null;
  } catch (error) {
    console.error('Error fetching column name:', error);
    return null;
  }
}

/**
 * Send task creation notification
 */
export async function sendTaskCreatedNotification(
  task: KanbanTask,
  creatorEmail?: string
): Promise<boolean> {
  try {
    // Get creator information
    const creator = creatorEmail ? await getUserByEmail(creatorEmail) : await getUserById(task.created_by);
    
    // Get assignee information if task is assigned
    const assignee = task.assigned_to ? await getUserById(task.assigned_to) : null;
    
    // Get project and column names
    const [projectName, columnName] = await Promise.all([
      getProjectName(task.project_id),
      getColumnName(task.column_id)
    ]);

    // Determine notification type and recipient
    let notificationType: NotificationType = 'task_created';
    let recipient = assignee || creator;

    // If task is assigned to someone other than creator, send assignment notification
    if (assignee && assignee.id !== task.created_by) {
      notificationType = 'task_assigned';
      recipient = assignee;
    }

    if (!recipient) {
      console.warn('⚠️ No valid recipient for task creation notification');
      return false;
    }

    const notificationData: EmailNotificationData = {
      type: notificationType,
      task,
      assignee: assignee || undefined,
      creator: creator || undefined,
      projectName: projectName || undefined,
      columnName: columnName || undefined
    };

    return await emailService.sendTaskNotification(notificationData);
  } catch (error) {
    console.error('Error sending task creation notification:', error);
    return false;
  }
}

/**
 * Send task update notification
 */
export async function sendTaskUpdatedNotification(
  task: KanbanTask,
  changes: { field: string; oldValue: any; newValue: any }[],
  updaterEmail?: string
): Promise<boolean> {
  try {
    // Get updater information
    const updater = updaterEmail ? await getUserByEmail(updaterEmail) : null;
    
    // Get assignee information if task is assigned
    const assignee = task.assigned_to ? await getUserById(task.assigned_to) : null;
    
    // Get project and column names
    const [projectName, columnName] = await Promise.all([
      getProjectName(task.project_id),
      getColumnName(task.column_id)
    ]);

    // Determine recipient - prioritize assignee, then creator
    const creator = await getUserById(task.created_by);
    const recipient = assignee || creator;

    if (!recipient) {
      console.warn('⚠️ No valid recipient for task update notification');
      return false;
    }

    // Don't send notification if the updater is the same as the recipient
    if (updater && updater.id === recipient.id) {
      console.log('📧 Skipping notification - user updated their own task');
      return true;
    }

    const notificationData: EmailNotificationData = {
      type: 'task_updated',
      task,
      assignee: assignee || undefined,
      creator: creator || undefined,
      changes,
      projectName: projectName || undefined,
      columnName: columnName || undefined
    };

    return await emailService.sendTaskNotification(notificationData);
  } catch (error) {
    console.error('Error sending task update notification:', error);
    return false;
  }
}

/**
 * Send task deletion notification
 */
export async function sendTaskDeletedNotification(
  task: KanbanTask,
  deleterEmail?: string
): Promise<boolean> {
  try {
    // Get deleter information
    const deleter = deleterEmail ? await getUserByEmail(deleterEmail) : null;
    
    // Get assignee information if task was assigned
    const assignee = task.assigned_to ? await getUserById(task.assigned_to) : null;
    
    // Get project and column names
    const [projectName, columnName] = await Promise.all([
      getProjectName(task.project_id),
      getColumnName(task.column_id)
    ]);

    // Determine recipient - prioritize assignee, then creator
    const creator = await getUserById(task.created_by);
    const recipient = assignee || creator;

    if (!recipient) {
      console.warn('⚠️ No valid recipient for task deletion notification');
      return false;
    }

    // Don't send notification if the deleter is the same as the recipient
    if (deleter && deleter.id === recipient.id) {
      console.log('📧 Skipping notification - user deleted their own task');
      return true;
    }

    const notificationData: EmailNotificationData = {
      type: 'task_deleted',
      task,
      assignee: assignee || undefined,
      creator: creator || undefined,
      projectName: projectName || undefined,
      columnName: columnName || undefined
    };

    return await emailService.sendTaskNotification(notificationData);
  } catch (error) {
    console.error('Error sending task deletion notification:', error);
    return false;
  }
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentNotification(
  task: KanbanTask,
  newAssigneeId: string,
  assignerEmail?: string
): Promise<boolean> {
  try {
    // Get new assignee information
    const newAssignee = await getUserById(newAssigneeId);
    
    if (!newAssignee) {
      console.warn('⚠️ New assignee not found for assignment notification');
      return false;
    }

    // Get assigner information
    const assigner = assignerEmail ? await getUserByEmail(assignerEmail) : null;
    
    // Get project and column names
    const [projectName, columnName] = await Promise.all([
      getProjectName(task.project_id),
      getColumnName(task.column_id)
    ]);

    const notificationData: EmailNotificationData = {
      type: 'task_assigned',
      task,
      assignee: newAssignee,
      creator: assigner || undefined,
      projectName: projectName || undefined,
      columnName: columnName || undefined
    };

    return await emailService.sendTaskNotification(notificationData);
  } catch (error) {
    console.error('Error sending task assignment notification:', error);
    return false;
  }
}

/**
 * Compare task objects to detect changes
 */
export function detectTaskChanges(oldTask: Partial<KanbanTask>, newTask: KanbanTask): {
  field: string;
  oldValue: any;
  newValue: any;
}[] {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  
  const fieldsToTrack = [
    'title',
    'description',
    'priority',
    'estimated_hours',
    'actual_hours',
    'due_date',
    'assigned_to',
    'column_id',
    'status'
  ];

  for (const field of fieldsToTrack) {
    const oldValue = oldTask[field as keyof KanbanTask];
    const newValue = newTask[field as keyof KanbanTask];

    // Handle date fields
    if (field === 'due_date') {
      const oldDate = oldValue ? new Date(oldValue as string).toISOString().split('T')[0] : null;
      const newDate = newValue ? new Date(newValue as string).toISOString().split('T')[0] : null;
      
      if (oldDate !== newDate) {
        changes.push({
          field: 'Due Date',
          oldValue: oldDate,
          newValue: newDate
        });
      }
      continue;
    }

    // Handle assignment changes
    if (field === 'assigned_to') {
      if (oldValue !== newValue) {
        changes.push({
          field: 'Assigned To',
          oldValue: oldValue ? 'Assigned' : 'Unassigned',
          newValue: newValue ? 'Assigned' : 'Unassigned'
        });
      }
      continue;
    }

    // Handle column changes
    if (field === 'column_id') {
      if (oldValue !== newValue) {
        changes.push({
          field: 'Column',
          oldValue: oldValue ? 'Previous Column' : 'No Column',
          newValue: newValue ? 'New Column' : 'No Column'
        });
      }
      continue;
    }

    // Handle other fields
    if (oldValue !== newValue) {
      const fieldLabels: { [key: string]: string } = {
        title: 'Title',
        description: 'Description',
        priority: 'Priority',
        estimated_hours: 'Estimated Hours',
        actual_hours: 'Actual Hours',
        status: 'Status'
      };

      changes.push({
        field: fieldLabels[field] || field,
        oldValue: oldValue || 'None',
        newValue: newValue || 'None'
      });
    }
  }

  return changes;
}

/**
 * Test email notification system
 */
export async function testEmailNotifications(): Promise<boolean> {
  try {
    console.log('🧪 Testing email notification system...');
    
    // Test email service connection
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      console.error('❌ Email service connection test failed');
      return false;
    }

    console.log('✅ Email notification system test passed');
    return true;
  } catch (error) {
    console.error('❌ Email notification system test failed:', error);
    return false;
  }
}
