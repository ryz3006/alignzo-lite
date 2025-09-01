-- =====================================================
-- TEST FUNCTION RETURNS
-- =====================================================
-- This script tests what the functions actually return

-- Test 1: Direct function call with result
SELECT '=== DIRECT FUNCTION CALL WITH RESULT ===' as test_name;
SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as function_result;

-- Test 2: Simple JSON function call
SELECT '=== SIMPLE JSON FUNCTION CALL ===' as test_name;
SELECT get_task_categories_simple_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as simple_result;

-- Test 3: Table function call
SELECT '=== TABLE FUNCTION CALL ===' as test_name;
SELECT * FROM get_task_categories_with_options('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID);

-- Test 4: Check if the function is returning NULL or empty array
SELECT '=== CHECKING FUNCTION RETURN TYPE ===' as test_name;
SELECT 
    CASE 
        WHEN get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) IS NULL 
        THEN 'NULL'
        WHEN get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) = '[]'::jsonb
        THEN 'Empty Array'
        ELSE 'Has Data'
    END as result_type,
    get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as actual_result;

-- Test 5: Compare with manual query result
SELECT '=== COMPARING WITH MANUAL QUERY ===' as test_name;
WITH manual_result AS (
    SELECT 
        json_agg(
            json_build_object(
                'mapping_id', tcm.id,
                'category_id', tcm.category_id,
                'category_option_id', tcm.category_option_id,
                'is_primary', tcm.is_primary,
                'sort_order', tcm.sort_order,
                'category_name', pc.name,
                'category_description', pc.description,
                'category_color', pc.color,
                'option_name', co.option_name,
                'option_value', co.option_value
            )
        ) as manual_data
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554'
    ORDER BY tcm.sort_order, pc.name
),
function_result AS (
    SELECT get_task_categories_with_options_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as function_data
)
SELECT 
    'Manual Query' as source,
    manual_data as result
FROM manual_result
UNION ALL
SELECT 
    'Function Call' as source,
    function_data as result
FROM function_result;

-- Test 6: Check if there's a difference in the JOIN logic
SELECT '=== CHECKING JOIN LOGIC ===' as test_name;
SELECT 
    'Function uses INNER JOIN with project_categories' as note,
    COUNT(*) as count
FROM task_category_mappings tcm
INNER JOIN project_categories pc ON tcm.category_id = pc.id
LEFT JOIN category_options co ON tcm.category_option_id = co.id
WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

SELECT 
    'Manual query uses INNER JOIN with project_categories' as note,
    COUNT(*) as count
FROM task_category_mappings tcm
INNER JOIN project_categories pc ON tcm.category_id = pc.id
LEFT JOIN category_options co ON tcm.category_option_id = co.id
WHERE tcm.task_id = 'adff50ec-4f55-4e8e-8dfa-83da73cd8554';

-- Test 7: Check if the function is using the correct table structure
SELECT '=== CHECKING FUNCTION TABLE STRUCTURE ===' as test_name;
SELECT 
    tcm.id,
    tcm.task_id,
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
ORDER BY tcm.sort_order, pc.name;
