-- =====================================================
-- KANBAN BOARD PHASE 1 OPTIMIZATION
-- =====================================================
-- This file implements Phase 1 optimizations from the performance analysis
-- Includes optimized database function and performance indexes

-- =====================================================
-- OPTIMIZED DATABASE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_kanban_board_optimized(
    project_uuid UUID,
    team_uuid UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'columns', (
            SELECT json_agg(
                json_build_object(
                    'id', kc.id,
                    'name', kc.name,
                    'description', kc.description,
                    'color', kc.color,
                    'sort_order', kc.sort_order,
                    'is_active', kc.is_active,
                    'created_at', kc.created_at,
                    'updated_at', kc.updated_at,
                    'tasks', (
                        SELECT json_agg(
                            json_build_object(
                                'id', kt.id,
                                'title', kt.title,
                                'description', kt.description,
                                'priority', kt.priority,
                                'assigned_to', kt.assigned_to,
                                'due_date', kt.due_date,
                                'estimated_hours', kt.estimated_hours,
                                'actual_hours', kt.actual_hours,
                                'jira_ticket_key', kt.jira_ticket_key,
                                'scope', kt.scope,
                                'sort_order', kt.sort_order,
                                'created_at', kt.created_at,
                                'updated_at', kt.updated_at,
                                'category_id', kt.category_id,
                                'subcategory_id', kt.subcategory_id
                            )
                        )
                        FROM kanban_tasks kt
                        WHERE kt.column_id = kc.id 
                        AND kt.status = 'active'
                        AND (team_uuid IS NULL OR kt.scope = 'project')
                        ORDER BY kt.sort_order
                    )
                )
            )
            FROM kanban_columns kc
            WHERE kc.project_id = project_uuid 
            AND kc.is_active = true
            AND (team_uuid IS NULL OR kc.team_id = team_uuid)
            ORDER BY kc.sort_order
        ),
        'categories', (
            SELECT json_agg(
                json_build_object(
                    'id', pc.id,
                    'name', pc.name,
                    'description', pc.description,
                    'color', pc.color,
                    'sort_order', pc.sort_order,
                    'is_active', pc.is_active,
                    'created_at', pc.created_at,
                    'updated_at', pc.updated_at,
                    'options', (
                        SELECT json_agg(
                            json_build_object(
                                'id', co.id,
                                'option_name', co.option_name,
                                'option_value', co.option_value,
                                'sort_order', co.sort_order,
                                'is_active', co.is_active
                            )
                        )
                        FROM category_options co
                        WHERE co.category_id = pc.id 
                        AND co.is_active = true
                        ORDER BY co.sort_order
                    )
                )
            )
            FROM project_categories pc
            WHERE pc.project_id = project_uuid 
            AND pc.is_active = true
            ORDER BY pc.sort_order
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_tasks_column_status_sort 
ON kanban_tasks(column_id, status, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_tasks_project_scope_status 
ON kanban_tasks(project_id, scope, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_options_category_active_sort 
ON category_options(category_id, is_active, sort_order);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_tasks_active_only 
ON kanban_tasks(project_id, column_id, sort_order) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_columns_active_only 
ON kanban_columns(project_id, sort_order) 
WHERE is_active = true;

-- Optimize for task filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_tasks_comprehensive 
ON kanban_tasks(project_id, column_id, status, priority, assigned_to, due_date, sort_order);

-- Optimize for search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_tasks_search 
ON kanban_tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Optimize for timeline queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_timeline_comprehensive 
ON task_timeline(task_id, user_email, action, created_at);

-- Optimize for category queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_categories_comprehensive 
ON project_categories(project_id, is_active, sort_order);

-- =====================================================
-- PERFORMANCE MONITORING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS kanban_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    duration_ms INTEGER NOT NULL,
    project_id UUID,
    user_email VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for performance analysis
CREATE INDEX IF NOT EXISTS idx_kanban_performance_operation_time 
ON kanban_performance_metrics(operation, timestamp);

CREATE INDEX IF NOT EXISTS idx_kanban_performance_project_time 
ON kanban_performance_metrics(project_id, timestamp);

-- =====================================================
-- PERFORMANCE ANALYSIS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_kanban_performance(
    p_days INTEGER DEFAULT 7
) RETURNS TABLE(
    operation VARCHAR(100),
    avg_duration_ms DECIMAL(10,2),
    max_duration_ms INTEGER,
    min_duration_ms INTEGER,
    total_calls BIGINT,
    slow_calls BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kpm.operation,
        AVG(kpm.duration_ms)::DECIMAL(10,2) as avg_duration_ms,
        MAX(kpm.duration_ms) as max_duration_ms,
        MIN(kpm.duration_ms) as min_duration_ms,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE kpm.duration_ms > 1000) as slow_calls
    FROM kanban_performance_metrics kpm
    WHERE kpm.timestamp >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY kpm.operation
    ORDER BY avg_duration_ms DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- OPTIMIZED PROJECT CATEGORIES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_project_categories_with_options(
    project_uuid UUID
) RETURNS JSON AS $$
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
            'is_active', pc.is_active,
            'created_at', pc.created_at,
            'updated_at', pc.updated_at,
            'options', (
                SELECT json_agg(
                    json_build_object(
                        'id', co.id,
                        'option_name', co.option_name,
                        'option_value', co.option_value,
                        'sort_order', co.sort_order,
                        'is_active', co.is_active
                    )
                )
                FROM category_options co
                WHERE co.category_id = pc.id 
                AND co.is_active = true
                ORDER BY co.sort_order
            )
        )
    )
    FROM project_categories pc
    WHERE pc.project_id = project_uuid 
    AND pc.is_active = true
    ORDER BY pc.sort_order
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- OPTIMIZED USER PROJECTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_accessible_projects_optimized(
    user_email_param VARCHAR
) RETURNS JSON AS $$
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
            'updated_at', p.updated_at,
            'categories', (
                SELECT json_agg(
                    json_build_object(
                        'id', pc.id,
                        'name', pc.name,
                        'description', pc.description,
                        'color', pc.color,
                        'sort_order', pc.sort_order
                    )
                )
                FROM project_categories pc
                WHERE pc.project_id = p.id 
                AND pc.is_active = true
                ORDER BY pc.sort_order
            )
        )
    )
    FROM projects p
    INNER JOIN project_assignments pa ON p.id = pa.project_id
    WHERE pa.user_email = user_email_param
    AND pa.is_active = true
    ORDER BY p.name
    INTO result;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;
