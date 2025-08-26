-- Fix Kanban Board Issues
-- Run this in your Supabase SQL Editor to fix the column errors

-- =====================================================
-- FIX 1: Add missing avatar_url column to users table
-- =====================================================

-- Add avatar_url column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- =====================================================
-- FIX 2: Fix jira_project_mappings table structure
-- =====================================================

-- Check if project_id column exists and rename if needed
DO $$ 
BEGIN
    -- If project_id column exists, rename it to dashboard_project_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jira_project_mappings' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE jira_project_mappings RENAME COLUMN project_id TO dashboard_project_id;
    END IF;
    
    -- If dashboard_project_id doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jira_project_mappings' AND column_name = 'dashboard_project_id'
    ) THEN
        ALTER TABLE jira_project_mappings ADD COLUMN dashboard_project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- FIX 3: Ensure proper indexes exist
-- =====================================================

-- Add missing indexes for jira_project_mappings
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_dashboard_project 
ON jira_project_mappings(dashboard_project_id);

CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_integration_user 
ON jira_project_mappings(integration_user_email);

CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_jira_project 
ON jira_project_mappings(jira_project_key);

-- Add unique constraint if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_jira_project_mappings_unique 
ON jira_project_mappings(dashboard_project_id, jira_project_key, integration_user_email);

-- =====================================================
-- FIX 4: Update RLS policies for jira_project_mappings
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can create project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can update their own project mappings" ON jira_project_mappings;
DROP POLICY IF EXISTS "Users can delete their own project mappings" ON jira_project_mappings;

-- Create new policies
CREATE POLICY "Users can view their own project mappings" ON jira_project_mappings
    FOR SELECT USING (true);

CREATE POLICY "Users can create project mappings" ON jira_project_mappings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own project mappings" ON jira_project_mappings
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own project mappings" ON jira_project_mappings
    FOR DELETE USING (true);

-- =====================================================
-- FIX 5: Ensure task_timeline table has proper structure
-- =====================================================

-- Add missing columns to task_timeline if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_timeline' AND column_name = 'details'
    ) THEN
        ALTER TABLE task_timeline ADD COLUMN details JSONB;
    END IF;
END $$;

-- =====================================================
-- FIX 6: Add missing indexes for task_timeline
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_user_email ON task_timeline(user_email);
CREATE INDEX IF NOT EXISTS idx_task_timeline_action ON task_timeline(action);
CREATE INDEX IF NOT EXISTS idx_task_timeline_created_at ON task_timeline(created_at);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the fixes
SELECT 'Users table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'JIRA project mappings table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jira_project_mappings' 
ORDER BY ordinal_position;

SELECT 'Task timeline table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'task_timeline' 
ORDER BY ordinal_position;
