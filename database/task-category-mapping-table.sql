-- Task-Category Mapping Table
-- This table allows multiple categories to be assigned to a single task
-- Run this in your Supabase SQL Editor

-- Create the task-category mapping table
CREATE TABLE IF NOT EXISTS task_category_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES project_categories(id) ON DELETE CASCADE,
    category_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false, -- Indicates if this is the primary category
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    
    -- Ensure unique combinations
    UNIQUE(task_id, category_id),
    
    -- Add indexes for performance
    CONSTRAINT fk_task_category_mapping_task 
        FOREIGN KEY (task_id) REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_category_mapping_category 
        FOREIGN KEY (category_id) REFERENCES project_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_category_mapping_option 
        FOREIGN KEY (category_option_id) REFERENCES category_options(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_task_id ON task_category_mappings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_category_id ON task_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_primary ON task_category_mappings(is_primary);

-- Add RLS policies for the new table
ALTER TABLE task_category_mappings ENABLE ROW LEVEL SECURITY;

-- Policy for users to view task-category mappings for tasks they have access to
CREATE POLICY "Users can view task-category mappings for accessible tasks" ON task_category_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            JOIN team_project_assignments tpa ON kt.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            WHERE kt.id = task_category_mappings.task_id
            AND tm.user_id = (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Policy for users to insert task-category mappings for tasks they can edit
CREATE POLICY "Users can insert task-category mappings for editable tasks" ON task_category_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            JOIN team_project_assignments tpa ON kt.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            WHERE kt.id = task_category_mappings.task_id
            AND tm.user_id = (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Policy for users to update task-category mappings for tasks they can edit
CREATE POLICY "Users can update task-category mappings for editable tasks" ON task_category_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            JOIN team_project_assignments tpa ON kt.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            WHERE kt.id = task_category_mappings.task_id
            AND tm.user_id = (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Policy for users to delete task-category mappings for tasks they can edit
CREATE POLICY "Users can delete task-category mappings for editable tasks" ON task_category_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            JOIN team_project_assignments tpa ON kt.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            WHERE kt.id = task_category_mappings.task_id
            AND tm.user_id = (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

-- Create a function to get task categories with options
CREATE OR REPLACE FUNCTION get_task_categories_with_options(p_task_id UUID)
RETURNS TABLE (
    mapping_id UUID,
    category_id UUID,
    category_name TEXT,
    category_description TEXT,
    category_color TEXT,
    category_option_id UUID,
    option_name TEXT,
    option_value TEXT,
    is_primary BOOLEAN,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcm.id as mapping_id,
        pc.id as category_id,
        pc.name as category_name,
        pc.description as category_description,
        pc.color as category_color,
        co.id as category_option_id,
        co.option_name,
        co.option_value,
        tcm.is_primary,
        tcm.sort_order
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = p_task_id
    AND pc.is_active = true
    AND (co.id IS NULL OR co.is_active = true)
    ORDER BY tcm.is_primary DESC, tcm.sort_order ASC, pc.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update task categories
CREATE OR REPLACE FUNCTION update_task_categories(
    p_task_id UUID,
    p_categories JSON,
    p_user_email TEXT DEFAULT 'system'
)
RETURNS JSON AS $$
DECLARE
    v_category JSON;
    v_mapping_id UUID;
    v_result JSON;
BEGIN
    -- Start transaction
    BEGIN
        -- Delete existing mappings for this task
        DELETE FROM task_category_mappings WHERE task_id = p_task_id;
        
        -- Insert new mappings
        FOR v_category IN SELECT * FROM json_array_elements(p_categories)
        LOOP
            INSERT INTO task_category_mappings (
                task_id,
                category_id,
                category_option_id,
                is_primary,
                sort_order,
                created_by,
                updated_by
            ) VALUES (
                p_task_id,
                (v_category->>'category_id')::UUID,
                CASE 
                    WHEN v_category->>'category_option_id' IS NOT NULL 
                    THEN (v_category->>'category_option_id')::UUID 
                    ELSE NULL 
                END,
                COALESCE((v_category->>'is_primary')::BOOLEAN, false),
                COALESCE((v_category->>'sort_order')::INTEGER, 0),
                p_user_email,
                p_user_email
            );
        END LOOP;
        
        -- Return success
        v_result := json_build_object(
            'success', true,
            'message', 'Task categories updated successfully',
            'task_id', p_task_id
        );
        
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        v_result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'task_id', p_task_id
        );
        
        RETURN v_result;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_category_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_category_mappings_updated_at
    BEFORE UPDATE ON task_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_task_category_mappings_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_category_mappings TO authenticated;

-- Insert sample data for testing (optional)
-- INSERT INTO task_category_mappings (task_id, category_id, category_option_id, is_primary, sort_order)
-- SELECT 
--     kt.id as task_id,
--     pc.id as category_id,
--     co.id as category_option_id,
--     true as is_primary,
--     0 as sort_order
-- FROM kanban_tasks kt
-- CROSS JOIN project_categories pc
-- LEFT JOIN category_options co ON pc.id = co.category_id
-- WHERE kt.category_id = pc.id
-- LIMIT 10;
