-- =====================================================
-- FIX SIMPLE FUNCTION
-- =====================================================
-- This script fixes the get_task_categories_simple_json function

-- Drop and recreate the function with the correct syntax
DROP FUNCTION IF EXISTS get_task_categories_simple_json(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_task_categories_simple_json(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_agg(
        json_build_object(
            'category_id', tcm.category_id,
            'category_option_id', tcm.category_option_id,
            'is_primary', tcm.is_primary,
            'sort_order', tcm.sort_order
        )
        ORDER BY tcm.sort_order
    ) INTO result
    FROM task_category_mappings tcm
    WHERE tcm.task_id = p_task_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Test the fixed function
SELECT '=== TESTING FIXED FUNCTION ===' as test_name;
SELECT get_task_categories_simple_json('adff50ec-4f55-4e8e-8dfa-83da73cd8554'::UUID) as fixed_result;
