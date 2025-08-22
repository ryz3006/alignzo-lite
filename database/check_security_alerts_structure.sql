-- Diagnostic script to check the current structure of security_alerts table
-- Run this first to see what columns actually exist

-- Check if the table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_alerts') 
        THEN 'Table EXISTS' 
        ELSE 'Table DOES NOT EXIST' 
    END as table_status;

-- If table exists, show its current structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
        RAISE NOTICE 'Table security_alerts exists. Current columns:';
        
        -- This will be displayed in the query results
        PERFORM 1;
    ELSE
        RAISE NOTICE 'Table security_alerts does not exist.';
    END IF;
END $$;

-- Show all columns in the table (if it exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'security_alerts'
ORDER BY ordinal_position;

-- Show table constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'security_alerts';

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'security_alerts';

-- Show triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'security_alerts';

-- Show RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'security_alerts';

-- Show sample data (if any exists)
SELECT COUNT(*) as total_rows FROM security_alerts;

-- Show first few rows (if any exist)
SELECT * FROM security_alerts LIMIT 5;
