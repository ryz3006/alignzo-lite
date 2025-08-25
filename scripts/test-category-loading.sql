-- Test script to verify category loading and add sample data
-- Run this in your Supabase SQL Editor

-- First, let's check if we have any projects
SELECT 'PROJECTS' as table_name, count(*) as count FROM projects;

-- Check if we have any categories
SELECT 'PROJECT_CATEGORIES' as table_name, count(*) as count FROM project_categories;

-- Check if we have any subcategories
SELECT 'PROJECT_SUBCATEGORIES' as table_name, count(*) as count FROM project_subcategories;

-- If no categories exist, let's add some sample data
-- First, get a project ID to work with
DO $$
DECLARE
    project_id UUID;
    category_id UUID;
BEGIN
    -- Get the first project
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    IF project_id IS NOT NULL THEN
        RAISE NOTICE 'Using project ID: %', project_id;
        
        -- Add sample categories if none exist
        IF NOT EXISTS (SELECT 1 FROM project_categories WHERE project_id = project_id) THEN
            -- Insert sample categories
            INSERT INTO project_categories (project_id, name, description, color, sort_order, is_active)
            VALUES 
                (project_id, 'Development', 'Software development tasks', '#3B82F6', 1, true),
                (project_id, 'Design', 'UI/UX design tasks', '#10B981', 2, true),
                (project_id, 'Testing', 'Quality assurance tasks', '#F59E0B', 3, true),
                (project_id, 'Documentation', 'Documentation tasks', '#8B5CF6', 4, true);
            
            RAISE NOTICE 'Added sample categories for project %', project_id;
        ELSE
            RAISE NOTICE 'Categories already exist for project %', project_id;
        END IF;
        
        -- Get the first category to add subcategories
        SELECT id INTO category_id FROM project_categories WHERE project_id = project_id LIMIT 1;
        
        IF category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_subcategories WHERE category_id = category_id) THEN
            -- Insert sample subcategories
            INSERT INTO project_subcategories (category_id, name, description, color, sort_order, is_active)
            VALUES 
                (category_id, 'Frontend', 'Frontend development tasks', '#6B7280', 1, true),
                (category_id, 'Backend', 'Backend development tasks', '#6B7280', 2, true),
                (category_id, 'Database', 'Database related tasks', '#6B7280', 3, true);
            
            RAISE NOTICE 'Added sample subcategories for category %', category_id;
        ELSE
            RAISE NOTICE 'Subcategories already exist or no category found';
        END IF;
        
    ELSE
        RAISE NOTICE 'No projects found in the database';
    END IF;
END $$;

-- Now let's verify the data was added
SELECT 
    'CATEGORIES AFTER INSERT' as info,
    pc.id as category_id,
    pc.name as category_name,
    pc.project_id,
    p.name as project_name,
    pc.description,
    pc.color,
    pc.sort_order,
    pc.is_active
FROM project_categories pc
LEFT JOIN projects p ON pc.project_id = p.id
ORDER BY p.name, pc.sort_order;

SELECT 
    'SUBCATEGORIES AFTER INSERT' as info,
    ps.id as subcategory_id,
    ps.name as subcategory_name,
    ps.category_id,
    pc.name as category_name,
    pc.project_id,
    p.name as project_name,
    ps.description,
    ps.color,
    ps.sort_order,
    ps.is_active
FROM project_subcategories ps
LEFT JOIN project_categories pc ON ps.category_id = pc.id
LEFT JOIN projects p ON pc.project_id = p.id
ORDER BY p.name, pc.name, ps.sort_order;

-- Test the RLS policies
SELECT 
    'RLS POLICIES FOR CATEGORIES' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('project_categories', 'project_subcategories')
ORDER BY tablename, policyname;
