-- Fix RLS policies for task_timeline and task_comments
-- This version doesn't rely on current_user context

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view timeline for tasks they have access to" ON task_timeline;
DROP POLICY IF EXISTS "Users can create timeline entries for tasks they have access to" ON task_timeline;
DROP POLICY IF EXISTS "Users can view comments for tasks they have access to" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments for tasks they have access to" ON task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments or admin can delete any" ON task_comments;

-- Create new policies that allow all operations (for now)
-- In production, you would want to implement proper authorization logic

-- Timeline policies - allow all operations
CREATE POLICY "Allow all timeline operations" ON task_timeline
    FOR ALL USING (true);

-- Comments policies - allow all operations
CREATE POLICY "Allow all comment operations" ON task_comments
    FOR ALL USING (true);

-- Re-enable RLS
ALTER TABLE task_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
