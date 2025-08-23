-- Sample data insertion for shift_schedules table
-- This script inserts sample shift data to test the shift loading functionality

-- First, let's check if we have the necessary base data
-- We need: users, teams, projects, team_members, team_project_assignments

-- Insert sample users if they don't exist
INSERT INTO users (id, full_name, email, phone_number) 
VALUES 
  (gen_random_uuid(), 'John Doe', 'john.doe@example.com', '+1234567890'),
  (gen_random_uuid(), 'Jane Smith', 'jane.smith@example.com', '+1234567891')
ON CONFLICT (email) DO NOTHING;

-- Insert sample teams if they don't exist
INSERT INTO teams (id, name) 
VALUES 
  (gen_random_uuid(), 'Development Team'),
  (gen_random_uuid(), 'QA Team')
ON CONFLICT (name) DO NOTHING;

-- Insert sample projects if they don't exist
INSERT INTO projects (id, name, product, country) 
VALUES 
  (gen_random_uuid(), 'E-commerce Platform', 'Web Application', 'USA'),
  (gen_random_uuid(), 'Mobile App', 'iOS/Android', 'Canada')
ON CONFLICT (name) DO NOTHING;

-- Get the IDs we just inserted
DO $$
DECLARE
    user_id_1 UUID;
    user_id_2 UUID;
    team_id_1 UUID;
    team_id_2 UUID;
    project_id_1 UUID;
    project_id_2 UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO user_id_1 FROM users WHERE email = 'john.doe@example.com';
    SELECT id INTO user_id_2 FROM users WHERE email = 'jane.smith@example.com';
    
    -- Get team IDs
    SELECT id INTO team_id_1 FROM teams WHERE name = 'Development Team';
    SELECT id INTO team_id_2 FROM teams WHERE name = 'QA Team';
    
    -- Get project IDs
    SELECT id INTO project_id_1 FROM projects WHERE name = 'E-commerce Platform';
    SELECT id INTO project_id_2 FROM projects WHERE name = 'Mobile App';
    
    -- Insert team members
    INSERT INTO team_members (team_id, user_id) 
    VALUES 
      (team_id_1, user_id_1),
      (team_id_1, user_id_2),
      (team_id_2, user_id_2)
    ON CONFLICT (team_id, user_id) DO NOTHING;
    
    -- Insert team-project assignments
    INSERT INTO team_project_assignments (team_id, project_id) 
    VALUES 
      (team_id_1, project_id_1),
      (team_id_2, project_id_2)
    ON CONFLICT (team_id, project_id) DO NOTHING;
    
    -- Insert custom shift enums
    INSERT INTO custom_shift_enums (project_id, team_id, shift_identifier, shift_name, start_time, end_time, is_default, color) 
    VALUES 
      (project_id_1, team_id_1, 'M', 'Morning Shift', '09:00:00', '17:00:00', true, '#3B82F6'),
      (project_id_1, team_id_1, 'A', 'Afternoon Shift', '17:00:00', '01:00:00', false, '#8B5CF6'),
      (project_id_1, team_id_1, 'N', 'Night Shift', '01:00:00', '09:00:00', false, '#6366F1'),
      (project_id_2, team_id_2, 'G', 'General Shift', '08:00:00', '16:00:00', true, '#10B981')
    ON CONFLICT (project_id, team_id, shift_identifier) DO NOTHING;
    
    -- Insert sample shift schedules for today and tomorrow
    INSERT INTO shift_schedules (project_id, team_id, user_email, shift_date, shift_type) 
    VALUES 
      (project_id_1, team_id_1, 'john.doe@example.com', CURRENT_DATE, 'M'),
      (project_id_1, team_id_1, 'jane.smith@example.com', CURRENT_DATE, 'A'),
      (project_id_2, team_id_2, 'jane.smith@example.com', CURRENT_DATE, 'G'),
      (project_id_1, team_id_1, 'john.doe@example.com', CURRENT_DATE + INTERVAL '1 day', 'A'),
      (project_id_1, team_id_1, 'jane.smith@example.com', CURRENT_DATE + INTERVAL '1 day', 'M'),
      (project_id_2, team_id_2, 'jane.smith@example.com', CURRENT_DATE + INTERVAL '1 day', 'G')
    ON CONFLICT (project_id, team_id, user_email, shift_date) DO NOTHING;
    
    RAISE NOTICE 'Sample data inserted successfully!';
    RAISE NOTICE 'User IDs: %, %', user_id_1, user_id_2;
    RAISE NOTICE 'Team IDs: %, %', team_id_1, team_id_2;
    RAISE NOTICE 'Project IDs: %, %', project_id_1, project_id_2;
END $$;

-- Verify the data was inserted
SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Teams', count(*) FROM teams
UNION ALL
SELECT 'Projects', count(*) FROM projects
UNION ALL
SELECT 'Team Members', count(*) FROM team_members
UNION ALL
SELECT 'Team Project Assignments', count(*) FROM team_project_assignments
UNION ALL
SELECT 'Custom Shift Enums', count(*) FROM custom_shift_enums
UNION ALL
SELECT 'Shift Schedules', count(*) FROM shift_schedules;

-- Show sample shift schedules
SELECT 
    ss.shift_date,
    ss.shift_type,
    ss.user_email,
    t.name as team_name,
    p.name as project_name
FROM shift_schedules ss
JOIN teams t ON ss.team_id = t.id
JOIN projects p ON ss.project_id = p.id
ORDER BY ss.shift_date, ss.user_email;
