-- =====================================================
-- TEST ADD CATEGORIES TO TASK
-- =====================================================
-- This script manually adds categories to test the system

-- First, let's see what project categories are available
SELECT 
    id,
    name,
    description,
    color
FROM project_categories
ORDER BY name;

-- Let's also see what category options are available
SELECT 
    co.id,
    co.category_id,
    co.option_name,
    co.option_value,
    pc.name as category_name
FROM category_options co
JOIN project_categories pc ON co.category_id = pc.id
ORDER BY pc.name, co.option_name;

-- Now let's manually add some categories to the task
-- (Replace the UUIDs below with actual category and option IDs from your database)

-- Example: Add a category mapping (uncomment and modify as needed)
/*
INSERT INTO task_category_mappings (
    task_id,
    category_id,
    category_option_id,
    is_primary,
    sort_order
) VALUES (
    'adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID,
    'REPLACE_WITH_ACTUAL_CATEGORY_ID'::UUID,
    'REPLACE_WITH_ACTUAL_OPTION_ID'::UUID,
    false,
    0
);
*/

-- Test the function after adding categories
SELECT 'After adding categories - Testing get_task_categories_with_options_json' as test_name;
SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as result;

-- Check the mappings again
SELECT 
    tcm.id,
    tcm.task_id,
    tcm.category_id,
    tcm.category_option_id,
    tcm.is_primary,
    tcm.sort_order,
    pc.name as category_name,
    co.option_name
FROM task_category_mappings tcm
LEFT JOIN project_categories pc ON tcm.category_id = pc.id
LEFT JOIN category_options co ON tcm.category_option_id = co.id
WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554'
ORDER BY tcm.sort_order;
