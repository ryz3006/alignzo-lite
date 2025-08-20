-- Create JIRA user mappings table
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

-- Create unique constraint
ALTER TABLE jira_user_mappings 
ADD CONSTRAINT unique_user_project_integration 
UNIQUE (user_email, jira_project_key, integration_user_email);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_integration_user 
ON jira_user_mappings(integration_user_email);

CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_user_email 
ON jira_user_mappings(user_email);

CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_project_key 
ON jira_user_mappings(jira_project_key);

-- Enable Row Level Security (RLS)
ALTER TABLE jira_user_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own mappings" ON jira_user_mappings
  FOR SELECT USING (integration_user_email = current_user);

CREATE POLICY "Users can insert their own mappings" ON jira_user_mappings
  FOR INSERT WITH CHECK (integration_user_email = current_user);

CREATE POLICY "Users can update their own mappings" ON jira_user_mappings
  FOR UPDATE USING (integration_user_email = current_user);

CREATE POLICY "Users can delete their own mappings" ON jira_user_mappings
  FOR DELETE USING (integration_user_email = current_user);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jira_user_mappings_updated_at 
  BEFORE UPDATE ON jira_user_mappings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
