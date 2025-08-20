-- Simple JIRA Project Mapping Table Creation
-- Run this in your Supabase SQL Editor

-- Create the jira_project_mappings table
CREATE TABLE IF NOT EXISTS jira_project_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    jira_project_key VARCHAR(255) NOT NULL,
    jira_project_name VARCHAR(500),
    integration_user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_dashboard_project 
ON jira_project_mappings(dashboard_project_id);

CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_integration_user 
ON jira_project_mappings(integration_user_email);

CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_jira_project 
ON jira_project_mappings(jira_project_key);

-- Create a unique constraint to prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_jira_project_mappings_unique 
ON jira_project_mappings(dashboard_project_id, jira_project_key, integration_user_email);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jira_project_mappings_updated_at
    BEFORE UPDATE ON jira_project_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE jira_project_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own project mappings" ON jira_project_mappings
    FOR SELECT USING (
        integration_user_email = auth.jwt() ->> 'email'
        OR 
        integration_user_email IN (
            SELECT DISTINCT integration_user_email 
            FROM user_integrations 
            WHERE user_email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can create project mappings" ON jira_project_mappings
    FOR INSERT WITH CHECK (
        integration_user_email = auth.jwt() ->> 'email'
        OR 
        integration_user_email IN (
            SELECT DISTINCT integration_user_email 
            FROM user_integrations 
            WHERE user_email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update their own project mappings" ON jira_project_mappings
    FOR UPDATE USING (
        integration_user_email = auth.jwt() ->> 'email'
        OR 
        integration_user_email IN (
            SELECT DISTINCT integration_user_email 
            FROM user_integrations 
            WHERE user_email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can delete their own project mappings" ON jira_project_mappings
    FOR DELETE USING (
        integration_user_email = auth.jwt() ->> 'email'
        OR 
        integration_user_email IN (
            SELECT DISTINCT integration_user_email 
            FROM user_integrations 
            WHERE user_email = auth.jwt() ->> 'email'
        )
    );
