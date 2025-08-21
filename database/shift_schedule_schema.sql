-- =====================================================
-- SHIFT SCHEDULE DATABASE SCHEMA
-- =====================================================
-- This file contains the database schema for the shift schedule functionality
-- Run this file in your Supabase SQL Editor to set up the shift schedule tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SHIFT SCHEDULE TABLES
-- =====================================================

-- Shift types enum (default)
CREATE TYPE shift_type AS ENUM ('M', 'A', 'N', 'G', 'H', 'L');

-- Custom shift enums table for project-team specific shift definitions
CREATE TABLE IF NOT EXISTS custom_shift_enums (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    shift_identifier VARCHAR(10) NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, team_id, shift_identifier)
);

-- Shift schedules table
CREATE TABLE IF NOT EXISTS shift_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    shift_date DATE NOT NULL,
    shift_type shift_type NOT NULL DEFAULT 'G',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, team_id, user_email, shift_date)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Indexes for shift_schedules table
CREATE INDEX IF NOT EXISTS idx_shift_schedules_project_id ON shift_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_team_id ON shift_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_user_email ON shift_schedules(user_email);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_shift_date ON shift_schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_project_team_date ON shift_schedules(project_id, team_id, shift_date);

-- Indexes for custom_shift_enums table
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_project_id ON custom_shift_enums(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_team_id ON custom_shift_enums(team_id);
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_project_team ON custom_shift_enums(project_id, team_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for shift_schedules table
CREATE TRIGGER update_shift_schedules_updated_at 
    BEFORE UPDATE ON shift_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for custom_shift_enums table
CREATE TRIGGER update_custom_shift_enums_updated_at 
    BEFORE UPDATE ON custom_shift_enums 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on shift_schedules table
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on custom_shift_enums table
ALTER TABLE custom_shift_enums ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_schedules table
CREATE POLICY "shift_schedules_select_policy" ON shift_schedules FOR SELECT USING (true);
CREATE POLICY "shift_schedules_insert_policy" ON shift_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "shift_schedules_update_policy" ON shift_schedules FOR UPDATE USING (true);
CREATE POLICY "shift_schedules_delete_policy" ON shift_schedules FOR DELETE USING (true);

-- RLS Policies for custom_shift_enums table
CREATE POLICY "custom_shift_enums_select_policy" ON custom_shift_enums FOR SELECT USING (true);
CREATE POLICY "custom_shift_enums_insert_policy" ON custom_shift_enums FOR INSERT WITH CHECK (true);
CREATE POLICY "custom_shift_enums_update_policy" ON custom_shift_enums FOR UPDATE USING (true);
CREATE POLICY "custom_shift_enums_delete_policy" ON custom_shift_enums FOR DELETE USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE shift_schedules IS 'Stores shift assignments for users by project, team, and date';
COMMENT ON COLUMN shift_schedules.shift_type IS 'Shift type: M=Morning, A=Afternoon, N=Night, G=General/Day, H=Holiday, L=Leave';
COMMENT ON COLUMN shift_schedules.shift_date IS 'Date for the shift assignment';
COMMENT ON COLUMN shift_schedules.user_email IS 'Email of the user assigned to the shift';

COMMENT ON TABLE custom_shift_enums IS 'Stores custom shift definitions for specific project-team combinations';
COMMENT ON COLUMN custom_shift_enums.shift_identifier IS 'Short identifier for the shift (e.g., M, A, N)';
COMMENT ON COLUMN custom_shift_enums.shift_name IS 'Full name of the shift (e.g., Morning, Afternoon, Night)';
COMMENT ON COLUMN custom_shift_enums.start_time IS 'Shift start time in 24-hour format';
COMMENT ON COLUMN custom_shift_enums.end_time IS 'Shift end time in 24-hour format';
COMMENT ON COLUMN custom_shift_enums.is_default IS 'Whether this shift is the default for invalid assignments';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get shift schedule for a specific project, team, and month
CREATE OR REPLACE FUNCTION get_shift_schedule(
    p_project_id UUID,
    p_team_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    user_email VARCHAR(255),
    shift_date DATE,
    shift_type shift_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.user_email,
        ss.shift_date,
        ss.shift_type
    FROM shift_schedules ss
    WHERE ss.project_id = p_project_id
      AND ss.team_id = p_team_id
      AND EXTRACT(YEAR FROM ss.shift_date) = p_year
      AND EXTRACT(MONTH FROM ss.shift_date) = p_month
    ORDER BY ss.user_email, ss.shift_date;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk insert/update shift schedules
CREATE OR REPLACE FUNCTION upsert_shift_schedules(
    p_project_id UUID,
    p_team_id UUID,
    p_user_email VARCHAR(255),
    p_shift_date DATE,
    p_shift_type shift_type
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO shift_schedules (project_id, team_id, user_email, shift_date, shift_type)
    VALUES (p_project_id, p_team_id, p_user_email, p_shift_date, p_shift_type)
    ON CONFLICT (project_id, team_id, user_email, shift_date)
    DO UPDATE SET 
        shift_type = EXCLUDED.shift_type,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to bulk upsert shift schedules from JSON array
CREATE OR REPLACE FUNCTION upsert_shift_schedules_bulk(
    shift_data JSONB
)
RETURNS VOID AS $$
DECLARE
    shift_record JSONB;
BEGIN
    -- Loop through each shift record in the JSON array
    FOR shift_record IN SELECT * FROM jsonb_array_elements(shift_data)
    LOOP
        INSERT INTO shift_schedules (
            project_id, 
            team_id, 
            user_email, 
            shift_date, 
            shift_type
        )
        VALUES (
            (shift_record->>'project_id')::UUID,
            (shift_record->>'team_id')::UUID,
            shift_record->>'user_email',
            (shift_record->>'shift_date')::DATE,
            (shift_record->>'shift_type')::shift_type
        )
        ON CONFLICT (project_id, team_id, user_email, shift_date)
        DO UPDATE SET 
            shift_type = EXCLUDED.shift_type,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get custom shift enums for a project-team combination
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

-- Function to validate and update shifts based on custom enums
CREATE OR REPLACE FUNCTION validate_and_update_shifts(
    p_project_id UUID,
    p_team_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    default_shift VARCHAR(10);
    updated_count INTEGER := 0;
BEGIN
    -- Get the default shift for this project-team combination
    SELECT shift_identifier INTO default_shift
    FROM custom_shift_enums
    WHERE project_id = p_project_id
      AND team_id = p_team_id
      AND is_default = true
    LIMIT 1;

    -- If no custom enums defined, use 'G' as default
    IF default_shift IS NULL THEN
        default_shift := 'G';
    END IF;

    -- Update all shifts that don't match valid custom enums
    UPDATE shift_schedules
    SET 
        shift_type = default_shift::shift_type,
        updated_at = NOW()
    WHERE project_id = p_project_id
      AND team_id = p_team_id
      AND EXTRACT(YEAR FROM shift_date) = p_year
      AND EXTRACT(MONTH FROM shift_date) = p_month
      AND shift_type::VARCHAR NOT IN (
          SELECT shift_identifier 
          FROM custom_shift_enums 
          WHERE project_id = p_project_id 
            AND team_id = p_team_id
      );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
