-- =====================================================
-- TEST CATEGORIES FUNCTION WITH ACTUAL DATA
-- =====================================================

-- Test 1: Direct query to verify data exists
SELECT 
    'Direct query test' as test_name,
    COUNT(*) as categories_count
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND is_active = true;

-- Test 2: Check category options
SELECT 
    'Category options test' as test_name,
    pc.name as category_name,
    COUNT(co.id) as options_count
FROM project_categories pc
LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true
GROUP BY pc.id, pc.name;

-- Test 3: Test the RPC function directly
SELECT 
    'RPC function test' as test_name,
    get_project_categories_with_options('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) as result;

-- Test 4: Manual join to replicate the RPC function logic
SELECT 
    'Manual join test' as test_name,
    json_agg(
        json_build_object(
            'id', pc.id,
            'name', pc.name,
            'description', pc.description,
            'color', pc.color,
            'sort_order', pc.sort_order,
            'options', COALESCE(
                json_agg(
                    json_build_object(
                        'id', co.id,
                        'option_name', co.option_name,
                        'option_value', co.option_value,
                        'sort_order', co.sort_order
                    ) ORDER BY co.sort_order
                ) FILTER (WHERE co.id IS NOT NULL),
                '[]'::json
            )
        ) ORDER BY pc.sort_order
    ) as result
FROM project_categories pc
LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true
GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order;
