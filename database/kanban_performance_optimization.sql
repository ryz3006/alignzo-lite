-- =====================================================
-- KANBAN BOARD PERFORMANCE OPTIMIZATION
-- =====================================================
-- This file contains performance optimizations for the Kanban board system

-- =====================================================
-- STEP 1: Create missing category_options table if it doesn't exist
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

-- =====================================================
-- STEP 2: Create additional performance indexes
-- =====================================================

-- Composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_column_status ON kanban_tasks(project_id, column_id, status);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_scope_status ON kanban_tasks(project_id, scope, status);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_created ON kanban_tasks(assigned_to, created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_due_date ON kanban_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_priority ON kanban_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_jira_ticket ON kanban_tasks(jira_ticket_key) WHERE jira_ticket_key IS NOT NULL;

-- Indexes for category_options
CREATE INDEX IF NOT EXISTS idx_category_options_category_id ON category_options(category_id);
CREATE INDEX IF NOT EXISTS idx_category_options_active ON category_options(is_active);
CREATE INDEX IF NOT EXISTS idx_category_options_sort_order ON category_options(sort_order);

-- Indexes for project_categories
CREATE INDEX IF NOT EXISTS idx_project_categories_project_active ON project_categories(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_project_categories_sort_order ON project_categories(sort_order);

-- Indexes for kanban_columns
CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_active ON kanban_columns(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_sort_order ON kanban_columns(sort_order);

-- =====================================================
-- STEP 3: Create optimized functions for data fetching
-- =====================================================

-- Function to get kanban board data in a single optimized query
CREATE OR REPLACE FUNCTION get_kanban_board_optimized(
    project_uuid UUID,
    team_uuid UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH columns_data AS (
        SELECT 
            kc.id,
            kc.name,
            kc.description,
            kc.color,
            kc.sort_order,
            kc.created_at,
            kc.updated_at
        FROM kanban_columns kc
        WHERE kc.project_id = project_uuid 
        AND kc.is_active = true
        AND (team_uuid IS NULL OR kc.team_id = team_uuid)
        ORDER BY kc.sort_order
    ),
    tasks_data AS (
        SELECT 
            kt.id,
            kt.title,
            kt.description,
            kt.project_id,
            kt.category_id,
            kt.column_id,
            kt.priority,
            kt.estimated_hours,
            kt.actual_hours,
            kt.due_date,
            kt.jira_ticket_id,
            kt.jira_ticket_key,
            kt.scope,
            kt.created_by,
            kt.assigned_to,
            kt.status,
            kt.sort_order,
            kt.created_at,
            kt.updated_at,
            -- User details for assigned_to
            u_assigned.full_name as assigned_to_name,
            -- User details for created_by
            u_created.full_name as created_by_name
        FROM kanban_tasks kt
        LEFT JOIN users u_assigned ON kt.assigned_to = u_assigned.email
        LEFT JOIN users u_created ON kt.created_by = u_created.email
        WHERE kt.project_id = project_uuid 
        AND kt.status = 'active'
        AND (team_uuid IS NULL OR kt.scope = 'project')
        ORDER BY kt.sort_order
    ),
    categories_data AS (
        SELECT 
            pc.id,
            pc.name,
            pc.description,
            pc.color,
            pc.sort_order,
            pc.created_at,
            pc.updated_at,
            -- Category options as JSON array
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', co.id,
                        'option_name', co.option_name,
                        'option_value', co.option_value,
                        'sort_order', co.sort_order
                    ) ORDER BY co.sort_order
                ) FILTER (WHERE co.id IS NOT NULL),
                '[]'::json
            ) as options
        FROM project_categories pc
        LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
        WHERE pc.project_id = project_uuid 
        AND pc.is_active = true
        GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order, pc.created_at, pc.updated_at
        ORDER BY pc.sort_order
    )
    SELECT json_build_object(
        'columns', (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'description', c.description,
                    'color', c.color,
                    'sort_order', c.sort_order,
                    'created_at', c.created_at,
                    'updated_at', c.updated_at,
                    'tasks', (
                        SELECT json_agg(
                            json_build_object(
                                'id', t.id,
                                'title', t.title,
                                'description', t.description,
                                'project_id', t.project_id,
                                'category_id', t.category_id,
                                'column_id', t.column_id,
                                'priority', t.priority,
                                'estimated_hours', t.estimated_hours,
                                'actual_hours', t.actual_hours,
                                'due_date', t.due_date,
                                'jira_ticket_id', t.jira_ticket_id,
                                'jira_ticket_key', t.jira_ticket_key,
                                'scope', t.scope,
                                'created_by', t.created_by,
                                'assigned_to', t.assigned_to,
                                'status', t.status,
                                'sort_order', t.sort_order,
                                'created_at', t.created_at,
                                'updated_at', t.updated_at,
                                'assigned_to_user', json_build_object(
                                    'email', t.assigned_to,
                                    'full_name', t.assigned_to_name
                                ),
                                'created_by_user', json_build_object(
                                    'email', t.created_by,
                                    'full_name', t.created_by_name
                                )
                            ) ORDER BY t.sort_order
                        ) FILTER (WHERE t.column_id = c.id)
                        FROM tasks_data t
                    )
                ) ORDER BY c.sort_order
            )
            FROM columns_data c
        ),
        'categories', (
            SELECT json_agg(cat.*) 
            FROM categories_data cat
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project categories with options
CREATE OR REPLACE FUNCTION get_project_categories_with_options(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', pc.id,
            'name', pc.name,
            'description', pc.description,
            'color', pc.color,
            'sort_order', pc.sort_order,
            'created_at', pc.created_at,
            'updated_at', pc.updated_at,
            'options', COALESCE(
                json_agg(
                    json_build_object(
                        'id', co.id,
                        'option_name', co.option_name,
                        'option_value', co.option_value,
                        'sort_order', co.sort_order
                    ) ORDER BY co.sort_order
                ) FILTER (WHERE co.id IS NOT NULL),
                '[]'::json
            )
        ) ORDER BY pc.sort_order
    )
    FROM project_categories pc
    LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
    WHERE pc.project_id = project_uuid AND pc.is_active = true
    GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order, pc.created_at, pc.updated_at
    ORDER BY pc.sort_order
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible projects with basic info
CREATE OR REPLACE FUNCTION get_user_accessible_projects_optimized(user_email_param TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'name', p.name,
            'product', p.product,
            'country', p.country,
            'created_at', p.created_at,
            'updated_at', p.updated_at
        )
    )
    FROM projects p
    JOIN team_project_assignments tpa ON p.id = tpa.project_id
    JOIN team_members tm ON tpa.team_id = tm.team_id
    JOIN users u ON tm.user_id = u.id
    WHERE u.email = user_email_param
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Create materialized view for frequently accessed data
-- =====================================================

