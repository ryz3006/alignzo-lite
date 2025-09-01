-- =====================================================
-- COMPREHENSIVE DEBUG TASK CATEGORIES
-- =====================================================
-- This script checks all possible ways categories might be stored

-- 1. Check if the task exists
SELECT '=== TASK INFO ===' as section;
SELECT 
    id,
    title,
    project_id,
    created_at
FROM kanban_tasks 
WHERE id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- 2. Check ALL tables that might contain category information
SELECT '=== CHECKING ALL CATEGORY-RELATED TABLES ===' as section;

-- Check task_category_mappings table
SELECT 'task_category_mappings' as table_name, COUNT(*) as count FROM task_category_mappings;
SELECT 'task_category_mappings for this task' as info, COUNT(*) as count 
FROM task_category_mappings 
WHERE task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- Check if there are other tables with category info
SELECT '=== ALL TABLES WITH CATEGORY IN NAME ===' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%category%'
ORDER BY table_name;

-- Check if there are other tables with task in name
SELECT '=== ALL TABLES WITH TASK IN NAME ===' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%task%'
ORDER BY table_name;

-- 3. Check if categories are stored directly in kanban_tasks table
SELECT '=== CHECKING KANBAN_TASKS TABLE STRUCTURE ===' as section;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'kanban_tasks'
AND column_name ILIKE '%category%';

-- 4. Check if there are any foreign key relationships
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as section;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name ILIKE '%task%' OR tc.table_name ILIKE '%category%')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check if the functions exist and their exact signatures
SELECT '=== FUNCTION SIGNATURES ===' as section;
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.oid as function_oid
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

-- 6. Test the functions with detailed error handling
SELECT '=== TESTING FUNCTIONS ===' as section;

-- Test get_task_categories_with_options_json
DO $$
BEGIN
    RAISE NOTICE 'Testing get_task_categories_with_options_json...';
    PERFORM get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID);
    RAISE NOTICE 'Function executed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_task_categories_with_options_json: %', SQLERRM;
END $$;

-- Test get_task_categories_simple_json
DO $$
BEGIN
    RAISE NOTICE 'Testing get_task_categories_simple_json...';
    PERFORM get_task_categories_simple_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID);
    RAISE NOTICE 'Function executed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_task_categories_simple_json: %', SQLERRM;
END $$;

-- 7. Check what's actually in task_category_mappings for this task
SELECT '=== DETAILED TASK CATEGORY MAPPINGS ===' as section;
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
ORDER BY tcm.sort_order;

-- 8. Check if there are any project categories at all
SELECT '=== PROJECT CATEGORIES ===' as section;
SELECT 
    id,
    name,
    description,
    color,
    created_at
FROM project_categories
ORDER BY name;

-- 9. Check if there are any category options
SELECT '=== CATEGORY OPTIONS ===' as section;
SELECT 
    id,
    category_id,
    option_name,
    option_value,
    created_at
FROM category_options
ORDER BY category_id, option_name;

-- 10. Manual test of the function logic
SELECT '=== MANUAL FUNCTION LOGIC TEST ===' as section;
WITH category_data AS (
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
            'mapping_id', cd.mapping_id,
            'category_id', cd.category_id,
            'category_option_id', cd.category_option_id,
            'is_primary', cd.is_primary,
            'sort_order', cd.sort_order,
            'category_name', cd.category_name,
            'category_description', cd.category_description,
            'category_color', cd.category_color,
            'option_name', cd.option_name,
            'option_value', cd.option_value
        )
    ) as manual_result
FROM category_data cd;
