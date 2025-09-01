-- =====================================================
-- KANBAN TASK CATEGORIES MIGRATION
-- =====================================================
-- This script adds the missing task category functionality
-- Run this in your Supabase SQL Editor if the functions don't exist

-- Task category mappings table (for multiple categories per task)
CREATE TABLE IF NOT EXISTS task_category_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    category_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, category_id)
);

-- Drop existing functions if they exist to avoid conflicts
-- Use CASCADE to drop all overloaded versions
DROP FUNCTION IF EXISTS get_task_categories_with_options_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_with_options(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_simple_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, VARCHAR) CASCADE;

-- Function to get task categories with options (JSON format)
CREATE OR REPLACE FUNCTION get_task_categories_with_options_json(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH category_data AS (
        SELECT
            tcm.id as mapping_id,
            tcm.category_id,
            tcm.category_option_id,
            tcm.is_primary,
            tcm.sort_order,
            pc.name as category_name,
            pc.description as category_description,
            pc.color as category_color,
            co.option_name,
            co.option_value
        FROM task_category_mappings tcm
        JOIN project_categories pc ON tcm.category_id = pc.id
        LEFT JOIN category_options co ON tcm.category_option_id = co.id
        WHERE tcm.task_id = p_task_id
        ORDER BY tcm.sort_order, pc.name
    )
    SELECT json_agg(
        json_build_object(
            'mapping_id', cd.mapping_id,
            'category_id', cd.category_id,
            'category_option_id', cd.category_option_id,
            'is_primary', cd.is_primary,
            'sort_order', cd.sort_order,
            'category_name', cd.category_name,
            'category_description', cd.category_description,
            'category_color', cd.category_color,
            'option_name', cd.option_name,
            'option_value', cd.option_value
        )
    ) INTO result
    FROM category_data cd;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get task categories with options (table format - fallback)
CREATE OR REPLACE FUNCTION get_task_categories_with_options(
    p_task_id UUID
)
RETURNS TABLE (
    mapping_id UUID,
    category_id UUID,
    category_option_id UUID,
    is_primary BOOLEAN,
    sort_order INTEGER,
    category_name TEXT,
    category_description TEXT,
    category_color TEXT,
    option_name TEXT,
    option_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tcm.id as mapping_id,
        tcm.category_id,
        tcm.category_option_id,
        tcm.is_primary,
        tcm.sort_order,
        pc.name as category_name,
        pc.description as category_description,
        pc.color as category_color,
        co.option_name,
        co.option_value
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = p_task_id
    ORDER BY tcm.sort_order, pc.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get task categories with options (simple JSON format - fallback)
CREATE OR REPLACE FUNCTION get_task_categories_simple_json(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_agg(
        json_build_object(
            'category_id', tcm.category_id,
            'category_option_id', tcm.category_option_id,
            'is_primary', tcm.is_primary,
            'sort_order', tcm.sort_order
        )
    ) INTO result
    FROM task_category_mappings tcm
    WHERE tcm.task_id = p_task_id
    ORDER BY tcm.sort_order;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to update task categories
CREATE OR REPLACE FUNCTION update_task_categories(
    p_task_id UUID,
    p_categories JSONB,
    p_user_email TEXT DEFAULT 'system'
)
RETURNS JSONB AS $$
DECLARE
    category_record JSONB;
    category_id UUID;
    category_option_id UUID;
    is_primary BOOLEAN;
    sort_order INTEGER;
    result JSONB;
BEGIN
    -- Start transaction
    BEGIN
        -- Delete existing category mappings for this task
        DELETE FROM task_category_mappings WHERE task_id = p_task_id;
        
        -- Insert new category mappings
        FOR category_record IN SELECT * FROM jsonb_array_elements(p_categories)
        LOOP
            category_id := (category_record->>'category_id')::UUID;
            category_option_id := CASE 
                WHEN category_record->>'category_option_id' IS NOT NULL 
                AND category_record->>'category_option_id' != 'null'
                AND category_record->>'category_option_id' != ''
                THEN (category_record->>'category_option_id')::UUID
                ELSE NULL
            END;
            is_primary := COALESCE((category_record->>'is_primary')::BOOLEAN, false);
            sort_order := COALESCE((category_record->>'sort_order')::INTEGER, 0);
            
            INSERT INTO task_category_mappings (
                task_id,
                category_id,
                category_option_id,
                is_primary,
                sort_order
            ) VALUES (
                p_task_id,
                category_id,
                category_option_id,
                is_primary,
                sort_order
            );
        END LOOP;
        
        -- Return success
        result := jsonb_build_object(
            'success', true,
            'message', 'Task categories updated successfully',
            'task_id', p_task_id,
            'categories_count', jsonb_array_length(p_categories)
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'task_id', p_task_id
        );
        
        RETURN result;
    END;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE task_category_mappings IS 'Maps tasks to multiple categories with options';
COMMENT ON COLUMN task_category_mappings.task_id IS 'Reference to the kanban task';
COMMENT ON COLUMN task_category_mappings.category_id IS 'Reference to the project category';
COMMENT ON COLUMN task_category_mappings.category_option_id IS 'Optional reference to a specific category option';
COMMENT ON COLUMN task_category_mappings.is_primary IS 'Whether this is the primary category for the task';
COMMENT ON COLUMN task_category_mappings.sort_order IS 'Order for displaying categories';

COMMENT ON FUNCTION get_task_categories_with_options_json(UUID) IS 'Get task categories with full details in JSON format';
COMMENT ON FUNCTION get_task_categories_with_options(UUID) IS 'Get task categories with full details in table format';
COMMENT ON FUNCTION get_task_categories_simple_json(UUID) IS 'Get task categories with basic details in JSON format';
COMMENT ON FUNCTION update_task_categories(UUID, JSONB, TEXT) IS 'Update task categories by replacing all existing mappings with new ones';
