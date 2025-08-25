-- Sample data insertion for project categories and subcategories
-- This script inserts sample category data to test the kanban board functionality

-- First, let's get the first project from the database
DO $$
DECLARE
    project_id UUID;
    category_id_1 UUID;
    category_id_2 UUID;
    category_id_3 UUID;
    category_id_4 UUID;
BEGIN
    -- Get the first project
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    IF project_id IS NULL THEN
        RAISE NOTICE 'No projects found in the database. Please create a project first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using project ID: %', project_id;
    
    -- Check if categories already exist for this project
    IF EXISTS (SELECT 1 FROM project_categories WHERE project_id = project_id) THEN
        RAISE NOTICE 'Categories already exist for project %. Skipping insertion.', project_id;
        RETURN;
    END IF;
    
    -- Insert sample categories
    INSERT INTO project_categories (project_id, name, description, color, sort_order, is_active)
    VALUES 
        (project_id, 'Frontend Development', 'Frontend related tasks and features', '#3B82F6', 1, true),
        (project_id, 'Backend Development', 'Backend API and server-side tasks', '#10B981', 2, true),
        (project_id, 'Database', 'Database design and optimization tasks', '#F59E0B', 3, true),
        (project_id, 'Testing', 'Quality assurance and testing tasks', '#EF4444', 4, true),
        (project_id, 'Documentation', 'Documentation and technical writing', '#8B5CF6', 5, true),
        (project_id, 'DevOps', 'Deployment and infrastructure tasks', '#06B6D4', 6, true)
    RETURNING id INTO category_id_1;
    
    RAISE NOTICE 'Inserted categories for project %', project_id;
    
    -- Get the inserted category IDs
    SELECT id INTO category_id_1 FROM project_categories WHERE project_id = project_id AND name = 'Frontend Development';
    SELECT id INTO category_id_2 FROM project_categories WHERE project_id = project_id AND name = 'Backend Development';
    SELECT id INTO category_id_3 FROM project_categories WHERE project_id = project_id AND name = 'Database';
    SELECT id INTO category_id_4 FROM project_categories WHERE project_id = project_id AND name = 'Testing';
    
    -- Insert sample subcategories for Frontend Development
    INSERT INTO project_subcategories (category_id, name, description, color, sort_order, is_active)
    VALUES 
        (category_id_1, 'React Components', 'React component development', '#3B82F6', 1, true),
        (category_id_1, 'UI/UX Design', 'User interface and experience design', '#6366F1', 2, true),
        (category_id_1, 'CSS Styling', 'CSS and styling tasks', '#8B5CF6', 3, true),
        (category_id_1, 'JavaScript Logic', 'JavaScript functionality and logic', '#EC4899', 4, true);
    
    -- Insert sample subcategories for Backend Development
    INSERT INTO project_subcategories (category_id, name, description, color, sort_order, is_active)
    VALUES 
        (category_id_2, 'API Development', 'REST API development', '#10B981', 1, true),
        (category_id_2, 'Authentication', 'User authentication and authorization', '#059669', 2, true),
        (category_id_2, 'Data Processing', 'Data processing and business logic', '#047857', 3, true),
        (category_id_2, 'Integration', 'Third-party integrations', '#065F46', 4, true);
    
    -- Insert sample subcategories for Database
    INSERT INTO project_subcategories (category_id, name, description, color, sort_order, is_active)
    VALUES 
        (category_id_3, 'Schema Design', 'Database schema design', '#F59E0B', 1, true),
        (category_id_3, 'Query Optimization', 'SQL query optimization', '#D97706', 2, true),
        (category_id_3, 'Data Migration', 'Data migration and seeding', '#B45309', 3, true),
        (category_id_3, 'Backup & Recovery', 'Database backup and recovery', '#92400E', 4, true);
    
    -- Insert sample subcategories for Testing
    INSERT INTO project_subcategories (category_id, name, description, color, sort_order, is_active)
    VALUES 
        (category_id_4, 'Unit Testing', 'Unit test development', '#EF4444', 1, true),
        (category_id_4, 'Integration Testing', 'Integration test development', '#DC2626', 2, true),
        (category_id_4, 'E2E Testing', 'End-to-end testing', '#B91C1C', 3, true),
        (category_id_4, 'Performance Testing', 'Performance and load testing', '#991B1B', 4, true);
    
    RAISE NOTICE 'Successfully inserted sample categories and subcategories for project %', project_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting sample data: %', SQLERRM;
        RAISE;
END $$;

-- Verify the insertion
SELECT 
    'VERIFICATION' as info,
    p.name as project_name,
    COUNT(pc.id) as category_count,
    COUNT(ps.id) as subcategory_count
FROM projects p
LEFT JOIN project_categories pc ON p.id = pc.project_id
LEFT JOIN project_subcategories ps ON pc.id = ps.category_id
GROUP BY p.id, p.name
ORDER BY p.name;

-- Show the inserted categories
SELECT 
    'CATEGORIES' as info,
    pc.name as category_name,
    pc.description,
    pc.color,
    pc.sort_order,
    COUNT(ps.id) as subcategory_count
FROM project_categories pc
LEFT JOIN project_subcategories ps ON pc.id = ps.category_id
GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order
ORDER BY pc.sort_order;

-- Show the inserted subcategories
SELECT 
    'SUBCATEGORIES' as info,
    pc.name as category_name,
    ps.name as subcategory_name,
    ps.description,
    ps.color,
    ps.sort_order
FROM project_subcategories ps
JOIN project_categories pc ON ps.category_id = pc.id
ORDER BY pc.sort_order, ps.sort_order;
