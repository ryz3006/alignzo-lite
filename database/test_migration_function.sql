-- =====================================================
-- TEST MIGRATION FUNCTION
-- =====================================================
-- This script tests the migrate_category_options function
-- to ensure it works with both schema variants

-- Test 1: Check if options column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'project_categories' 
            AND column_name = 'options'
        ) THEN 'Main schema detected (has options column)'
        ELSE 'Kanban schema detected (no options column)'
    END as schema_type;

-- Test 2: Check current project_categories structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_categories'
ORDER BY ordinal_position;

-- Test 3: Check if there are any categories with options in description
SELECT 
    id,
    name,
    description,
    CASE 
        WHEN description LIKE '%options:%' THEN 'Has options in description'
        ELSE 'No options in description'
    END as options_status
FROM project_categories 
WHERE description IS NOT NULL AND description != ''
LIMIT 5;

-- Test 4: Run the migration function (commented out for safety)
-- SELECT migrate_category_options();

-- Test 5: Check if new tables exist (after running migration)
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('category_options', 'subcategory_options', 'work_log_category_selections', 'timer_category_selections') 
        THEN 'Migration table'
        ELSE 'Existing table'
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('category_options', 'subcategory_options', 'work_log_category_selections', 'timer_category_selections')
ORDER BY table_name;