-- Materialized view for project statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS project_kanban_stats AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT kt.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN kt.status = 'active' THEN kt.id END) as active_tasks,
    COUNT(DISTINCT CASE WHEN kt.priority = 'urgent' THEN kt.id END) as urgent_tasks,
    COUNT(DISTINCT CASE WHEN kt.due_date < NOW() AND kt.status = 'active' THEN kt.id END) as overdue_tasks,
    COUNT(DISTINCT kc.id) as total_columns,
    COUNT(DISTINCT pc.id) as total_categories,
    MAX(kt.updated_at) as last_task_update
FROM projects p
LEFT JOIN kanban_tasks kt ON p.id = kt.project_id
LEFT JOIN kanban_columns kc ON p.id = kc.project_id AND kc.is_active = true
LEFT JOIN project_categories pc ON p.id = pc.project_id AND pc.is_active = true
GROUP BY p.id, p.name;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_project_kanban_stats_project_id ON project_kanban_stats(project_id);

-- =====================================================
-- STEP 5: Create refresh function for materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_project_kanban_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_kanban_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: Create trigger to auto-refresh materialized view
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_refresh_kanban_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule refresh (in production, you might want to use a job queue)
    PERFORM refresh_project_kanban_stats();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-refresh
CREATE TRIGGER trigger_refresh_stats_on_task_change
    AFTER INSERT OR UPDATE OR DELETE ON kanban_tasks
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_kanban_stats();

CREATE TRIGGER trigger_refresh_stats_on_column_change
    AFTER INSERT OR UPDATE OR DELETE ON kanban_columns
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_kanban_stats();

CREATE TRIGGER trigger_refresh_stats_on_category_change
    AFTER INSERT OR UPDATE OR DELETE ON project_categories
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_kanban_stats();

