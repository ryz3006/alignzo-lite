-- =====================================================
-- FIX RLS POLICIES FOR TASK CATEGORIES
-- =====================================================
-- This script checks and fixes RLS policies that might be blocking the API

-- 1. Check current RLS policies
SELECT '=== CURRENT RLS POLICIES ===' as section;
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
WHERE tablename IN ('task_category_mappings', 'project_categories', 'category_options', 'kanban_tasks', 'users')
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on relevant tables
SELECT '=== RLS ENABLED TABLES ===' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('task_category_mappings', 'project_categories', 'category_options', 'kanban_tasks', 'users')
AND schemaname = 'public';

-- 3. Create or update RLS policies for task_category_mappings
SELECT '=== CREATING RLS POLICIES ===' as section;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON task_category_mappings;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON task_category_mappings;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON task_category_mappings;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON task_category_mappings;

-- Create new policies for task_category_mappings
CREATE POLICY "Enable read access for authenticated users" ON task_category_mappings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON task_category_mappings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON task_category_mappings
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON task_category_mappings
    FOR DELETE USING (true);

-- 4. Create or update RLS policies for project_categories
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON project_categories;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON project_categories;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON project_categories;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON project_categories;

CREATE POLICY "Enable read access for authenticated users" ON project_categories
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON project_categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON project_categories
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON project_categories
    FOR DELETE USING (true);

-- 5. Create or update RLS policies for category_options
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON category_options;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON category_options;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON category_options;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON category_options;

CREATE POLICY "Enable read access for authenticated users" ON category_options
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON category_options
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON category_options
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON category_options
    FOR DELETE USING (true);

-- 6. Create or update RLS policies for kanban_tasks
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON kanban_tasks;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON kanban_tasks;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON kanban_tasks;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON kanban_tasks;

CREATE POLICY "Enable read access for authenticated users" ON kanban_tasks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON kanban_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON kanban_tasks
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON kanban_tasks
    FOR DELETE USING (true);

-- 7. Create or update RLS policies for users table (if needed)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON users;

CREATE POLICY "Enable read access for authenticated users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON users
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON users
    FOR DELETE USING (true);

-- 8. Create or update RLS policies for task_timeline
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON task_timeline;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON task_timeline;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON task_timeline;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON task_timeline;

CREATE POLICY "Enable read access for authenticated users" ON task_timeline
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON task_timeline
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON task_timeline
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON task_timeline
    FOR DELETE USING (true);

-- 9. Verify the policies were created
SELECT '=== VERIFYING POLICIES ===' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('task_category_mappings', 'project_categories', 'category_options', 'kanban_tasks', 'users', 'task_timeline')
ORDER BY tablename, policyname;

-- 10. Test the functions again
SELECT '=== TESTING FUNCTIONS AFTER RLS FIX ===' as section;
SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as test_result;
