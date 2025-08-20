-- =====================================================
-- ALIGNZO LITE - MASTER DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema for the Alignzo Lite application
-- Run this file in your Supabase SQL Editor to set up the entire database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team-Project Assignment table
CREATE TABLE IF NOT EXISTS team_project_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, project_id)
);

-- Project categories table
CREATE TABLE IF NOT EXISTS project_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WORK TRACKING TABLES
-- =====================================================

-- Work logs table
CREATE TABLE IF NOT EXISTS work_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    ticket_id VARCHAR(255) NOT NULL,
    task_detail TEXT NOT NULL,
    dynamic_category_selections JSONB NOT NULL DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
    logged_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timers table for active timers
CREATE TABLE IF NOT EXISTS timers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    ticket_id VARCHAR(255) NOT NULL,
    task_detail TEXT NOT NULL,
    dynamic_category_selections JSONB NOT NULL DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_running BOOLEAN NOT NULL DEFAULT true,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    pause_start_time TIMESTAMP WITH TIME ZONE,
    total_pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

-- User integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'jira', 'slack', etc.
    base_url VARCHAR(500),
    user_email_integration VARCHAR(255),
    api_token TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, integration_type)
);

-- JIRA User Mappings table
CREATE TABLE IF NOT EXISTS jira_user_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    jira_assignee_name TEXT NOT NULL,
    jira_reporter_name TEXT,
    jira_project_key TEXT,
    integration_user_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JIRA Project Mappings table
CREATE TABLE IF NOT EXISTS jira_project_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    jira_project_key VARCHAR(255) NOT NULL,
    jira_project_name VARCHAR(500),
    integration_user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_id ON team_project_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_project_id ON team_project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);

-- Work tracking indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_user_email ON work_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_timers_user_email ON timers(user_email);
CREATE INDEX IF NOT EXISTS idx_timers_is_running ON timers(is_running);

-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_email ON user_integrations(user_email);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);

-- JIRA mapping indexes
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_integration_user ON jira_user_mappings(integration_user_email);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_user_email ON jira_user_mappings(user_email);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_project_key ON jira_user_mappings(jira_project_key);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_dashboard_project ON jira_project_mappings(dashboard_project_id);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_integration_user ON jira_project_mappings(integration_user_email);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_jira_project ON jira_project_mappings(jira_project_key);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- JIRA User Mappings unique constraint
ALTER TABLE jira_user_mappings 
ADD CONSTRAINT IF NOT EXISTS unique_user_project_integration 
UNIQUE (user_email, jira_project_key, integration_user_email);

-- JIRA Project Mappings unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_jira_project_mappings_unique 
ON jira_project_mappings(dashboard_project_id, jira_project_key, integration_user_email);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Core table triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_project_assignments_updated_at BEFORE UPDATE ON team_project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Work tracking triggers
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timers_updated_at BEFORE UPDATE ON timers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Integration triggers
CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON user_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jira_user_mappings_updated_at BEFORE UPDATE ON jira_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jira_project_mappings_updated_at BEFORE UPDATE ON jira_project_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_project_mappings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Core table policies (public access for now, auth handled in app layer)
CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_project_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON project_categories FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON team_project_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON project_categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON team_project_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON project_categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON users FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON teams FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON team_members FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON projects FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON team_project_assignments FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON project_categories FOR DELETE USING (true);

-- Work tracking policies
CREATE POLICY "Allow public read access" ON work_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON timers FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON work_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON timers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON work_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON timers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON work_logs FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON timers FOR DELETE USING (true);

-- Integration policies
CREATE POLICY "Allow public read access" ON user_integrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON user_integrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON user_integrations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON user_integrations FOR DELETE USING (true);

-- JIRA mapping policies (simplified for API routes)
CREATE POLICY "Users can view their own mappings" ON jira_user_mappings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own mappings" ON jira_user_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own mappings" ON jira_user_mappings FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own mappings" ON jira_user_mappings FOR DELETE USING (true);

CREATE POLICY "Users can view their own project mappings" ON jira_project_mappings FOR SELECT USING (true);
CREATE POLICY "Users can create project mappings" ON jira_project_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own project mappings" ON jira_project_mappings FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own project mappings" ON jira_project_mappings FOR DELETE USING (true);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Application users with authentication details';
COMMENT ON TABLE teams IS 'Teams that can be assigned to projects';
COMMENT ON TABLE team_members IS 'Junction table linking users to teams';
COMMENT ON TABLE projects IS 'Projects that users work on';
COMMENT ON TABLE team_project_assignments IS 'Junction table linking teams to projects';
COMMENT ON TABLE project_categories IS 'Custom categories for project work tracking';
COMMENT ON TABLE work_logs IS 'Completed work sessions with time tracking';
COMMENT ON TABLE timers IS 'Active work timers for ongoing sessions';
COMMENT ON TABLE user_integrations IS 'External service integrations (JIRA, Slack, etc.)';
COMMENT ON TABLE jira_user_mappings IS 'Maps internal users to JIRA assignee/reporter names';
COMMENT ON TABLE jira_project_mappings IS 'Maps dashboard projects to JIRA projects for analytics integration';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- All tables, indexes, constraints, triggers, and RLS policies have been created
-- The database is now ready for the Alignzo Lite application
