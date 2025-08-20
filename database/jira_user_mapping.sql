-- JIRA User Mapping table
-- This table maps team/project member emails to JIRA assignee/reporter names
CREATE TABLE IF NOT EXISTS jira_user_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    jira_assignee_name VARCHAR(255) NOT NULL,
    jira_reporter_name VARCHAR(255),
    jira_project_key VARCHAR(50),
    integration_user_email VARCHAR(255) NOT NULL, -- The user who owns the JIRA integration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, jira_project_key, integration_user_email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_user_email ON jira_user_mappings(user_email);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_jira_assignee ON jira_user_mappings(jira_assignee_name);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_jira_project ON jira_user_mappings(jira_project_key);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_integration_user ON jira_user_mappings(integration_user_email);

-- Create trigger for updated_at
CREATE TRIGGER update_jira_user_mappings_updated_at 
    BEFORE UPDATE ON jira_user_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE jira_user_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access" ON jira_user_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON jira_user_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON jira_user_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON jira_user_mappings FOR DELETE USING (true);
