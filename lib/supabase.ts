import { createClient } from '@supabase/supabase-js';

// Get environment variables with runtime checks
function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  // Check if we're in a browser environment (client-side)
  const isClient = typeof window !== 'undefined';
  
  // Server-side: Use environment variables directly
  if (!isClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables not found on server-side:', {
        url: supabaseUrl ? 'SET' : 'NOT SET',
        key: supabaseAnonKey ? 'SET' : 'NOT SET'
      });
      
      // In development, provide a helpful error
      if (process.env.NODE_ENV === 'development') {
        throw new Error('Supabase environment variables not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env.local file');
      }
      
      // In production, return placeholder config to prevent crashes
      console.warn('Using placeholder Supabase config in production - this will cause API errors');
      return {
        url: 'https://placeholder.supabase.co',
        key: 'placeholder-key',
        isClient: false,
        isPlaceholder: true
      };
    }
    
    return {
      url: supabaseUrl,
      key: supabaseAnonKey,
      isClient: false,
      isPlaceholder: false
    };
  }
  
  // Client-side: Use a secure approach
  if (isClient) {
    // For client-side, we'll use a server-side API to get Supabase data
    // This prevents exposing environment variables to the client
    return {
      url: 'https://placeholder.supabase.co', // This will be replaced by API
      key: 'placeholder-key', // This will be replaced by API
      isClient: true,
      isPlaceholder: true
    };
  }
  
  // This should never happen, but TypeScript requires it
  throw new Error('Unable to determine environment');
}

const config = getSupabaseConfig();

// Create a client with proper error handling
export const supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: false, // For server-side usage
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Export config for debugging
export const supabaseConfig = config;

// Database types
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  access_dashboard?: boolean;
  access_work_report?: boolean;
  access_team_work_reports?: boolean;
  access_analytics?: boolean;
  access_analytics_workload?: boolean;
  access_analytics_project_health?: boolean;
  access_analytics_tickets?: boolean;
  access_analytics_operational?: boolean;
  access_analytics_team_insights?: boolean;
  access_analytics_remedy?: boolean;
  access_upload_tickets?: boolean;
  access_master_mappings?: boolean;
  access_shift_schedule?: boolean;
  access_integrations?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface TeamProjectAssignment {
  id: string;
  team_id: string;
  project_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  product: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCategory {
  id: string;
  project_id: string;
  name: string;
  options: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkLog {
  id: string;
  user_email: string;
  project_id: string;
  ticket_id: string;
  task_detail: string;
  dynamic_category_selections: Record<string, string>;
  start_time: string;
  end_time: string;
  total_pause_duration_seconds: number;
  logged_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface Timer {
  id: string;
  user_email: string;
  project_id: string;
  ticket_id: string;
  task_detail: string;
  dynamic_category_selections: Record<string, string>;
  start_time: string;
  is_running: boolean;
  is_paused: boolean;
  pause_start_time?: string;
  total_pause_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface UserIntegration {
  id: string;
  user_email: string;
  integration_type: string;
  base_url?: string;
  user_email_integration?: string;
  api_token?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Ticket Upload Types
export interface TicketSource {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketUploadMapping {
  id: string;
  source_id: string;
  project_id: string;
  source_organization_field: string;
  source_organization_value: string;
  created_at: string;
  updated_at: string;
}

export interface TicketUploadUserMapping {
  id: string;
  mapping_id: string;
  user_email: string;
  source_assignee_field: string;
  source_assignee_value: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedTicket {
  id: string;
  source_id: string;
  mapping_id: string;
  incident_id: string;
  priority?: string;
  region?: string;
  assigned_support_organization?: string;
  assigned_group?: string;
  vertical?: string;
  sub_vertical?: string;
  owner_support_organization?: string;
  owner_group?: string;
  owner?: string;
  reported_source?: string;
  user_name?: string;
  site_group?: string;
  operational_category_tier_1?: string;
  operational_category_tier_2?: string;
  operational_category_tier_3?: string;
  product_name?: string;
  product_categorization_tier_1?: string;
  product_categorization_tier_2?: string;
  product_categorization_tier_3?: string;
  incident_type?: string;
  summary?: string;
  assignee?: string;
  mapped_user_email?: string;
  reported_date1?: string;
  responded_date?: string;
  last_resolved_date?: string;
  closed_date?: string;
  status?: string;
  status_reason_hidden?: string;
  pending_reason?: string;
  group_transfers?: number;
  total_transfers?: number;
  department?: string;
  vip?: boolean;
  company?: string;
  vendor_ticket_number?: string;
  reported_to_vendor?: boolean;
  resolution?: string;
  resolver_group?: string;
  reopen_count?: number;
  reopened_date?: string;
  service_desk_1st_assigned_date?: string;
  service_desk_1st_assigned_group?: string;
  submitter?: string;
  owner_login_id?: string;
  impact?: string;
  submit_date?: string;
  report_date?: string;
  vil_function?: string;
  it_partner?: string;
  mttr?: number;
  mtti?: number;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: string;
  user_email: string;
  source_id: string;
  file_name: string;
  total_rows: number;
  processed_rows: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMasterMapping {
  id: string;
  source_id: string;
  source_assignee_value: string;
  mapped_user_email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Shift Schedule Types
export type ShiftType = 'M' | 'A' | 'N' | 'G' | 'H' | 'L';

export interface ShiftSchedule {
  id: string;
  project_id: string;
  team_id: string;
  user_email: string;
  shift_date: string;
  shift_type: ShiftType;
  created_at: string;
  updated_at: string;
}

export interface CustomShiftEnum {
  id: string;
  project_id: string;
  team_id: string;
  shift_identifier: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_default: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}
