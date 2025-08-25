-- Fix API Access for Category Options
-- This script creates a service role function that bypasses RLS for API access

-- 1. Create a service role function to get categories with options
CREATE OR REPLACE FUNCTION get_project_categories_with_options_api(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- This function runs with SECURITY DEFINER, so it bypasses RLS
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
        WHERE pc.project_id = project_uuid AND pc.is_active = true
        GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order, pc.created_at, pc.updated_at
    )
    SELECT json_agg(
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
    )
    FROM category_data cd
    INTO result;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_categories_with_options_api(UUID) TO authenticated;

-- 3. Create a simpler function for direct table access (fallback)
CREATE OR REPLACE FUNCTION get_project_categories_direct(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Get categories with their options using direct queries
    WITH categories AS (
        SELECT 
            pc.id,
            pc.name,
            pc.description,
            pc.color,
            pc.sort_order,
            pc.created_at,
            pc.updated_at
        FROM project_categories pc
        WHERE pc.project_id = project_uuid AND pc.is_active = true
        ORDER BY pc.sort_order
    ),
    options AS (
        SELECT 
            co.category_id,
            json_agg(
                json_build_object(
                    'id', co.id,
                    'option_name', co.option_name,
                    'option_value', co.option_value,
                    'sort_order', co.sort_order
                ) ORDER BY co.sort_order
            ) as options
        FROM category_options co
        JOIN project_categories pc ON co.category_id = pc.id
        WHERE pc.project_id = project_uuid 
        AND pc.is_active = true 
        AND co.is_active = true
        GROUP BY co.category_id
    )
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'description', c.description,
            'color', c.color,
            'sort_order', c.sort_order,
            'created_at', c.created_at,
            'updated_at', c.updated_at,
            'options', COALESCE(o.options, '[]'::json)
        ) ORDER BY c.sort_order
    )
    FROM categories c
    LEFT JOIN options o ON c.id = o.category_id
    INTO result;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_categories_direct(UUID) TO authenticated;

-- 5. Test the functions
DO $$
DECLARE
    result1 JSON;
    result2 JSON;
BEGIN
    -- Test the API function
    SELECT get_project_categories_with_options_api('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) INTO result1;
    RAISE NOTICE 'API function result: %', result1;
    
    -- Test the direct function
    SELECT get_project_categories_direct('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID) INTO result2;
    RAISE NOTICE 'Direct function result: %', result2;
END $$;
