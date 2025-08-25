-- Comprehensive debug script to understand the data structure
-- This will help us identify why the API is not finding categories

-- 1. Check all projects
SELECT 
    'All projects' as test_name,
    COUNT(*) as count,
    array_agg(name) as project_names
FROM projects;

-- 2. Check the specific project
SELECT 
    'Specific project' as test_name,
    id,
    name,
    product,
    country,
    created_at,
    updated_at
FROM projects 
WHERE id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

-- 3. Check all project categories
SELECT 
    'All project categories' as test_name,
    COUNT(*) as count,
    array_agg(name) as category_names
FROM project_categories;

-- 4. Check categories for the specific project
SELECT 
    'Categories for project' as test_name,
    id,
    name,
    description,
    project_id,
    is_active,
    created_at,
    updated_at
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

-- 5. Check all category options
SELECT 
    'All category options' as test_name,
    COUNT(*) as count,
    array_agg(option_name) as option_names
FROM category_options;

-- 6. Check options for the specific category
SELECT 
    'Options for category' as test_name,
    id,
    option_name,
    option_value,
    category_id,
    is_active,
    sort_order,
    created_at,
    updated_at
FROM category_options 
WHERE category_id = '36d8b73d-7646-4a18-aa37-959153217b51';

-- 7. Check the join between project, categories, and options
SELECT 
    'Full join test' as test_name,
    p.name as project_name,
    pc.name as category_name,
    co.option_name,
    co.option_value,
    pc.is_active as category_active,
    co.is_active as option_active
FROM projects p
JOIN project_categories pc ON p.id = pc.project_id
JOIN category_options co ON pc.id = co.category_id
WHERE p.id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0'
ORDER BY pc.sort_order, co.sort_order;

-- 8. Check if there are any inactive categories or options
SELECT 
    'Inactive items check' as test_name,
    'Inactive categories' as item_type,
    COUNT(*) as count
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND is_active = false

UNION ALL

SELECT 
    'Inactive items check' as test_name,
    'Inactive options' as item_type,
    COUNT(*) as count
FROM category_options co
JOIN project_categories pc ON co.category_id = pc.id
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND co.is_active = false;
