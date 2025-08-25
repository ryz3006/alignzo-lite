-- =====================================================
-- MIGRATION: JSONB to Table-Based Categories
-- =====================================================
-- This migration converts the current JSONB-based category storage
-- to a proper table-based structure for better reporting and data analysis

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: Create new tables for category options
-- =====================================================

-- Category options table to store individual options for each category
CREATE TABLE IF NOT EXISTS category_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, option_value)
);

-- Subcategory options table to store individual options for each subcategory
CREATE TABLE IF NOT EXISTS subcategory_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subcategory_id, option_value)
);

-- =====================================================
-- STEP 2: Create tables for storing category selections
-- =====================================================

-- Work log category selections table
CREATE TABLE IF NOT EXISTS work_log_category_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    work_log_id UUID REFERENCES work_logs(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    selected_suboption_id UUID REFERENCES subcategory_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timer category selections table
CREATE TABLE IF NOT EXISTS timer_category_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    selected_suboption_id UUID REFERENCES subcategory_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Create indexes for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_category_options_category_id ON category_options(category_id);
CREATE INDEX IF NOT EXISTS idx_category_options_sort_order ON category_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_subcategory_options_subcategory_id ON subcategory_options(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subcategory_options_sort_order ON subcategory_options(sort_order);

CREATE INDEX IF NOT EXISTS idx_work_log_category_selections_work_log_id ON work_log_category_selections(work_log_id);
CREATE INDEX IF NOT EXISTS idx_work_log_category_selections_category_id ON work_log_category_selections(category_id);
CREATE INDEX IF NOT EXISTS idx_work_log_category_selections_subcategory_id ON work_log_category_selections(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_timer_category_selections_timer_id ON timer_category_selections(timer_id);
CREATE INDEX IF NOT EXISTS idx_timer_category_selections_category_id ON timer_category_selections(category_id);
CREATE INDEX IF NOT EXISTS idx_timer_category_selections_subcategory_id ON timer_category_selections(subcategory_id);

-- =====================================================
-- STEP 4: Create functions for data migration
-- =====================================================

-- Function to migrate existing category options from JSONB to table
CREATE OR REPLACE FUNCTION migrate_category_options()
RETURNS void AS $$
DECLARE
    category_record RECORD;
    option_value TEXT;
    option_index INTEGER;
    has_options_column BOOLEAN;
    options_array TEXT[];
BEGIN
    -- Check if the options column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_categories' 
        AND column_name = 'options'
    ) INTO has_options_column;
    
    IF has_options_column THEN
        -- Main schema: Use the options JSONB column
        FOR category_record IN 
            SELECT id, name, options, project_id 
            FROM project_categories 
            WHERE options IS NOT NULL AND options != '[]'::jsonb
        LOOP
            -- Extract options from JSONB array
            FOR option_index IN 0..jsonb_array_length(category_record.options) - 1 LOOP
                option_value := category_record.options->option_index;
                
                -- Insert into category_options table
                INSERT INTO category_options (category_id, option_name, option_value, sort_order)
                VALUES (
                    category_record.id,
                    option_value,
                    option_value,
                    option_index
                )
                ON CONFLICT (category_id, option_value) DO NOTHING;
            END LOOP;
        END LOOP;
    ELSE
        -- Kanban schema: Parse options from description field
        FOR category_record IN 
            SELECT id, name, description, project_id 
            FROM project_categories 
            WHERE description IS NOT NULL AND description != ''
        LOOP
            -- Check if description contains options (format: "Category with options: option1, option2")
            IF category_record.description LIKE '%options:%' THEN
                -- Extract options from description
                options_array := string_to_array(
                    split_part(category_record.description, 'options:', 2), 
                    ','
                );
                
                -- Insert each option
                FOR option_index IN 1..array_length(options_array, 1) LOOP
                    option_value := trim(options_array[option_index]);
                    
                    IF option_value != '' THEN
                        INSERT INTO category_options (category_id, option_name, option_value, sort_order)
                        VALUES (
                            category_record.id,
                            option_value,
                            option_value,
                            option_index - 1
                        )
                        ON CONFLICT (category_id, option_value) DO NOTHING;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing work log category selections
CREATE OR REPLACE FUNCTION migrate_work_log_category_selections()
RETURNS void AS $$
DECLARE
    work_log_record RECORD;
    category_id UUID;
    subcategory_id UUID;
    selected_option_id UUID;
    selected_suboption_id UUID;
    category_name TEXT;
    category_value TEXT;
    subcategory_name TEXT;
    subcategory_value TEXT;
BEGIN
    -- Loop through all work logs with category selections
    FOR work_log_record IN 
        SELECT id, project_id, dynamic_category_selections
        FROM work_logs 
        WHERE dynamic_category_selections IS NOT NULL AND dynamic_category_selections != '{}'::jsonb
    LOOP
        -- Extract category selections from JSONB
        FOR category_name, category_value IN 
            SELECT * FROM jsonb_each_text(work_log_record.dynamic_category_selections)
        LOOP
            -- Find the category by name and project
            SELECT pc.id INTO category_id
            FROM project_categories pc
            WHERE pc.project_id = work_log_record.project_id AND pc.name = category_name;
            
            IF category_id IS NOT NULL THEN
                -- Find the selected option
                SELECT co.id INTO selected_option_id
                FROM category_options co
                WHERE co.category_id = category_id AND co.option_value = category_value;
                
                -- Insert the selection
                INSERT INTO work_log_category_selections (
                    work_log_id, 
                    category_id, 
                    selected_option_id
                )
                VALUES (
                    work_log_record.id,
                    category_id,
                    selected_option_id
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing timer category selections
CREATE OR REPLACE FUNCTION migrate_timer_category_selections()
RETURNS void AS $$
DECLARE
    timer_record RECORD;
    category_id UUID;
    selected_option_id UUID;
    category_name TEXT;
    category_value TEXT;
BEGIN
    -- Loop through all timers with category selections
    FOR timer_record IN 
        SELECT id, project_id, dynamic_category_selections
        FROM timers 
        WHERE dynamic_category_selections IS NOT NULL AND dynamic_category_selections != '{}'::jsonb
    LOOP
        -- Extract category selections from JSONB
        FOR category_name, category_value IN 
            SELECT * FROM jsonb_each_text(timer_record.dynamic_category_selections)
        LOOP
            -- Find the category by name and project
            SELECT pc.id INTO category_id
            FROM project_categories pc
            WHERE pc.project_id = timer_record.project_id AND pc.name = category_name;
            
            IF category_id IS NOT NULL THEN
                -- Find the selected option
                SELECT co.id INTO selected_option_id
                FROM category_options co
                WHERE co.category_id = category_id AND co.option_value = category_value;
                
                -- Insert the selection
                INSERT INTO timer_category_selections (
                    timer_id, 
                    category_id, 
                    selected_option_id
                )
                VALUES (
                    timer_record.id,
                    category_id,
                    selected_option_id
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Execute migration functions
-- =====================================================

-- Run the migration functions
SELECT migrate_category_options();
SELECT migrate_work_log_category_selections();
SELECT migrate_timer_category_selections();

-- =====================================================
-- STEP 6: Create helper functions for the application
-- =====================================================

-- Function to get category options for a project
CREATE OR REPLACE FUNCTION get_project_category_options(project_uuid UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    category_description TEXT,
    option_id UUID,
    option_name TEXT,
    option_value TEXT,
    option_sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id as category_id,
        pc.name as category_name,
        pc.description as category_description,
        co.id as option_id,
        co.option_name,
        co.option_value,
        co.sort_order as option_sort_order
    FROM project_categories pc
    LEFT JOIN category_options co ON pc.id = co.category_id
    WHERE pc.project_id = project_uuid 
    AND pc.is_active = true
    AND (co.id IS NULL OR co.is_active = true)
    ORDER BY pc.sort_order, co.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Function to get subcategory options for a project
CREATE OR REPLACE FUNCTION get_project_subcategory_options(project_uuid UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    subcategory_id UUID,
    subcategory_name TEXT,
    subcategory_description TEXT,
    option_id UUID,
    option_name TEXT,
    option_value TEXT,
    option_sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id as category_id,
        pc.name as category_name,
        ps.id as subcategory_id,
        ps.name as subcategory_name,
        ps.description as subcategory_description,
        so.id as option_id,
        so.option_name,
        so.option_value,
        so.sort_order as option_sort_order
    FROM project_categories pc
    JOIN project_subcategories ps ON pc.id = ps.category_id
    LEFT JOIN subcategory_options so ON ps.id = so.subcategory_id
    WHERE pc.project_id = project_uuid 
    AND pc.is_active = true
    AND ps.is_active = true
    AND (so.id IS NULL OR so.is_active = true)
    ORDER BY pc.sort_order, ps.sort_order, so.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Function to get work log category selections
CREATE OR REPLACE FUNCTION get_work_log_category_selections(work_log_uuid UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    subcategory_id UUID,
    subcategory_name TEXT,
    selected_option_id UUID,
    selected_option_value TEXT,
    selected_suboption_id UUID,
    selected_suboption_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wlcs.category_id,
        pc.name as category_name,
        wlcs.subcategory_id,
        ps.name as subcategory_name,
        wlcs.selected_option_id,
        co.option_value as selected_option_value,
        wlcs.selected_suboption_id,
        so.option_value as selected_suboption_value
    FROM work_log_category_selections wlcs
    JOIN project_categories pc ON wlcs.category_id = pc.id
    LEFT JOIN project_subcategories ps ON wlcs.subcategory_id = ps.id
    LEFT JOIN category_options co ON wlcs.selected_option_id = co.id
    LEFT JOIN subcategory_options so ON wlcs.selected_suboption_id = so.id
    WHERE wlcs.work_log_id = work_log_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get timer category selections
CREATE OR REPLACE FUNCTION get_timer_category_selections(timer_uuid UUID)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    subcategory_id UUID,
    subcategory_name TEXT,
    selected_option_id UUID,
    selected_option_value TEXT,
    selected_suboption_id UUID,
    selected_suboption_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcs.category_id,
        pc.name as category_name,
        tcs.subcategory_id,
        ps.name as subcategory_name,
        tcs.selected_option_id,
        co.option_value as selected_option_value,
        tcs.selected_suboption_id,
        so.option_value as selected_suboption_value
    FROM timer_category_selections tcs
    JOIN project_categories pc ON tcs.category_id = pc.id
    LEFT JOIN project_subcategories ps ON tcs.subcategory_id = ps.id
    LEFT JOIN category_options co ON tcs.selected_option_id = co.id
    LEFT JOIN subcategory_options so ON tcs.selected_suboption_id = so.id
    WHERE tcs.timer_id = timer_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Add RLS policies for new tables
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE category_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategory_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_log_category_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_category_selections ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_options
CREATE POLICY "Users can view category options for their projects" ON category_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_categories pc
            JOIN team_project_assignments tpa ON pc.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE pc.id = category_options.category_id
            AND u.email = current_user
        )
    );

CREATE POLICY "Admin users can manage category options" ON category_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_user
            AND access_dashboard = true
        )
    );

-- RLS policies for subcategory_options
CREATE POLICY "Users can view subcategory options for their projects" ON subcategory_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_subcategories ps
            JOIN project_categories pc ON ps.category_id = pc.id
            JOIN team_project_assignments tpa ON pc.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE ps.id = subcategory_options.subcategory_id
            AND u.email = current_user
        )
    );

CREATE POLICY "Admin users can manage subcategory options" ON subcategory_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE email = current_user
            AND access_dashboard = true
        )
    );

