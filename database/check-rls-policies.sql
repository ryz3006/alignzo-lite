-- Check RLS Policies and Permissions
-- This will help identify if RLS policies are blocking access to the data

-- 1. Check if RLS is enabled on the tables
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('projects', 'project_categories', 'category_options')
ORDER BY tablename;

-- 2. Check RLS policies on project_categories
SELECT 
    'Project Categories Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'project_categories';

-- 3. Check RLS policies on category_options
SELECT 
    'Category Options Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'category_options';

-- 4. Check RLS policies on projects
SELECT 
    'Projects Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- 5. Check table permissions for authenticated role
SELECT 
    'Table Permissions' as check_type,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated' 
AND table_name IN ('projects', 'project_categories', 'category_options')
ORDER BY table_name, privilege_type;

-- 6. Test direct access as authenticated user (simulate API access)
-- This will help identify if the issue is with RLS policies
DO $$
DECLARE
    project_count INTEGER;
    category_count INTEGER;
    option_count INTEGER;
BEGIN
    -- Test project access
    SELECT COUNT(*) INTO project_count 
    FROM projects 
    WHERE id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    
    RAISE NOTICE 'Projects accessible: %', project_count;
    
    -- Test category access
    SELECT COUNT(*) INTO category_count 
    FROM project_categories 
    WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND is_active = true;
    
    RAISE NOTICE 'Categories accessible: %', category_count;
    
    -- Test options access
    SELECT COUNT(*) INTO option_count 
    FROM category_options co
    JOIN project_categories pc ON co.category_id = pc.id
    WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND pc.is_active = true 
    AND co.is_active = true;
    
    RAISE NOTICE 'Options accessible: %', option_count;
END $$;
