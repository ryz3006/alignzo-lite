-- Fix for 500 Internal Server Error in task categories API
-- This file contains all necessary functions and policies to resolve the issue

-- 1. First, ensure the task_category_mappings table exists with proper structure
CREATE TABLE IF NOT EXISTS task_category_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES project_categories(id) ON DELETE CASCADE,
    category_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_task_id ON task_category_mappings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_category_id ON task_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_task_category_mappings_sort_order ON task_category_mappings(sort_order);

-- 3. Enable RLS
ALTER TABLE task_category_mappings ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view task-category mappings for accessible tasks" ON task_category_mappings;
DROP POLICY IF EXISTS "Users can insert task-category mappings for editable tasks" ON task_category_mappings;
DROP POLICY IF EXISTS "Users can update task-category mappings for editable tasks" ON task_category_mappings;
DROP POLICY IF EXISTS "Users can delete task-category mappings for editable tasks" ON task_category_mappings;

-- 5. Create RLS policies with correct table references
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

-- 6. Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_task_categories_with_options(UUID);
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSON, TEXT);
DROP FUNCTION IF EXISTS debug_task_categories(UUID);
DROP FUNCTION IF EXISTS get_task_categories_simple(UUID);

-- 7. Create debug function first
CREATE OR REPLACE FUNCTION debug_task_categories(p_task_id UUID)
RETURNS JSON AS $$
DECLARE
    v_task_exists BOOLEAN;
    v_mappings_count INTEGER;
    v_categories_count INTEGER;
    v_project_categories_count INTEGER;
    v_category_options_count INTEGER;
    v_result JSON;
BEGIN
    -- Check if task exists
    SELECT EXISTS(SELECT 1 FROM kanban_tasks WHERE id = p_task_id) INTO v_task_exists;
    
    -- Count mappings for this task
    SELECT COUNT(*) FROM task_category_mappings WHERE task_id = p_task_id INTO v_mappings_count;
    
    -- Count total categories
    SELECT COUNT(*) FROM project_categories WHERE is_active = true INTO v_categories_count;
    
    -- Count project categories (with RLS)
    SELECT COUNT(*) FROM project_categories INTO v_project_categories_count;
    
    -- Count category options
    SELECT COUNT(*) FROM category_options INTO v_category_options_count;
    
    -- Return debug info
    v_result := json_build_object(
        'task_exists', v_task_exists,
        'mappings_count', v_mappings_count,
        'categories_count', v_categories_count,
        'project_categories_total', v_project_categories_count,
        'category_options_total', v_category_options_count,
        'task_id', p_task_id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create simple function for testing
CREATE OR REPLACE FUNCTION get_task_categories_simple(p_task_id UUID)
RETURNS TABLE (
    mapping_id UUID,
    category_id UUID,
    category_option_id UUID,
    is_primary BOOLEAN,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tcm.id,
        tcm.category_id,
        tcm.category_option_id,
        tcm.is_primary,
        tcm.sort_order
    FROM task_category_mappings tcm
    WHERE tcm.task_id = p_task_id
    ORDER BY tcm.is_primary DESC, tcm.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create the main function to get task categories with options
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
        tcm.id,
        pc.id,
        pc.name,
        pc.description,
        pc.color,
        co.id,
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

-- 10. Create function to update task categories
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
        
        -- Check if p_categories is an array
        IF json_typeof(p_categories) != 'array' THEN
            v_result := json_build_object(
                'success', false,
                'error', 'Categories must be an array',
                'task_id', p_task_id
            );
            RETURN v_result;
        END IF;
        
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

-- 11. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_category_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_task_category_mappings_updated_at ON task_category_mappings;

CREATE TRIGGER trigger_update_task_category_mappings_updated_at
    BEFORE UPDATE ON task_category_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_task_category_mappings_updated_at();

-- 12. Create alternative JSON function for better compatibility
CREATE OR REPLACE FUNCTION get_task_categories_with_options_json(p_task_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'mapping_id', tcm.id,
            'category_id', pc.id,
            'category_name', pc.name,
            'category_description', pc.description,
            'category_color', pc.color,
            'category_option_id', co.id,
            'option_name', co.option_name,
            'option_value', co.option_value,
            'is_primary', tcm.is_primary,
            'sort_order', tcm.sort_order
        )
        ORDER BY tcm.is_primary DESC, tcm.sort_order ASC, pc.name ASC
    ) INTO v_result
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = p_task_id
    AND pc.is_active = true
    AND (co.id IS NULL OR co.is_active = true);
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create a simpler JSON function that's more reliable
CREATE OR REPLACE FUNCTION get_task_categories_simple_json(p_task_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'mapping_id', tcm.id,
            'category_id', tcm.category_id,
            'category_option_id', tcm.category_option_id,
            'is_primary', tcm.is_primary,
            'sort_order', tcm.sort_order
        )
        ORDER BY tcm.is_primary DESC, tcm.sort_order ASC
    ) INTO v_result
    FROM task_category_mappings tcm
    WHERE tcm.task_id = p_task_id;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_category_mappings TO authenticated;
GRANT EXECUTE ON FUNCTION debug_task_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_categories_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_categories_with_options(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_categories_with_options_json(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_categories_simple_json(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_categories(UUID, JSON, TEXT) TO authenticated;

-- 13. Test the functions (optional - remove these lines after testing)
-- SELECT debug_task_categories('your-task-id-here');
-- SELECT get_task_categories_simple('your-task-id-here');
-- SELECT get_task_categories_with_options('your-task-id-here');
