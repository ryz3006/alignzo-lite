-- Safe Kanban Task Move Function
-- This function ensures tasks are moved safely without accidental deletion
-- Run this in your Supabase SQL Editor

-- Create the safe move function
CREATE OR REPLACE FUNCTION move_kanban_task_safe(
    p_task_id UUID,
    p_new_column_id UUID,
    p_new_sort_order INTEGER,
    p_user_email TEXT DEFAULT 'system'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_task kanban_tasks%ROWTYPE;
    v_from_column_name TEXT;
    v_to_column_name TEXT;
    v_result JSON;
    v_timeline_id UUID;
BEGIN
    -- Start transaction
    BEGIN
        -- 1. Get current task details
        SELECT * INTO v_current_task
        FROM kanban_tasks
        WHERE id = p_task_id
        AND status = 'active';
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Task not found or not active: %', p_task_id;
        END IF;
        
        -- 2. Validate new column exists
        IF NOT EXISTS (SELECT 1 FROM kanban_columns WHERE id = p_new_column_id AND is_active = true) THEN
            RAISE EXCEPTION 'Target column not found or not active: %', p_new_column_id;
        END IF;
        
        -- 3. Get column names for timeline
        SELECT name INTO v_from_column_name
        FROM kanban_columns
        WHERE id = v_current_task.column_id;
        
        SELECT name INTO v_to_column_name
        FROM kanban_columns
        WHERE id = p_new_column_id;
        
        -- 4. Update task (this is the critical operation)
        UPDATE kanban_tasks
        SET 
            column_id = p_new_column_id,
            sort_order = p_new_sort_order,
            updated_at = NOW()
        WHERE id = p_task_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update task: %', p_task_id;
        END IF;
        
        -- 5. Create timeline entry
        INSERT INTO task_timeline (
            task_id,
            user_email,
            action,
            details,
            created_at
        ) VALUES (
            p_task_id,
            p_user_email,
            'moved',
            jsonb_build_object(
                'from_column', v_from_column_name,
                'to_column', v_to_column_name,
                'from_column_id', v_current_task.column_id,
                'to_column_id', p_new_column_id,
                'sort_order', p_new_sort_order
            ),
            NOW()
        ) RETURNING id INTO v_timeline_id;
        
        -- 6. Return success result
        v_result := jsonb_build_object(
            'success', true,
            'task_id', p_task_id,
            'from_column', v_from_column_name,
            'to_column', v_to_column_name,
            'timeline_id', v_timeline_id,
            'message', 'Task moved successfully'
        );
        
        -- Log the successful move
        RAISE NOTICE '✅ Task % moved from % to % successfully', p_task_id, v_from_column_name, v_to_column_name;
        
        RETURN v_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction on any error
            RAISE NOTICE '❌ Error moving task %: %', p_task_id, SQLERRM;
            
            v_result := jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'task_id', p_task_id,
                'message', 'Task move failed'
            );
            
            RETURN v_result;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION move_kanban_task_safe(UUID, UUID, INTEGER, TEXT) TO authenticated;

-- Test the function (optional)
-- SELECT move_kanban_task_safe(
--     'your-task-id-here'::UUID,
--     'your-column-id-here'::UUID,
--     1,
--     'test@example.com'
-- );

-- Verify the function was created
SELECT 
    'Function Created' as status,
    proname as function_name,
    prosrc as source
FROM pg_proc 
WHERE proname = 'move_kanban_task_safe';
