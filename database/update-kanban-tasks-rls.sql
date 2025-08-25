-- Update RLS policies for kanban_tasks table to include category_option_id
-- This ensures that INSERT and UPDATE operations work with the new column

-- 1. Check current RLS policies for kanban_tasks
SELECT 
    'Current Policies' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'kanban_tasks'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'kanban_tasks';

-- 3. Update or create INSERT policy to include category_option_id
DO $$
BEGIN
    -- Drop existing INSERT policies if they exist
    DROP POLICY IF EXISTS "Users can create tasks for projects they have access to" ON kanban_tasks;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON kanban_tasks;
    DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON kanban_tasks;
    
    -- Create new INSERT policy that includes category_option_id
    CREATE POLICY "Users can create tasks for projects they have access to" ON kanban_tasks
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 
                FROM team_project_assignments tpa
                JOIN team_members tm ON tpa.team_id = tm.team_id
                JOIN users u ON tm.user_id = u.id
                WHERE tpa.project_id = kanban_tasks.project_id 
                AND u.email = CURRENT_USER
            )
        );
    
    RAISE NOTICE '✅ Created INSERT policy for kanban_tasks';
END $$;

-- 4. Update or create UPDATE policy
DO $$
BEGIN
    -- Drop existing UPDATE policies if they exist
    DROP POLICY IF EXISTS "Users can update tasks for projects they have access to" ON kanban_tasks;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON kanban_tasks;
    
    -- Create new UPDATE policy
    CREATE POLICY "Users can update tasks for projects they have access to" ON kanban_tasks
        FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 
                FROM team_project_assignments tpa
                JOIN team_members tm ON tpa.team_id = tm.team_id
                JOIN users u ON tm.user_id = u.id
                WHERE tpa.project_id = kanban_tasks.project_id 
                AND u.email = CURRENT_USER
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 
                FROM team_project_assignments tpa
                JOIN team_members tm ON tpa.team_id = tm.team_id
                JOIN users u ON tm.user_id = u.id
                WHERE tpa.project_id = kanban_tasks.project_id 
                AND u.email = CURRENT_USER
            )
        );
    
    RAISE NOTICE '✅ Created UPDATE policy for kanban_tasks';
END $$;

-- 5. Update or create SELECT policy
DO $$
BEGIN
    -- Drop existing SELECT policies if they exist
    DROP POLICY IF EXISTS "Users can view tasks for projects they have access to" ON kanban_tasks;
    DROP POLICY IF EXISTS "Enable select for authenticated users" ON kanban_tasks;
    
    -- Create new SELECT policy
    CREATE POLICY "Users can view tasks for projects they have access to" ON kanban_tasks
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 
                FROM team_project_assignments tpa
                JOIN team_members tm ON tpa.team_id = tm.team_id
                JOIN users u ON tm.user_id = u.id
                WHERE tpa.project_id = kanban_tasks.project_id 
                AND u.email = CURRENT_USER
            )
        );
    
    RAISE NOTICE '✅ Created SELECT policy for kanban_tasks';
END $$;

-- 6. Verify the policies were created
SELECT 
    'Updated Policies' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'kanban_tasks'
ORDER BY cmd, policyname;

-- 7. Test the policies work with category_option_id
DO $$
DECLARE
    test_category_id UUID;
    test_option_id UUID;
    test_column_id UUID;
BEGIN
    -- Get test data
    SELECT pc.id INTO test_category_id 
    FROM project_categories pc 
    WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND pc.is_active = true 
    LIMIT 1;
    
    SELECT co.id INTO test_option_id 
    FROM category_options co 
    WHERE co.category_id = test_category_id 
    AND co.is_active = true 
    LIMIT 1;
    
    SELECT kc.id INTO test_column_id 
    FROM kanban_columns kc 
    WHERE kc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND kc.is_active = true 
    LIMIT 1;
    
    IF test_category_id IS NOT NULL AND test_option_id IS NOT NULL AND test_column_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test data available: category=%, option=%, column=%', 
            test_category_id, test_option_id, test_column_id;
        RAISE NOTICE '✅ Policies should now support category_option_id operations';
    ELSE
        RAISE NOTICE '⚠️ Some test data missing - policies may need manual verification';
    END IF;
END $$;
