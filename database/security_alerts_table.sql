-- Security Alerts Table
-- This table stores security-related alerts and notifications

-- First, let's check what columns exist and create the table properly
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    message TEXT NOT NULL,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the table already exists but with different column names, let's add missing columns
DO $$ 
BEGIN
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'created_at') THEN
        ALTER TABLE security_alerts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'updated_at') THEN
        ALTER TABLE security_alerts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add other missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'acknowledged') THEN
        ALTER TABLE security_alerts ADD COLUMN acknowledged BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'acknowledged_by') THEN
        ALTER TABLE security_alerts ADD COLUMN acknowledged_by VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'acknowledged_at') THEN
        ALTER TABLE security_alerts ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'resolved') THEN
        ALTER TABLE security_alerts ADD COLUMN resolved BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'resolved_by') THEN
        ALTER TABLE security_alerts ADD COLUMN resolved_by VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'resolved_at') THEN
        ALTER TABLE security_alerts ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'metadata') THEN
        ALTER TABLE security_alerts ADD COLUMN metadata JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'ip_address') THEN
        ALTER TABLE security_alerts ADD COLUMN ip_address INET;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_alerts' AND column_name = 'user_agent') THEN
        ALTER TABLE security_alerts ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_email ON security_alerts(user_email);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);

-- Create trigger for updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_security_alerts_updated_at') THEN
        CREATE TRIGGER update_security_alerts_updated_at 
            BEFORE UPDATE ON security_alerts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_alerts' AND policyname = 'Allow public read access') THEN
        CREATE POLICY "Allow public read access" ON security_alerts FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_alerts' AND policyname = 'Allow admin insert access') THEN
        CREATE POLICY "Allow admin insert access" ON security_alerts FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_alerts' AND policyname = 'Allow admin update access') THEN
        CREATE POLICY "Allow admin update access" ON security_alerts FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_alerts' AND policyname = 'Allow admin delete access') THEN
        CREATE POLICY "Allow admin delete access" ON security_alerts FOR DELETE USING (true);
    END IF;
END $$;

-- Insert sample data (only if table is empty)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM security_alerts) = 0 THEN
        INSERT INTO security_alerts (alert_type, severity, message, user_email, ip_address, metadata) VALUES
        ('LOGIN_ATTEMPT', 'MEDIUM', 'Multiple failed login attempts detected', 'test@example.com', '192.168.1.1', '{"attempts": 5, "timeframe": "5 minutes"}'),
        ('CONFIGURATION_CHANGE', 'HIGH', 'Database schema updated to Phase 4', 'system', '127.0.0.1', '{"phase": 4, "status": "completed"}'),
        ('SECURITY_SCAN', 'LOW', 'Regular security scan completed', 'system', '127.0.0.1', '{"scan_type": "automated", "vulnerabilities": 0}'),
        ('USER_ACCESS', 'MEDIUM', 'New user access granted', 'admin@example.com', '192.168.1.100', '{"user": "newuser@example.com", "permissions": ["dashboard", "reports"]}'),
        ('SYSTEM_ALERT', 'CRITICAL', 'High CPU usage detected', 'system', '127.0.0.1', '{"cpu_usage": 95, "threshold": 80}');
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON security_alerts TO authenticated;
GRANT ALL ON security_alerts TO anon;