-- =====================================================
-- STEP 7: Create RLS policies for new functions
-- =====================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_kanban_board_optimized(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_categories_with_options(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_projects_optimized(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_project_kanban_stats() TO authenticated;

-- =====================================================
-- STEP 8: Create helper functions for task operations
-- =====================================================

-- Function to move task with optimized updates
CREATE OR REPLACE FUNCTION move_kanban_task_optimized(
    task_uuid UUID,
    new_column_uuid UUID,
    new_sort_order INTEGER,
    user_email_param TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the task
    UPDATE kanban_tasks 
    SET 
        column_id = new_column_uuid,
        sort_order = new_sort_order,
        updated_at = NOW()
    WHERE id = task_uuid;
    
    -- Create timeline entry
    INSERT INTO task_timeline (task_id, user_email, action, details)
    VALUES (
        task_uuid,
        user_email_param,
        'moved',
        json_build_object(
            'new_column_id', new_column_uuid,
            'new_sort_order', new_sort_order
        )
    );
    
    -- Return success
    SELECT json_build_object('success', true, 'message', 'Task moved successfully')
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create task with optimized inserts
CREATE OR REPLACE FUNCTION create_kanban_task_optimized(
    task_data JSON,
    user_email_param TEXT
)
RETURNS JSON AS $$
DECLARE
    new_task_id UUID;
    result JSON;
BEGIN
    -- Insert the task
    INSERT INTO kanban_tasks (
        title,
        description,
        project_id,
        category_id,
        column_id,
        priority,
        estimated_hours,
        due_date,
        jira_ticket_id,
        jira_ticket_key,
        scope,
        created_by,
        assigned_to,
        status,
        sort_order
    )
    VALUES (
        (task_data->>'title'),
        (task_data->>'description'),
        (task_data->>'project_id')::UUID,
        CASE WHEN task_data->>'category_id' != '' THEN (task_data->>'category_id')::UUID ELSE NULL END,
        (task_data->>'column_id')::UUID,
        COALESCE(task_data->>'priority', 'medium'),
        CASE WHEN task_data->>'estimated_hours' != '' THEN (task_data->>'estimated_hours')::DECIMAL ELSE NULL END,
        CASE WHEN task_data->>'due_date' != '' THEN (task_data->>'due_date')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
        task_data->>'jira_ticket_id',
        task_data->>'jira_ticket_key',
        COALESCE(task_data->>'scope', 'project'),
        user_email_param,
        CASE WHEN task_data->>'assigned_to' != '' THEN task_data->>'assigned_to' ELSE NULL END,
        'active',
        COALESCE((task_data->>'sort_order')::INTEGER, 0)
    )
    RETURNING id INTO new_task_id;
    
    -- Create timeline entry
    INSERT INTO task_timeline (task_id, user_email, action, details)
    VALUES (
        new_task_id,
        user_email_param,
        'created',
        json_build_object(
            'title', task_data->>'title',
            'priority', task_data->>'priority',
            'scope', task_data->>'scope'
        )
    );
    
    -- Return the new task
    SELECT json_build_object(
        'success', true,
        'task_id', new_task_id,
        'message', 'Task created successfully'
    )
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION move_kanban_task_optimized(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_kanban_task_optimized(JSON, TEXT) TO authenticated;

-- =====================================================
-- STEP 9: Initial data setup for category_options
-- =====================================================

-- Insert some sample category options if the table is empty
INSERT INTO category_options (category_id, option_name, option_value, sort_order)
SELECT 
    pc.id,
    'Option ' || generate_series(1, 3),
    'value_' || generate_series(1, 3),
    generate_series(1, 3)
FROM project_categories pc
WHERE NOT EXISTS (
    SELECT 1 FROM category_options co WHERE co.category_id = pc.id
)
LIMIT 10;

-- =====================================================
-- STEP 10: Create performance monitoring views
-- =====================================================

-- View to monitor query performance
CREATE OR REPLACE VIEW kanban_performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN (
    'kanban_tasks',
    'kanban_columns', 
    'project_categories',
    'category_options',
    'task_timeline'
)
ORDER BY tablename, attname;

-- Grant select permissions
GRANT SELECT ON kanban_performance_metrics TO authenticated;
