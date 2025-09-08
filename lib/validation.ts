import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Full name too long'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
  access_dashboard: z.boolean().default(true),
  access_my_jira_tickets: z.boolean().default(false),
  access_work_report: z.boolean().default(false),
  access_analytics: z.boolean().default(false),
  access_analytics_workload: z.boolean().default(false),
  access_analytics_project_health: z.boolean().default(false),
  access_analytics_tickets: z.boolean().default(false),
  access_analytics_operational: z.boolean().default(false),
  access_analytics_team_insights: z.boolean().default(false),
  access_analytics_remedy: z.boolean().default(false),
  access_upload_tickets: z.boolean().default(false),
  access_master_mappings: z.boolean().default(false),
  access_integrations: z.boolean().default(false),
});

export const userUpdateSchema = userSchema.partial();

// Admin authentication validation
export const adminAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// JIRA integration validation
export const jiraIntegrationSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  base_url: z.string().url('Invalid URL'),
  user_email_integration: z.string().email('Invalid integration email'),
  api_token: z.string().min(1, 'API token is required'),
  is_verified: z.boolean().default(false),
});

// JIRA credentials verification
export const jiraCredentialsSchema = z.object({
  base_url: z.string().url('Invalid URL'),
  user_email: z.string().email('Invalid email address'),
  api_token: z.string().min(1, 'API token is required'),
});

// Work log validation
export const workLogSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  project_id: z.string().uuid('Invalid project ID'),
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  task_detail: z.string().min(1, 'Task detail is required'),
  dynamic_category_selections: z.record(z.string()),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time'),
  total_pause_duration_seconds: z.number().min(0),
  logged_duration_seconds: z.number().min(0),
});

// Timer validation
export const timerSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  project_id: z.string().uuid('Invalid project ID'),
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  task_detail: z.string().min(1, 'Task detail is required'),
  dynamic_category_selections: z.record(z.string()),
  start_time: z.string().datetime('Invalid start time'),
  is_running: z.boolean(),
  is_paused: z.boolean(),
  pause_start_time: z.string().datetime().optional(),
  total_pause_duration_seconds: z.number().min(0),
});

// Project validation
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long'),
  product: z.string().min(1, 'Product is required').max(255, 'Product name too long'),
  country: z.string().min(1, 'Country is required').max(255, 'Country name too long'),
});

// Team validation
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255, 'Team name too long'),
});

// Team member validation
export const teamMemberSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  user_id: z.string().uuid('Invalid user ID'),
});

// Team project assignment validation
export const teamProjectAssignmentSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  project_id: z.string().uuid('Invalid project ID'),
});

// Project category validation
export const projectCategorySchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  name: z.string().min(1, 'Category name is required').max(255, 'Category name too long'),
  options: z.array(z.string()).min(1, 'At least one option is required'),
});

// Ticket upload mapping validation
export const ticketUploadMappingSchema = z.object({
  source_id: z.string().uuid('Invalid source ID'),
  project_id: z.string().uuid('Invalid project ID'),
  source_organization_field: z.string().min(1, 'Organization field is required'),
  source_organization_value: z.string().min(1, 'Organization value is required'),
});

// Ticket upload user mapping validation
export const ticketUploadUserMappingSchema = z.object({
  mapping_id: z.string().uuid('Invalid mapping ID'),
  user_email: z.string().email('Invalid email address'),
  source_assignee_field: z.string().min(1, 'Assignee field is required'),
  source_assignee_value: z.string().min(1, 'Assignee value is required'),
});

// Shift schedule validation
export const shiftScheduleSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  team_id: z.string().uuid('Invalid team ID'),
  user_email: z.string().email('Invalid email address'),
  shift_date: z.string().datetime('Invalid shift date'),
  shift_type: z.enum(['M', 'A', 'N', 'G', 'H', 'L'], {
    errorMap: () => ({ message: 'Invalid shift type. Must be M, A, N, G, H, or L' })
  }),
});

// Custom shift enum validation
export const customShiftEnumSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  team_id: z.string().uuid('Invalid team ID'),
  shift_identifier: z.string().min(1, 'Shift identifier is required').max(10, 'Shift identifier too long'),
  shift_name: z.string().min(1, 'Shift name is required').max(255, 'Shift name too long'),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
  is_default: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (hex)'),
});

// JIRA user mapping validation
export const jiraUserMappingSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  jira_assignee: z.string().min(1, 'JIRA assignee is required'),
  jira_reporter: z.string().optional(),
});

// JIRA project mapping validation
export const jiraProjectMappingSchema = z.object({
  dashboard_project_id: z.string().uuid('Invalid dashboard project ID'),
  jira_project_key: z.string().min(1, 'JIRA project key is required'),
  jira_project_name: z.string().min(1, 'JIRA project name is required'),
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  source_id: z.string().uuid('Invalid source ID'),
});

// Search validation
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(255, 'Search query too long'),
  filters: z.record(z.any()).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Date range validation
export const dateRangeSchema = z.object({
  start_date: z.string().datetime('Invalid start date'),
  end_date: z.string().datetime('Invalid end date'),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: 'Start date must be before or equal to end date',
  path: ['end_date'],
});

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Safe validation function that returns null on error
export function safeValidateInput<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

// Partial validation for updates
export function validatePartialInput<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> {
  try {
    // Try to parse with the original schema first
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If it's a Zod error, try to extract valid fields
      const validData: any = {};
      const errors = error.errors;
      
      // For now, return empty object - in a real implementation,
      // you might want to extract valid fields from the data
      console.warn('Partial validation failed:', errors);
      return validData;
    }
    throw error;
  }
}

// Email validation helper
export function isValidEmail(email: string): boolean {
  try {
    z.string().email().parse(email);
    return true;
  } catch {
    return false;
  }
}

// UUID validation helper
export function isValidUUID(uuid: string): boolean {
  try {
    z.string().uuid().parse(uuid);
    return true;
  } catch {
    return false;
  }
}

// URL validation helper
export function isValidURL(url: string): boolean {
  try {
    z.string().url().parse(url);
    return true;
  } catch {
    return false;
  }
}

// Export all schemas for use in API routes
export const schemas = {
  user: userSchema,
  userUpdate: userUpdateSchema,
  adminAuth: adminAuthSchema,
  jiraIntegration: jiraIntegrationSchema,
  jiraCredentials: jiraCredentialsSchema,
  workLog: workLogSchema,
  timer: timerSchema,
  project: projectSchema,
  team: teamSchema,
  teamMember: teamMemberSchema,
  teamProjectAssignment: teamProjectAssignmentSchema,
  projectCategory: projectCategorySchema,
  ticketUploadMapping: ticketUploadMappingSchema,
  ticketUploadUserMapping: ticketUploadUserMappingSchema,
  shiftSchedule: shiftScheduleSchema,
  customShiftEnum: customShiftEnumSchema,
  jiraUserMapping: jiraUserMappingSchema,
  jiraProjectMapping: jiraProjectMappingSchema,
  fileUpload: fileUploadSchema,
  search: searchSchema,
  dateRange: dateRangeSchema,
};
