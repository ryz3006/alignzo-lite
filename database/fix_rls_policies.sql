-- Fix RLS Policies for All Tables
-- Run this in your Supabase SQL Editor
-- This script fixes the insecure RLS policies that currently allow unrestricted access

-- 1. Fix users table RLS
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Allow public insert" ON users;
DROP POLICY IF EXISTS "Allow public update" ON users;
DROP POLICY IF EXISTS "Allow public delete" ON users;

-- Only authenticated users can view users table (for admin purposes)
CREATE POLICY "Authenticated users can view users" ON users
FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage users (insert, update, delete)
CREATE POLICY "Admins can manage users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE email = auth.jwt() ->> 'email' 
    AND access_dashboard = true
  )
);

-- 2. Fix work_logs table RLS
DROP POLICY IF EXISTS "Allow public read access" ON work_logs;
DROP POLICY IF EXISTS "Allow public insert" ON work_logs;
DROP POLICY IF EXISTS "Allow public update" ON work_logs;
DROP POLICY IF EXISTS "Allow public delete" ON work_logs;

CREATE POLICY "Users can view their own work logs" ON work_logs
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own work logs" ON work_logs
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own work logs" ON work_logs
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own work logs" ON work_logs
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 3. Fix timers table RLS
DROP POLICY IF EXISTS "Allow public read access" ON timers;
DROP POLICY IF EXISTS "Allow public insert" ON timers;
DROP POLICY IF EXISTS "Allow public update" ON timers;
DROP POLICY IF EXISTS "Allow public delete" ON timers;

CREATE POLICY "Users can view their own timers" ON timers
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own timers" ON timers
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own timers" ON timers
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own timers" ON timers
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 4. Fix user_integrations table RLS
DROP POLICY IF EXISTS "Allow public read access" ON user_integrations;
DROP POLICY IF EXISTS "Allow public insert" ON user_integrations;
DROP POLICY IF EXISTS "Allow public update" ON user_integrations;
DROP POLICY IF EXISTS "Allow public delete" ON user_integrations;

CREATE POLICY "Users can view their own integrations" ON user_integrations
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own integrations" ON user_integrations
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own integrations" ON user_integrations
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own integrations" ON user_integrations
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 5. Fix uploaded_tickets table RLS
DROP POLICY IF EXISTS "Allow public read access" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public insert" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public update" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public delete" ON uploaded_tickets;

-- Users can only see tickets they uploaded
CREATE POLICY "Users can view their uploaded tickets" ON uploaded_tickets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM upload_sessions 
    WHERE upload_sessions.id = uploaded_tickets.source_id 
    AND upload_sessions.user_email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can insert tickets" ON uploaded_tickets
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM upload_sessions 
    WHERE upload_sessions.id = uploaded_tickets.source_id 
    AND upload_sessions.user_email = auth.jwt() ->> 'email'
  )
);

-- 6. Fix upload_sessions table RLS
DROP POLICY IF EXISTS "Allow public read access" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public insert" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public update" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public delete" ON upload_sessions;

CREATE POLICY "Users can view their upload sessions" ON upload_sessions
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create upload sessions" ON upload_sessions
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their upload sessions" ON upload_sessions
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their upload sessions" ON upload_sessions
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 7. Fix ticket_sources table RLS
DROP POLICY IF EXISTS "Allow public read access" ON ticket_sources;
DROP POLICY IF EXISTS "Allow public insert" ON ticket_sources;
DROP POLICY IF EXISTS "Allow public update" ON ticket_sources;
DROP POLICY IF EXISTS "Allow public delete" ON ticket_sources;

-- Only authenticated users can access ticket sources
CREATE POLICY "Authenticated users can access ticket sources" ON ticket_sources
FOR ALL USING (auth.role() = 'authenticated');

-- 8. Fix ticket_upload_mappings table RLS
DROP POLICY IF EXISTS "Allow public read access" ON ticket_upload_mappings;
DROP POLICY IF EXISTS "Allow public insert" ON ticket_upload_mappings;
DROP POLICY IF EXISTS "Allow public update" ON ticket_upload_mappings;
DROP POLICY IF EXISTS "Allow public delete" ON ticket_upload_mappings;

-- Only authenticated users can access mappings
CREATE POLICY "Authenticated users can access ticket mappings" ON ticket_upload_mappings
FOR ALL USING (auth.role() = 'authenticated');

-- 9. Fix ticket_upload_user_mappings table RLS
DROP POLICY IF EXISTS "Allow public read access" ON ticket_upload_user_mappings;
DROP POLICY IF EXISTS "Allow public insert" ON ticket_upload_user_mappings;
DROP POLICY IF EXISTS "Allow public update" ON ticket_upload_user_mappings;
DROP POLICY IF EXISTS "Allow public delete" ON ticket_upload_user_mappings;

-- Only authenticated users can access user mappings
CREATE POLICY "Authenticated users can access user mappings" ON ticket_upload_user_mappings
FOR ALL USING (auth.role() = 'authenticated');

-- 10. Fix ticket_master_mappings table RLS
DROP POLICY IF EXISTS "Allow public read access" ON ticket_master_mappings;
DROP POLICY IF EXISTS "Allow public insert" ON ticket_master_mappings;
DROP POLICY IF EXISTS "Allow public update" ON ticket_master_mappings;
DROP POLICY IF EXISTS "Allow public delete" ON ticket_master_mappings;

