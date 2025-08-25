-- Fix shift enums to ensure all shift types are properly defined
-- This script will create missing custom shift enums for project-team combinations

-- First, let's see what shift types are currently being used
SELECT 
    'Current shift usage' as info,
    shift_type,
    COUNT(*) as count
FROM shift_schedules 
GROUP BY shift_type
ORDER BY shift_type;

-- Check what custom shift enums exist
SELECT 
    'Existing custom enums' as info,
    project_id,
    team_id,
    shift_identifier,
    shift_name
FROM custom_shift_enums
ORDER BY project_id, team_id, shift_identifier;

-- Create a function to ensure all shift types have proper enums
CREATE OR REPLACE FUNCTION ensure_shift_enums()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    project_record RECORD;
    shift_type_val TEXT;
    shift_types TEXT[] := ARRAY['M', 'A', 'N', 'G', 'H', 'L', 'E'];
    shift_names TEXT[] := ARRAY['Morning', 'Afternoon', 'Night', 'General/Day', 'Holiday', 'Leave', 'Evening'];
    shift_colors TEXT[] := ARRAY['#3B82F6', '#8B5CF6', '#6366F1', '#10B981', '#EF4444', '#F59E0B', '#F97316'];
    shift_times TEXT[] := ARRAY['09:00:00', '17:00:00', '01:00:00', '08:00:00', '00:00:00', '00:00:00', '18:00:00'];
    shift_end_times TEXT[] := ARRAY['17:00:00', '01:00:00', '09:00:00', '16:00:00', '00:00:00', '00:00:00', '02:00:00'];
BEGIN
    -- Loop through all team-project assignments
    FOR team_record IN 
        SELECT DISTINCT tpa.team_id, tpa.project_id
        FROM team_project_assignments tpa
    LOOP
        -- For each shift type, ensure it has a custom enum
        FOR i IN 1..array_length(shift_types, 1) LOOP
            shift_type_val := shift_types[i];
            
            -- Check if this shift type already exists for this team-project combination
            IF NOT EXISTS (
                SELECT 1 FROM custom_shift_enums 
                WHERE project_id = team_record.project_id 
                AND team_id = team_record.team_id 
                AND shift_identifier = shift_type_val
            ) THEN
                -- Insert the missing shift enum
                INSERT INTO custom_shift_enums (
                    project_id, 
                    team_id, 
                    shift_identifier, 
                    shift_name, 
                    start_time, 
                    end_time, 
                    is_default, 
                    color
                ) VALUES (
                    team_record.project_id,
                    team_record.team_id,
                    shift_type_val,
                    shift_names[i],
                    shift_times[i]::time,
                    shift_end_times[i]::time,
                    CASE WHEN shift_type_val = 'G' THEN true ELSE false END,
                    shift_colors[i]
                );
                
                RAISE NOTICE 'Created shift enum % for team % and project %', shift_type_val, team_record.team_id, team_record.project_id;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Shift enums check completed';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to ensure all shift types have proper enums
SELECT ensure_shift_enums();

-- Verify the results
SELECT 
    'Final custom enums' as info,
    project_id,
    team_id,
    shift_identifier,
    shift_name,
    start_time,
    end_time,
    color
FROM custom_shift_enums
ORDER BY project_id, team_id, shift_identifier;

-- Clean up the function
DROP FUNCTION ensure_shift_enums();
