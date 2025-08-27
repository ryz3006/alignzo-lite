-- Create Google Drive configuration table
CREATE TABLE IF NOT EXISTS google_drive_config (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Google Drive tokens table
CREATE TABLE IF NOT EXISTS google_drive_tokens (
    id SERIAL PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for google_drive_config
ALTER TABLE google_drive_config ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to read config (for checking if configured)
CREATE POLICY "Allow authenticated users to read google_drive_config" ON google_drive_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow service role to insert/update config
CREATE POLICY "Allow service role to manage google_drive_config" ON google_drive_config
    FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for google_drive_tokens
ALTER TABLE google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage tokens
CREATE POLICY "Allow service role to manage google_drive_tokens" ON google_drive_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_drive_config_updated_at ON google_drive_config(updated_at);
CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_updated_at ON google_drive_tokens(updated_at);
