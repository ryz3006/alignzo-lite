-- Fix RLS Policies for Category Options Access
-- This script will ensure that authenticated users can access the necessary data

-- 1. Enable RLS on tables if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_options ENABLE ROW LEVEL SECURITY;

-- 2. Create or replace policies for projects table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
CREATE POLICY "Enable read access for authenticated users" ON projects
    FOR SELECT TO authenticated
    USING (true);

-- 3. Create or replace policies for project_categories table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON project_categories;
CREATE POLICY "Enable read access for authenticated users" ON project_categories
    FOR SELECT TO authenticated
    USING (is_active = true);

-- 4. Create or replace policies for category_options table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON category_options;
CREATE POLICY "Enable read access for authenticated users" ON category_options
    FOR SELECT TO authenticated
    USING (is_active = true);

-- 5. Grant necessary permissions
GRANT SELECT ON projects TO authenticated;
GRANT SELECT ON project_categories TO authenticated;
GRANT SELECT ON category_options TO authenticated;

-- 6. Test the policies
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
    
    RAISE NOTICE 'Projects accessible after policy fix: %', project_count;
    
    -- Test category access
    SELECT COUNT(*) INTO category_count 
    FROM project_categories 
    WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND is_active = true;
    
    RAISE NOTICE 'Categories accessible after policy fix: %', category_count;
    
    -- Test options access
    SELECT COUNT(*) INTO option_count 
    FROM category_options co
    JOIN project_categories pc ON co.category_id = pc.id
    WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND pc.is_active = true 
    AND co.is_active = true;
    
    RAISE NOTICE 'Options accessible after policy fix: %', option_count;
END $$;
