-- Test the database function and related queries
-- This will help us understand what's happening with the data

-- 1. Check if the function exists
SELECT 
    'Function exists check' as test_name,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_project_categories_with_options';

-- 2. Test direct categories query
SELECT 
    'Direct categories query' as test_name,
    COUNT(*) as count,
    array_agg(name) as category_names
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND is_active = true;

-- 3. Test direct options query
SELECT 
    'Direct options query' as test_name,
    COUNT(*) as count,
    array_agg(option_name) as option_names
FROM category_options co
JOIN project_categories pc ON co.category_id = pc.id
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true 
AND co.is_active = true;

-- 4. Test the function with error handling
DO $$
DECLARE
    result JSON;
    error_msg TEXT;
BEGIN
    BEGIN
        SELECT get_project_categories_with_options('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) INTO result;
        RAISE NOTICE 'Function result: %', result;
    EXCEPTION WHEN OTHERS THEN
        error_msg := SQLERRM;
        RAISE NOTICE 'Function error: %', error_msg;
    END;
END $$;

-- 5. Test manual join to replicate function logic
WITH category_data AS (
    SELECT 
        pc.id,
        pc.name,
        pc.description,
        pc.color,
        pc.sort_order,
        pc.created_at,
        pc.updated_at,
        json_agg(
            CASE WHEN co.id IS NOT NULL THEN
                json_build_object(
                    'id', co.id,
                    'option_name', co.option_name,
                    'option_value', co.option_value,
                    'sort_order', co.sort_order
                )
            END
        ) FILTER (WHERE co.id IS NOT NULL) as options
    FROM project_categories pc
    LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
    WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' AND pc.is_active = true
    GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order, pc.created_at, pc.updated_at
)
SELECT 
    'Manual join test' as test_name,
    COUNT(*) as categories_count,
    json_agg(
        json_build_object(
            'id', cd.id,
            'name', cd.name,
            'description', cd.description,
            'color', cd.color,
            'sort_order', cd.sort_order,
            'created_at', cd.created_at,
            'updated_at', cd.updated_at,
            'options', COALESCE(cd.options, '[]'::json)
        ) ORDER BY cd.sort_order
    ) as result
FROM category_data cd;
