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
