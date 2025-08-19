import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface User {
  id: string;
  full_name: string;
  email: string;
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
