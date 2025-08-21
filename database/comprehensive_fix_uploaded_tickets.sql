-- Comprehensive fix for uploaded_tickets table constraints
-- This script handles various scenarios and ensures the unique constraint is properly added

-- Step 1: Check if the table exists and has the incident_id column
DO $$ 
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'uploaded_tickets'
    ) THEN
        RAISE EXCEPTION 'Table uploaded_tickets does not exist. Please run the schema creation script first.';
    END IF;
    
    -- Check if incident_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploaded_tickets' 
        AND column_name = 'incident_id'
    ) THEN
        RAISE EXCEPTION 'Column incident_id does not exist in uploaded_tickets table.';
    END IF;
    
    RAISE NOTICE 'Table and column validation passed.';
END $$;

-- Step 2: Check for duplicate incident_ids and handle them
DO $$ 
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT incident_id
        FROM uploaded_tickets 
        WHERE incident_id IS NOT NULL
        GROUP BY incident_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate incident_ids. Removing duplicates...', duplicate_count;
        
        -- Remove duplicates by keeping the most recent record for each incident_id
        DELETE FROM uploaded_tickets 
        WHERE id NOT IN (
            SELECT DISTINCT ON (incident_id) id
            FROM uploaded_tickets
            WHERE incident_id IS NOT NULL
            ORDER BY incident_id, created_at DESC
        );
        
        RAISE NOTICE 'Duplicates removed successfully.';
    ELSE
        RAISE NOTICE 'No duplicate incident_ids found.';
    END IF;
END $$;

-- Step 3: Drop existing unique constraint if it exists (with a different name)
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find any existing unique constraint on incident_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'uploaded_tickets' 
    AND kcu.column_name = 'incident_id'
    AND tc.constraint_type = 'UNIQUE';
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Dropping existing unique constraint: %', constraint_name;
        EXECUTE 'ALTER TABLE uploaded_tickets DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Step 4: Add the unique constraint
DO $$ 
BEGIN
    -- Add unique constraint
    ALTER TABLE uploaded_tickets ADD CONSTRAINT unique_incident_id UNIQUE (incident_id);
    RAISE NOTICE 'Unique constraint added successfully.';
    
    -- Add comment
    COMMENT ON CONSTRAINT unique_incident_id ON uploaded_tickets IS 'Ensures each incident ID is unique across all uploaded tickets';
    RAISE NOTICE 'Constraint comment added.';
END $$;

-- Step 5: Verify the constraint was added
SELECT 
    'Constraint verification:' as status,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'uploaded_tickets' 
AND kcu.column_name = 'incident_id'
AND tc.constraint_type = 'UNIQUE';

-- Step 6: Final verification - check for any remaining duplicates
SELECT 
    'Duplicate check:' as status,
    COUNT(*) as duplicate_count
FROM (
    SELECT incident_id
    FROM uploaded_tickets 
    WHERE incident_id IS NOT NULL
    GROUP BY incident_id 
    HAVING COUNT(*) > 1
) duplicates;
