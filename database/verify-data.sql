-- Verify Data Existence Script
-- Run this in your Supabase SQL Editor to check if data exists

-- 1. Check if the project exists
SELECT 
    'Project Check' as test_name,
    id,
    name,
    product,
    country
FROM projects 
WHERE id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';

-- 2. Check project categories
SELECT 
    'Project Categories' as test_name,
    COUNT(*) as count,
    array_agg(name) as category_names
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND is_active = true;

-- 3. Check category options
SELECT 
    'Category Options' as test_name,
    COUNT(*) as count,
    array_agg(option_name) as option_names
FROM category_options co
JOIN project_categories pc ON co.category_id = pc.id
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true 
AND co.is_active = true;

-- 4. Check the join result
SELECT 
    'Join Result' as test_name,
    pc.name as category_name,
    COUNT(co.id) as options_count,
    array_agg(co.option_name) as option_names
FROM project_categories pc
LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true
GROUP BY pc.id, pc.name
ORDER BY pc.sort_order;

-- 5. Test the function (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_project_categories_with_options'
    ) THEN
        RAISE NOTICE 'Function exists - testing it...';
        -- The function exists, but we can't call it directly in this context
        -- You can test it separately
    ELSE
        RAISE NOTICE 'Function does not exist - needs to be deployed';
    END IF;
END $$;
