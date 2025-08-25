-- Fix Materialized View Issues
-- This script fixes the concurrent refresh issue by adding a unique index

-- 1. Check current materialized view structure
SELECT 
    'Materialized View Status' as check_type,
    schemaname,
    matviewname,
    matviewowner
FROM pg_matviews 
WHERE matviewname = 'project_kanban_stats';

-- 2. Check existing indexes on the materialized view
SELECT 
    'Current Indexes' as check_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'project_kanban_stats'
ORDER BY indexname;

-- 3. Drop the existing materialized view and recreate it with proper indexes
DROP MATERIALIZED VIEW IF EXISTS project_kanban_stats;

CREATE MATERIALIZED VIEW project_kanban_stats AS
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

-- 4. Create a unique index on project_id (required for concurrent refresh)
CREATE UNIQUE INDEX idx_project_kanban_stats_project_id_unique ON project_kanban_stats(project_id);

-- 5. Create additional indexes for performance
CREATE INDEX idx_project_kanban_stats_total_tasks ON project_kanban_stats(total_tasks);
CREATE INDEX idx_project_kanban_stats_active_tasks ON project_kanban_stats(active_tasks);
CREATE INDEX idx_project_kanban_stats_urgent_tasks ON project_kanban_stats(urgent_tasks);

-- 6. Update the refresh function to handle the case when concurrent refresh fails
CREATE OR REPLACE FUNCTION refresh_project_kanban_stats()
RETURNS void AS $$
BEGIN
    -- Try concurrent refresh first, fallback to regular refresh if it fails
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY project_kanban_stats;
        RAISE NOTICE '✅ Materialized view refreshed concurrently';
    EXCEPTION WHEN OTHERS THEN
        -- Fallback to regular refresh
        REFRESH MATERIALIZED VIEW project_kanban_stats;
        RAISE NOTICE '⚠️ Concurrent refresh failed, used regular refresh: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant permissions
GRANT SELECT ON project_kanban_stats TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_project_kanban_stats() TO authenticated;

-- 8. Verify the materialized view and indexes
SELECT 
    'Updated Indexes' as check_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'project_kanban_stats'
ORDER BY indexname;

-- 9. Test the refresh function
DO $$
BEGIN
    PERFORM refresh_project_kanban_stats();
    RAISE NOTICE '✅ Materialized view refresh test completed';
END $$;

-- 10. Show sample data from the materialized view
SELECT 
    'Sample Data' as check_type,
    project_id,
    project_name,
    total_tasks,
    active_tasks,
    urgent_tasks,
    overdue_tasks,
    total_columns,
    total_categories
FROM project_kanban_stats
LIMIT 5;
