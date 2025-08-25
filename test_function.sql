-- Test the database function directly
SELECT get_project_categories_with_options('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID);

-- Also test the direct queries to see what data exists
SELECT 
    'Direct categories query' as test_name,
    COUNT(*) as count
FROM project_categories 
WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND is_active = true;

SELECT 
    'Direct options query' as test_name,
    COUNT(*) as count
FROM category_options co
JOIN project_categories pc ON co.category_id = pc.id
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
AND pc.is_active = true 
AND co.is_active = true;
