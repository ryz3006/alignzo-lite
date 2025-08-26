-- Temporarily disable RLS on task_timeline table for testing
-- WARNING: This should only be used for testing and debugging

-- Disable RLS on task_timeline table
ALTER TABLE task_timeline DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on task_comments table for consistency
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, run:
-- ALTER TABLE task_timeline ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
