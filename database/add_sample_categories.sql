-- =====================================================
-- ADD SAMPLE CATEGORIES AND OPTIONS FOR TESTING
-- =====================================================

-- First, let's get a project ID to work with
DO $$
DECLARE
    project_id UUID;
BEGIN
    -- Get the first project or create one if none exists
    SELECT id INTO project_id FROM projects LIMIT 1;
    
    IF project_id IS NULL THEN
        -- Create a sample project if none exists
        INSERT INTO projects (name, product, country) 
        VALUES ('Sample Project', 'Web Application', 'USA')
        RETURNING id INTO project_id;
    END IF;
    
    -- Add sample categories
    INSERT INTO project_categories (project_id, name, description, color, sort_order, is_active)
    VALUES 
        (project_id, 'Priority', 'Task priority levels', '#EF4444', 1, true),
        (project_id, 'Type', 'Type of work', '#3B82F6', 2, true),
        (project_id, 'Status', 'Current status', '#10B981', 3, true),
        (project_id, 'Department', 'Department responsible', '#F59E0B', 4, true)
    ON CONFLICT (project_id, name) DO NOTHING;
    
    -- Get the category IDs
    DECLARE
        priority_cat_id UUID;
        type_cat_id UUID;
        status_cat_id UUID;
        dept_cat_id UUID;
    BEGIN
        SELECT id INTO priority_cat_id FROM project_categories WHERE project_id = project_id AND name = 'Priority';
        SELECT id INTO type_cat_id FROM project_categories WHERE project_id = project_id AND name = 'Type';
        SELECT id INTO status_cat_id FROM project_categories WHERE project_id = project_id AND name = 'Status';
        SELECT id INTO dept_cat_id FROM project_categories WHERE project_id = project_id AND name = 'Department';
        
        -- Add options for Priority category
        INSERT INTO category_options (category_id, option_name, option_value, sort_order, is_active)
        VALUES 
            (priority_cat_id, 'Low', 'low', 1, true),
            (priority_cat_id, 'Medium', 'medium', 2, true),
            (priority_cat_id, 'High', 'high', 3, true),
            (priority_cat_id, 'Urgent', 'urgent', 4, true)
        ON CONFLICT (category_id, option_value) DO NOTHING;
        
        -- Add options for Type category
        INSERT INTO category_options (category_id, option_name, option_value, sort_order, is_active)
        VALUES 
            (type_cat_id, 'Bug Fix', 'bug_fix', 1, true),
            (type_cat_id, 'Feature', 'feature', 2, true),
            (type_cat_id, 'Improvement', 'improvement', 3, true),
            (type_cat_id, 'Documentation', 'documentation', 4, true)
        ON CONFLICT (category_id, option_value) DO NOTHING;
        
        -- Add options for Status category
        INSERT INTO category_options (category_id, option_name, option_value, sort_order, is_active)
        VALUES 
            (status_cat_id, 'Not Started', 'not_started', 1, true),
            (status_cat_id, 'In Progress', 'in_progress', 2, true),
            (status_cat_id, 'Review', 'review', 3, true),
            (status_cat_id, 'Completed', 'completed', 4, true)
        ON CONFLICT (category_id, option_value) DO NOTHING;
        
        -- Add options for Department category
        INSERT INTO category_options (category_id, option_name, option_value, sort_order, is_active)
        VALUES 
            (dept_cat_id, 'Frontend', 'frontend', 1, true),
            (dept_cat_id, 'Backend', 'backend', 2, true),
            (dept_cat_id, 'Design', 'design', 3, true),
            (dept_cat_id, 'QA', 'qa', 4, true)
        ON CONFLICT (category_id, option_value) DO NOTHING;
        
        RAISE NOTICE 'Sample categories and options added for project: %', project_id;
    END;
END $$;
