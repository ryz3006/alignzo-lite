-- Fix RLS Policies for JIRA Project Mapping Table
-- Run this in your Supabase SQL Editor to fix the RLS policy issue

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can create project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can update their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can delete their own project mappings" ON jira_project_mappings;

-- Create new simplified RLS policies
CREATE POLICY "Users can view their own project mappings" ON jira_project_mappings
    FOR SELECT USING (true);

CREATE POLICY "Users can create project mappings" ON jira_project_mappings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own project mappings" ON jira_project_mappings
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own project mappings" ON jira_project_mappings
    FOR DELETE USING (true);