-- RLS policies for work_log_category_selections
CREATE POLICY "Users can view their own work log category selections" ON work_log_category_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM work_logs wl
            WHERE wl.id = work_log_category_selections.work_log_id
            AND wl.user_email = current_user
        )
    );

CREATE POLICY "Users can insert their own work log category selections" ON work_log_category_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM work_logs wl
            WHERE wl.id = work_log_category_selections.work_log_id
            AND wl.user_email = current_user
        )
    );

-- RLS policies for timer_category_selections
CREATE POLICY "Users can view their own timer category selections" ON timer_category_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM timers t
            WHERE t.id = timer_category_selections.timer_id
            AND t.user_email = current_user
        )
    );

CREATE POLICY "Users can insert their own timer category selections" ON timer_category_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM timers t
            WHERE t.id = timer_category_selections.timer_id
            AND t.user_email = current_user
        )
    );

-- =====================================================
-- STEP 8: Clean up (optional - uncomment when ready)
-- =====================================================

-- Note: Uncomment these lines only after confirming the migration worked correctly
-- and updating the application code to use the new table-based structure

-- Remove the JSONB columns from work_logs and timers tables
-- ALTER TABLE work_logs DROP COLUMN IF EXISTS dynamic_category_selections;
-- ALTER TABLE timers DROP COLUMN IF EXISTS dynamic_category_selections;

-- Remove the JSONB options column from project_categories (main schema)
-- ALTER TABLE project_categories DROP COLUMN IF EXISTS options;

-- Drop the migration functions
-- DROP FUNCTION IF EXISTS migrate_category_options();
-- DROP FUNCTION IF EXISTS migrate_work_log_category_selections();
-- DROP FUNCTION IF EXISTS migrate_timer_category_selections();
