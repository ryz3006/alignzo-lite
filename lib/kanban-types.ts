// =====================================================
// KANBAN BOARD TYPE DEFINITIONS
// =====================================================

export interface CategoryOption {
  id: string;
  category_id: string;
  option_name: string;
  option_value: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCategory {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  options?: CategoryOption[];
}

export interface ProjectSubcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  project_id: string;
  team_id?: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  category_id: string;
  category_option_id?: string;
  column_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  jira_ticket_id?: string;
  jira_ticket_key?: string;
  scope: 'personal' | 'project';
  created_by: string;
  assigned_to?: string;
  status: 'active' | 'completed' | 'archived';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
  notes?: string;
}

export interface TaskTimeline {
  id: string;
  task_id: string;
  user_email: string;
  user_name?: string;
  action: string;
  details?: any;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_email: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  product: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  access_dashboard: boolean;
  access_work_report: boolean;
  access_analytics: boolean;
  access_analytics_workload: boolean;
  access_analytics_project_health: boolean;
  access_analytics_tickets: boolean;
  access_analytics_operational: boolean;
  access_analytics_team_insights: boolean;
  access_analytics_remedy: boolean;
  access_upload_tickets: boolean;
  access_master_mappings: boolean;
  access_integrations: boolean;
  created_at: string;
  updated_at: string;
}

// Extended interfaces for UI components
export interface KanbanTaskWithDetails {
  id: string;
  title: string;
  description?: string;
  column_id: string;
  sort_order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'archived';
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  jira_ticket_key?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  
  // Legacy single category fields (for backward compatibility)
  category_id: string;
  category_option_id?: string;
  
  // Scope field for compatibility with KanbanTask
  scope: 'personal' | 'project';
  
  // New multiple categories support
  categories?: TaskCategoryWithDetails[];
  
  // User relationships
  assigned_to_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  
  // Column relationship
  column?: KanbanColumn;
  
  // Comments and timeline
  comments?: TaskComment[];
  timeline?: TaskTimeline[];
}

export interface KanbanColumnWithTasks extends KanbanColumn {
  tasks: KanbanTaskWithDetails[];
}

export interface ProjectWithCategories extends Project {
  categories: ProjectCategory[];
  columns: KanbanColumn[];
}

// Form interfaces
export interface CreateTaskForm {
  title: string;
  description?: string;
  project_id: string;
  category_id: string; // Legacy single category field
  category_option_id?: string; // Legacy single category option field
  column_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_hours?: number;
  due_date?: string | null;
  jira_ticket_id?: string;
  jira_ticket_key?: string;
  scope: 'personal' | 'project';
  assigned_to?: string;
  created_by?: string;
  // New multiple categories support
  categories?: TaskCategorySelection[];
}

export interface UpdateTaskForm {
  title?: string;
  description?: string;
  category_id?: string;
  category_option_id?: string;
  column_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string | null;
  jira_ticket_id?: string;
  jira_ticket_key?: string;
  assigned_to?: string;
  status?: 'active' | 'completed' | 'archived';
}

export interface CreateCategoryForm {
  name: string;
  description?: string;
  color: string;
  sort_order?: number;
}

export interface CreateSubcategoryForm {
  name: string;
  description?: string;
  color: string;
  sort_order?: number;
}

export interface CreateColumnForm {
  name: string;
  description?: string;
  color: string;
  sort_order?: number;
  team_id?: string;
}

// Filter and search interfaces
export interface TaskFilters {
  project_id?: string;
  category_id?: string;
  subcategory_id?: string;
  assigned_to?: string;
  created_by?: string;
  priority?: string;
  status?: string;
  scope?: 'personal' | 'project';
  jira_linked?: boolean;
  due_date_from?: string;
  due_date_to?: string;
}

export interface TaskSearchParams {
  query?: string;
  filters?: TaskFilters;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// API response interfaces
export interface ApiResponse<T> {
  data: T | null;
  success: boolean;
  message?: string;
  error?: string;
  source?: 'redis' | 'database' | 'unknown';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Drag and drop interfaces
export interface DragItem {
  id: string;
  type: 'task';
  task: KanbanTaskWithDetails;
}

export interface DropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
}

// JIRA integration interfaces
export interface JiraTicket {
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  project: string;
  issue_type?: string;
  created: string;
  updated: string;
}

export interface JiraSearchResult {
  issues: JiraTicket[];
  total: number;
  max_results: number;
  start_at: number;
}

// Notification interfaces
export interface TaskNotification {
  id: string;
  task_id: string;
  user_email: string;
  type: 'assignment' | 'comment' | 'status_change' | 'due_date_approaching' | 'mention';
  message: string;
  is_read: boolean;
  created_at: string;
}

// Task-Category Mapping Types
export interface TaskCategoryMapping {
  id: string;
  task_id: string;
  category_id: string;
  category_option_id?: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface TaskCategoryWithDetails {
  mapping_id: string;
  category_id: string;
  category_name: string;
  category_description?: string;
  category_color?: string;
  category_option_id?: string;
  option_name?: string;
  option_value?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface TaskCategorySelection {
  category_id: string;
  category_option_id?: string;
  is_primary: boolean;
  sort_order: number;
}


