-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Project categories table
CREATE TABLE IF NOT EXISTS project_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_email ON work_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_timers_user_email ON timers(user_email);
CREATE INDEX IF NOT EXISTS idx_timers_is_running ON timers(is_running);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timers_updated_at BEFORE UPDATE ON timers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for now, we'll handle auth in the app layer)
CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON project_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON work_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON timers FOR SELECT USING (true);

-- Create policies for insert/update/delete (admin only in practice)
CREATE POLICY "Allow public insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON project_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON work_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON timers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON project_categories FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON work_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON timers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON users FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON teams FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON team_members FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON projects FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON project_categories FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON work_logs FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON timers FOR DELETE USING (true);
