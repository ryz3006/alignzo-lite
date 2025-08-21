-- Fix for uploaded_tickets table constraints
-- This script adds the missing unique constraint on incident_id column

-- Add unique constraint on incident_id column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_incident_id' 
        AND table_name = 'uploaded_tickets'
    ) THEN
        ALTER TABLE uploaded_tickets ADD CONSTRAINT unique_incident_id UNIQUE (incident_id);
    END IF;
END $$;

-- Add a comment explaining the constraint (only if constraint exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_incident_id' 
        AND table_name = 'uploaded_tickets'
    ) THEN
        COMMENT ON CONSTRAINT unique_incident_id ON uploaded_tickets IS 'Ensures each incident ID is unique across all uploaded tickets';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.table_name = 'uploaded_tickets' 
    AND tc.constraint_type = 'UNIQUE';
