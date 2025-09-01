-- =====================================================
-- CLEANUP TASK CATEGORIES FUNCTIONS
-- =====================================================
-- Run this script to remove all conflicting task category functions
-- This will resolve the "Could not choose the best candidate function" error

-- Drop all variations of the task category functions
DROP FUNCTION IF EXISTS get_task_categories_with_options_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_with_options(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_simple_json(UUID) CASCADE;

-- Drop all variations of update_task_categories function
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT, VARCHAR) CASCADE;

-- Dynamic cleanup to catch any remaining functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find and drop all functions with these names
    FOR func_record IN 
        SELECT 
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'get_task_categories_with_options_json', 
            'get_task_categories_with_options', 
            'get_task_categories_simple_json', 
            'update_task_categories'
        )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(func_record.func_name) || '(' || func_record.func_args || ') CASCADE';
        RAISE NOTICE 'Dropped function: %(%)', func_record.func_name, func_record.func_args;
    END LOOP;
END $$;

-- Verify cleanup
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
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
