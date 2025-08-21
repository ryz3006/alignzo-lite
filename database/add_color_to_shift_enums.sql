-- Add color column to custom_shift_enums table
-- Run this in your Supabase SQL Editor

-- Add color column
ALTER TABLE custom_shift_enums 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Update existing records with default colors
UPDATE custom_shift_enums 
SET color = CASE 
    WHEN shift_identifier = 'H' THEN '#EF4444'  -- Red for Holiday
    WHEN shift_identifier = 'G' THEN '#10B981'  -- Green for General
    WHEN shift_identifier = 'M' THEN '#3B82F6'  -- Blue for Morning
    WHEN shift_identifier = 'A' THEN '#8B5CF6'  -- Purple for Afternoon
    WHEN shift_identifier = 'E' THEN '#8B5C16'  -- Purple for Afternoon
    WHEN shift_identifier = 'N' THEN '#6366F1'  -- Indigo for Night
    WHEN shift_identifier = 'L' THEN '#F59E0B'  -- Yellow for Leave
    ELSE '#3B82F6'  -- Default blue
END
WHERE color IS NULL;

-- Add comment for the new column
COMMENT ON COLUMN custom_shift_enums.color IS 'Hex color code for the shift type display';

-- Enable RLS on custom_shift_enums table (if not already enabled)
ALTER TABLE custom_shift_enums ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for custom_shift_enums table (if not already created)
-- Note: These will fail if policies already exist, which is expected
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_shift_enums' 
        AND policyname = 'custom_shift_enums_select_policy'
    ) THEN
        CREATE POLICY "custom_shift_enums_select_policy" ON custom_shift_enums FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_shift_enums' 
        AND policyname = 'custom_shift_enums_insert_policy'
    ) THEN
        CREATE POLICY "custom_shift_enums_insert_policy" ON custom_shift_enums FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_shift_enums' 
        AND policyname = 'custom_shift_enums_update_policy'
    ) THEN
        CREATE POLICY "custom_shift_enums_update_policy" ON custom_shift_enums FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_shift_enums' 
        AND policyname = 'custom_shift_enums_delete_policy'
    ) THEN
        CREATE POLICY "custom_shift_enums_delete_policy" ON custom_shift_enums FOR DELETE USING (true);
    END IF;
END
$$;

-- Update the get_custom_shift_enums function to return the color column
CREATE OR REPLACE FUNCTION get_custom_shift_enums(
    p_project_id UUID,
    p_team_id UUID
)
RETURNS TABLE (
    id UUID,
    shift_identifier VARCHAR(10),
    shift_name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    is_default BOOLEAN,
    color VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cse.id,
        cse.shift_identifier,
        cse.shift_name,
        cse.start_time,
        cse.end_time,
        cse.is_default,
        cse.color
    FROM custom_shift_enums cse
    WHERE cse.project_id = p_project_id
      AND cse.team_id = p_team_id
    ORDER BY cse.shift_identifier;
END;
$$ LANGUAGE plpgsql;
