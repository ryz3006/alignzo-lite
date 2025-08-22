-- Migration: Add access_team_work_reports column to users table
-- This migration adds the new access control for team work reports

-- Add the new column to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS access_team_work_reports BOOLEAN DEFAULT FALSE;

-- Update existing users to have the new column (optional - for existing data)
-- UPDATE users SET access_team_work_reports = FALSE WHERE access_team_work_reports IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN users.access_team_work_reports IS 'Controls access to team work reports page';
