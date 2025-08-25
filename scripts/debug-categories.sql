-- Debug script to check category data in the database
-- Run this in your Supabase SQL Editor to see what's in your tables

-- Check all projects
SELECT 'PROJECTS' as table_name, count(*) as count FROM projects;

-- Check all categories
SELECT 'PROJECT_CATEGORIES' as table_name, count(*) as count FROM project_categories;

-- Check all subcategories
SELECT 'PROJECT_SUBCATEGORIES' as table_name, count(*) as count FROM project_subcategories;

-- Check if category_options table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_options') THEN
        RAISE NOTICE 'category_options table exists';
        PERFORM 'SELECT count(*) FROM category_options'::text;
    ELSE
        RAISE NOTICE 'category_options table does not exist';
    END IF;
END $$;

-- Show all projects with their details
SELECT 
    'PROJECTS DETAIL' as info,
    id,
    name,
    product,
    country,
    created_at
FROM projects
ORDER BY name;

-- Show all categories with their project details
SELECT 
    'CATEGORIES DETAIL' as info,
    pc.id as category_id,
    pc.name as category_name,
    pc.project_id,
    p.name as project_name,
    pc.description,
    pc.color,
    pc.sort_order,
    pc.is_active,
    pc.created_at
FROM project_categories pc
LEFT JOIN projects p ON pc.project_id = p.id
ORDER BY p.name, pc.sort_order;

-- Show all subcategories with their category and project details
SELECT 
    'SUBCATEGORIES DETAIL' as info,
    ps.id as subcategory_id,
    ps.name as subcategory_name,
    ps.category_id,
    pc.name as category_name,
    pc.project_id,
    p.name as project_name,
    ps.description,
    ps.color,
    ps.sort_order,
    ps.is_active,
    ps.created_at
FROM project_subcategories ps
LEFT JOIN project_categories pc ON ps.category_id = pc.id
LEFT JOIN projects p ON pc.project_id = p.id
ORDER BY p.name, pc.name, ps.sort_order;

-- Check for the specific project mentioned in the error
SELECT 
    'SPECIFIC PROJECT CHECK' as info,
    p.id,
    p.name,
    p.product,
    p.country,
    COUNT(pc.id) as category_count,
    COUNT(ps.id) as subcategory_count
FROM projects p
LEFT JOIN project_categories pc ON p.id = pc.project_id
LEFT JOIN project_subcategories ps ON pc.id = ps.category_id
WHERE p.id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0'
GROUP BY p.id, p.name, p.product, p.country;

-- Show categories for the specific project
SELECT 
    'CATEGORIES FOR VIL CMP' as info,
    pc.id,
    pc.name,
    pc.description,
    pc.color,
    pc.sort_order,
    pc.is_active,
    pc.created_at
FROM project_categories pc
WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0'
ORDER BY pc.sort_order;

-- Check table structure for project_categories
SELECT 
    'PROJECT_CATEGORIES STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_categories'
ORDER BY ordinal_position;

-- Check if there are any RLS policies that might be blocking access
SELECT 
    'RLS POLICIES' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('project_categories', 'project_subcategories', 'projects')
ORDER BY tablename, policyname;
