-- =====================================================
-- DEBUG TASK CATEGORIES
-- =====================================================
-- This script helps debug why categories are empty

-- Check if the task exists
SELECT 
    id,
    title,
    project_id,
    created_at
FROM kanban_tasks 
WHERE id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- Check if the task_category_mappings table exists and has data
SELECT 
    COUNT(*) as total_mappings,
    COUNT(DISTINCT task_id) as unique_tasks,
    COUNT(DISTINCT category_id) as unique_categories
FROM task_category_mappings;

-- Check if this specific task has any category mappings
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

-- Check if the functions exist and their signatures
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN (
    'get_task_categories_with_options_json', 
    'get_task_categories_with_options', 
    'get_task_categories_simple_json', 
    'update_task_categories'
)
ORDER BY p.proname, arguments;

-- Test the functions directly
SELECT 'Testing get_task_categories_with_options_json' as test_name;
SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as result;

SELECT 'Testing get_task_categories_simple_json' as test_name;
SELECT get_task_categories_simple_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as result;

-- Check if there are any project categories available
SELECT 
    id,
    name,
    description,
    color
FROM project_categories
LIMIT 10;

-- Check if there are any category options available
SELECT 
    id,
    category_id,
    option_name,
    option_value
FROM category_options
LIMIT 10;
