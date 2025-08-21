-- Diagnostic script for uploaded_tickets table
-- This script will help identify the current state and fix any issues

-- 1. Check if the table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'uploaded_tickets';

-- 2. Check the current structure of the incident_id column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'uploaded_tickets' 
AND column_name = 'incident_id';

-- 3. Check all constraints on the uploaded_tickets table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'uploaded_tickets'
ORDER BY tc.constraint_type, kcu.column_name;

-- 4. Check for any existing unique constraints on incident_id
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'uploaded_tickets' 
AND kcu.column_name = 'incident_id'
AND tc.constraint_type = 'UNIQUE';

-- 5. Check if there are any duplicate incident_ids (which would prevent adding unique constraint)
SELECT 
    incident_id,
    COUNT(*) as duplicate_count
FROM uploaded_tickets 
WHERE incident_id IS NOT NULL
GROUP BY incident_id 
HAVING COUNT(*) > 1
LIMIT 10;

-- 6. Show sample data to understand the structure
SELECT 
    id,
    incident_id,
    source_id,
    mapping_id,
    project_id,
    created_at
FROM uploaded_tickets 
LIMIT 5;
