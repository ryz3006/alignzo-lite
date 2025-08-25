-- Sample data insertion for project categories and subcategories
-- This script inserts sample category data to test the kanban board functionality

-- First, let's get the first project from the database
DO $$
DECLARE
    project_id UUID;
    category_id_1 UUID;
    category_id_2 UUID;
    category_id_3 UUID;
BEGIN
    -- Get the first project
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    IF project_id IS NULL THEN
        RAISE NOTICE 'No projects found in the database. Please create a project first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using project ID: %', project_id;
    
    -- Insert sample categories
    INSERT INTO project_categories (project_id, name, description, color, sort_order)
    VALUES 
        (project_id, 'Frontend', 'Frontend development tasks', '#3B82F6', 1),
        (project_id, 'Backend', 'Backend development tasks', '#10B981', 2),
        (project_id, 'Testing', 'Testing and QA tasks', '#F59E0B', 3)
    ON CONFLICT (project_id, name) DO NOTHING
    RETURNING id INTO category_id_1;
    
    -- Get the category IDs
    SELECT id INTO category_id_1 FROM project_categories WHERE project_id = project_id AND name = 'Frontend';
    SELECT id INTO category_id_2 FROM project_categories WHERE project_id = project_id AND name = 'Backend';
    SELECT id INTO category_id_3 FROM project_categories WHERE project_id = project_id AND name = 'Testing';
    
    -- Insert sample subcategories
    INSERT INTO project_subcategories (category_id, name, description, color, sort_order)
    VALUES 
        (category_id_1, 'React Components', 'React component development', '#6B7280', 1),
        (category_id_1, 'CSS Styling', 'CSS and styling tasks', '#8B5CF6', 2),
        (category_id_2, 'API Development', 'API and backend services', '#EC4899', 1),
        (category_id_2, 'Database', 'Database related tasks', '#06B6D4', 2),
        (category_id_3, 'Unit Testing', 'Unit test development', '#84CC16', 1),
        (category_id_3, 'Integration Testing', 'Integration test development', '#F97316', 2)
    ON CONFLICT (category_id, name) DO NOTHING;
    
    RAISE NOTICE 'Sample categories and subcategories inserted successfully!';
    RAISE NOTICE 'Category IDs: %, %, %', category_id_1, category_id_2, category_id_3;
END $$;

-- Verify the data was inserted
SELECT 
    'Categories' as table_name, 
    count(*) as count 
FROM project_categories
UNION ALL
SELECT 'Subcategories', count(*) FROM project_subcategories;

-- Show the inserted data
SELECT 
    pc.name as category_name,
    pc.description as category_description,
    pc.color as category_color,
    ps.name as subcategory_name,
    ps.description as subcategory_description,
    ps.color as subcategory_color
FROM project_categories pc
LEFT JOIN project_subcategories ps ON pc.id = ps.category_id
ORDER BY pc.sort_order, ps.sort_order;
