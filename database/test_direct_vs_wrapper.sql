-- =====================================================
-- TEST DIRECT VS WRAPPER FUNCTION CALLS
-- =====================================================
-- This script tests if the functions work when called directly

-- Test 1: Direct function call
SELECT '=== DIRECT FUNCTION CALL TEST ===' as test_name;
SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as direct_result;

-- Test 2: Check if the task actually has categories in the mappings table
SELECT '=== CHECKING TASK CATEGORY MAPPINGS ===' as test_name;
SELECT 
    COUNT(*) as mapping_count,
    COUNT(DISTINCT category_id) as unique_categories
FROM task_category_mappings 
WHERE task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- Test 3: Check if the task exists in kanban_tasks
SELECT '=== CHECKING TASK EXISTS ===' as test_name;
SELECT 
    id,
    title,
    project_id
FROM kanban_tasks 
WHERE id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- Test 4: Check if there are any categories at all in the mappings table
SELECT '=== CHECKING ALL MAPPINGS ===' as test_name;
SELECT 
    COUNT(*) as total_mappings,
    COUNT(DISTINCT task_id) as unique_tasks,
    COUNT(DISTINCT category_id) as unique_categories
FROM task_category_mappings;

-- Test 5: Check if the project_categories table has data
SELECT '=== CHECKING PROJECT CATEGORIES ===' as test_name;
SELECT 
    COUNT(*) as category_count,
    COUNT(DISTINCT id) as unique_categories
FROM project_categories;

-- Test 6: Check if the category_options table has data
SELECT '=== CHECKING CATEGORY OPTIONS ===' as test_name;
SELECT 
    COUNT(*) as option_count,
    COUNT(DISTINCT category_id) as categories_with_options
FROM category_options;

-- Test 7: Manual query to see what should be returned
SELECT '=== MANUAL QUERY TEST ===' as test_name;
WITH task_categories AS (
    SELECT
        tcm.id as mapping_id,
        tcm.category_id,
        tcm.category_option_id,
        tcm.is_primary,
        tcm.sort_order,
        pc.name as category_name,
        pc.description as category_description,
        pc.color as category_color,
        co.option_name,
        co.option_value
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554'
    ORDER BY tcm.sort_order, pc.name
)
SELECT 
    json_agg(
        json_build_object(
            'mapping_id', tc.mapping_id,
            'category_id', tc.category_id,
            'category_option_id', tc.category_option_id,
            'is_primary', tc.is_primary,
            'sort_order', tc.sort_order,
            'category_name', tc.category_name,
            'category_description', tc.category_description,
            'category_color', tc.category_color,
            'option_name', tc.option_name,
            'option_value', tc.option_value
        )
    ) as manual_result
FROM task_categories tc;

-- Test 8: Check if there are any recent category mappings for this task
SELECT '=== RECENT MAPPINGS FOR TASK ===' as test_name;
SELECT 
    tcm.id,
    tcm.task_id,
    tcm.category_id,
    tcm.category_option_id,
    tcm.is_primary,
    tcm.sort_order,
    tcm.created_at,
    tcm.updated_at,
    pc.name as category_name,
    co.option_name
FROM task_category_mappings tcm
LEFT JOIN project_categories pc ON tcm.category_id = pc.id
LEFT JOIN category_options co ON tcm.category_option_id = co.id
WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554'
ORDER BY tcm.created_at DESC;
