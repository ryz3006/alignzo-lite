-- Migration: Add role column to team_members table
-- This migration adds role support for team members (owner, member, etc.)

-- Add role column to team_members table
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Add comment to document the column
COMMENT ON COLUMN team_members.role IS 'Role of the user in the team (owner, member, etc.)';

-- Update existing team members to have 'member' role (default)
UPDATE team_members SET role = 'member' WHERE role IS NULL;

-- Make role column NOT NULL after setting default values
ALTER TABLE team_members ALTER COLUMN role SET NOT NULL;
