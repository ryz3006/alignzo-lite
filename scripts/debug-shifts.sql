-- Debug script to check shift types and custom shift enums
-- Run this in your Supabase SQL Editor to understand the current state

-- Check what shift types exist in the shift_schedules table
SELECT 
    'shift_schedules' as table_name,
    shift_type,
    COUNT(*) as count,
    MIN(shift_date) as earliest_date,
    MAX(shift_date) as latest_date
FROM shift_schedules 
GROUP BY shift_type
ORDER BY shift_type;

-- Check what custom shift enums exist
SELECT 
    'custom_shift_enums' as table_name,
    project_id,
    team_id,
    shift_identifier,
    shift_name,
    start_time,
    end_time,
    color,
    is_default
FROM custom_shift_enums
ORDER BY project_id, team_id, shift_identifier;

-- Check team-project assignments
SELECT 
    'team_project_assignments' as table_name,
    tpa.team_id,
    tpa.project_id,
    t.name as team_name,
    p.name as project_name
FROM team_project_assignments tpa
JOIN teams t ON tpa.team_id = t.id
JOIN projects p ON tpa.project_id = p.id
ORDER BY t.name, p.name;

-- Check if there are any Evening shifts assigned
SELECT 
    'evening_shifts' as table_name,
    ss.shift_type,
    ss.user_email,
    ss.shift_date,
    t.name as team_name,
    p.name as project_name
FROM shift_schedules ss
JOIN teams t ON ss.team_id = t.id
JOIN projects p ON ss.project_id = p.id
WHERE ss.shift_type = 'E'
ORDER BY ss.shift_date DESC;

-- Check all shifts for today
SELECT 
    'today_shifts' as table_name,
    ss.shift_type,
    ss.user_email,
    t.name as team_name,
    p.name as project_name,
    ss.shift_date
FROM shift_schedules ss
JOIN teams t ON ss.team_id = t.id
JOIN projects p ON ss.project_id = p.id
WHERE ss.shift_date = CURRENT_DATE
ORDER BY t.name, ss.shift_type;