-- Only authenticated users can access master mappings
CREATE POLICY "Authenticated users can access master mappings" ON ticket_master_mappings
FOR ALL USING (auth.role() = 'authenticated');

-- 11. Fix teams table RLS
DROP POLICY IF EXISTS "Allow public read access" ON teams;
DROP POLICY IF EXISTS "Allow public insert" ON teams;
DROP POLICY IF EXISTS "Allow public update" ON teams;
DROP POLICY IF EXISTS "Allow public delete" ON teams;

-- Only authenticated users can access teams
CREATE POLICY "Authenticated users can access teams" ON teams
FOR ALL USING (auth.role() = 'authenticated');

-- 12. Fix team_members table RLS
DROP POLICY IF EXISTS "Allow public read access" ON team_members;
DROP POLICY IF EXISTS "Allow public insert" ON team_members;
DROP POLICY IF EXISTS "Allow public update" ON team_members;
DROP POLICY IF EXISTS "Allow public delete" ON team_members;

-- Only authenticated users can access team members
CREATE POLICY "Authenticated users can access team members" ON team_members
FOR ALL USING (auth.role() = 'authenticated');

-- 13. Fix projects table RLS
DROP POLICY IF EXISTS "Allow public read access" ON projects;
DROP POLICY IF EXISTS "Allow public insert" ON projects;
DROP POLICY IF EXISTS "Allow public update" ON projects;
DROP POLICY IF EXISTS "Allow public delete" ON projects;

-- Only authenticated users can access projects
CREATE POLICY "Authenticated users can access projects" ON projects
FOR ALL USING (auth.role() = 'authenticated');

-- 14. Fix team_project_assignments table RLS
DROP POLICY IF EXISTS "Allow public read access" ON team_project_assignments;
DROP POLICY IF EXISTS "Allow public insert" ON team_project_assignments;
DROP POLICY IF EXISTS "Allow public update" ON team_project_assignments;
DROP POLICY IF EXISTS "Allow public delete" ON team_project_assignments;

-- Only authenticated users can access team project assignments
CREATE POLICY "Authenticated users can access team project assignments" ON team_project_assignments
FOR ALL USING (auth.role() = 'authenticated');

-- 15. Fix project_categories table RLS
DROP POLICY IF EXISTS "Allow public read access" ON project_categories;
DROP POLICY IF EXISTS "Allow public insert" ON project_categories;
DROP POLICY IF EXISTS "Allow public update" ON project_categories;
DROP POLICY IF EXISTS "Allow public delete" ON project_categories;

-- Only authenticated users can access project categories
CREATE POLICY "Authenticated users can access project categories" ON project_categories
FOR ALL USING (auth.role() = 'authenticated');

-- 16. Fix shift_schedules table RLS
DROP POLICY IF EXISTS "shift_schedules_select_policy" ON shift_schedules;
DROP POLICY IF EXISTS "shift_schedules_insert_policy" ON shift_schedules;
DROP POLICY IF EXISTS "shift_schedules_update_policy" ON shift_schedules;
DROP POLICY IF EXISTS "shift_schedules_delete_policy" ON shift_schedules;

-- Only authenticated users can access shift schedules
CREATE POLICY "Authenticated users can access shift schedules" ON shift_schedules
FOR ALL USING (auth.role() = 'authenticated');

-- 17. Fix custom_shift_enums table RLS
DROP POLICY IF EXISTS "custom_shift_enums_select_policy" ON custom_shift_enums;
DROP POLICY IF EXISTS "custom_shift_enums_insert_policy" ON custom_shift_enums;
DROP POLICY IF EXISTS "custom_shift_enums_update_policy" ON custom_shift_enums;
DROP POLICY IF EXISTS "custom_shift_enums_delete_policy" ON custom_shift_enums;

-- Only authenticated users can access custom shift enums
CREATE POLICY "Authenticated users can access custom shift enums" ON custom_shift_enums
FOR ALL USING (auth.role() = 'authenticated');

-- 18. Fix jira_user_mappings table RLS
DROP POLICY IF EXISTS "Users can view their own user mappings" ON jira_user_mappings;
DROP POLICY IF EXISTS "Users can create user mappings" ON jira_user_mappings;
DROP POLICY IF EXISTS "Users can update their own user mappings" ON jira_user_mappings;
DROP POLICY IF EXISTS "Users can delete their own user mappings" ON jira_user_mappings;

-- Only authenticated users can access JIRA user mappings
CREATE POLICY "Authenticated users can access JIRA user mappings" ON jira_user_mappings
FOR ALL USING (auth.role() = 'authenticated');

-- 19. Fix jira_project_mappings table RLS
DROP POLICY IF EXISTS "Users can view their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can create project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can update their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can delete their own project mappings" ON jira_project_mappings;

-- Only authenticated users can access JIRA project mappings
CREATE POLICY "Authenticated users can access JIRA project mappings" ON jira_project_mappings
FOR ALL USING (auth.role() = 'authenticated');

-- Verify all policies are applied
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
