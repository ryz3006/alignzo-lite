-- Team-Project Assignment table
CREATE TABLE IF NOT EXISTS team_project_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, project_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_id ON team_project_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_project_id ON team_project_assignments(project_id);

-- Create trigger for updated_at
CREATE TRIGGER update_team_project_assignments_updated_at BEFORE UPDATE ON team_project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE team_project_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON team_project_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON team_project_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON team_project_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON team_project_assignments FOR DELETE USING (true);
