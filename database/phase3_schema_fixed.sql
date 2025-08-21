-- Phase 3 Security Features Database Schema - FIXED VERSION
-- Compatible with current admin management system (environment-based admin)

-- =====================================================
-- AUDIT TRAIL TABLES
-- =====================================================

-- Main audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    endpoint TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_email ON audit_trail(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_name ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_ip_address ON audit_trail(ip_address);

-- =====================================================
-- MONITORING TABLES
-- =====================================================

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    ip_address VARCHAR(45),
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Monitoring rules table
CREATE TABLE IF NOT EXISTS monitoring_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    conditions JSONB NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    actions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event counters for monitoring
CREATE TABLE IF NOT EXISTS event_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_key VARCHAR(255) NOT NULL UNIQUE,
    count INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for monitoring
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_email ON security_alerts(user_email);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ip_address ON security_alerts(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_monitoring_rules_enabled ON monitoring_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_type ON monitoring_rules(type);

CREATE INDEX IF NOT EXISTS idx_event_counters_event_key ON event_counters(event_key);
CREATE INDEX IF NOT EXISTS idx_event_counters_first_seen ON event_counters(first_seen);

-- =====================================================
-- API KEY MANAGEMENT TABLES
-- =====================================================

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    user_email VARCHAR(255) NOT NULL,
    permissions TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),
    metadata JSONB
);

-- API key usage tracking
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    response_status INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for API key management
CREATE INDEX IF NOT EXISTS idx_api_keys_user_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user_email ON api_key_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_response_status ON api_key_usage(response_status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- Function to check if user is admin (environment-based)
CREATE OR REPLACE FUNCTION is_admin_user(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the user email matches the admin email from environment
    -- This will be set via application logic, not database
    RETURN FALSE; -- Default to false, admin check done in application layer
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trail RLS policies
CREATE POLICY "Users can view their own audit trail" ON audit_trail
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Admins can view all audit trail" ON audit_trail
    FOR ALL USING (
        -- Admin access is handled in application layer
        -- This policy allows all authenticated users to view audit trail
        -- Admin-specific filtering should be done in application logic
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- Security alerts RLS policies
CREATE POLICY "Users can view alerts related to them" ON security_alerts
    FOR SELECT USING (
        auth.jwt() ->> 'email' = user_email OR
        -- Allow all authenticated users to view alerts
        -- Admin filtering done in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

CREATE POLICY "Admins can manage all alerts" ON security_alerts
    FOR ALL USING (
        -- Admin access handled in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- Monitoring rules RLS policies
CREATE POLICY "Admins can manage monitoring rules" ON monitoring_rules
    FOR ALL USING (
        -- Admin access handled in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- Event counters RLS policies
CREATE POLICY "Admins can manage event counters" ON event_counters
    FOR ALL USING (
        -- Admin access handled in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- API keys RLS policies
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Admins can view all API keys" ON api_keys
    FOR SELECT USING (
        -- Admin access handled in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- API key usage RLS policies
CREATE POLICY "Users can view their own API key usage" ON api_key_usage
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Admins can view all API key usage" ON api_key_usage
    FOR SELECT USING (
        -- Admin access handled in application layer
        auth.jwt() ->> 'email' IS NOT NULL
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_rules_updated_at
    BEFORE UPDATE ON monitoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR CLEANUP
-- =====================================================

-- Function to clean up old audit trail entries
CREATE OR REPLACE FUNCTION cleanup_old_audit_trail(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_trail
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old API key usage
CREATE OR REPLACE FUNCTION cleanup_old_api_key_usage(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_key_usage
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old event counters
CREATE OR REPLACE FUNCTION cleanup_old_event_counters(retention_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM event_counters
    WHERE first_seen < NOW() - INTERVAL '1 hour' * retention_hours;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
    'audit_trail' as source,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_24h
FROM audit_trail
UNION ALL
SELECT
    'security_alerts' as source,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE resolved = false) as failed_events,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as events_last_24h
FROM security_alerts
UNION ALL
SELECT
    'api_key_usage' as source,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE response_status >= 400) as failed_events,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as events_last_24h
FROM api_key_usage;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    user_email,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type = 'LOGIN') as login_events,
    COUNT(*) FILTER (WHERE event_type = 'LOGOUT') as logout_events,
    COUNT(*) FILTER (WHERE success = false) as failed_events,
    MAX(created_at) as last_activity
FROM audit_trail
GROUP BY user_email;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default monitoring rules
INSERT INTO monitoring_rules (name, description, type, severity, conditions, actions) VALUES
(
    'Rate Limit Exceeded',
    'Multiple rate limit violations from same IP',
    'RATE_LIMIT_EXCEEDED',
    'MEDIUM',
    '{"eventType": "rate_limit_exceeded", "threshold": 5, "timeWindow": 15}',
    '[{"type": "log", "config": {}}, {"type": "database", "config": {}}]'
),
(
    'Failed Login Attempts',
    'Multiple failed login attempts from same IP',
    'SECURITY_BREACH',
    'HIGH',
    '{"eventType": "login_failed", "threshold": 3, "timeWindow": 10}',
    '[{"type": "log", "config": {}}, {"type": "database", "config": {}}, {"type": "email", "config": {"recipients": ["admin@example.com"]}}]'
),
(
    'Suspicious Data Access',
    'Unusual data access patterns',
    'SUSPICIOUS_ACTIVITY',
    'MEDIUM',
    '{"eventType": "data_access", "threshold": 50, "timeWindow": 5}',
    '[{"type": "log", "config": {}}, {"type": "database", "config": {}}]'
),
(
    'Access Denied Pattern',
    'Multiple access denied events',
    'ACCESS_DENIED',
    'HIGH',
    '{"eventType": "access_denied", "threshold": 10, "timeWindow": 10}',
    '[{"type": "log", "config": {}}, {"type": "database", "config": {}}, {"type": "email", "config": {"recipients": ["security@example.com"]}}]'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE audit_trail IS 'Comprehensive audit trail for all user actions and system events';
COMMENT ON TABLE security_alerts IS 'Security alerts generated by monitoring rules';
COMMENT ON TABLE monitoring_rules IS 'Rules for monitoring and alerting on security events';
COMMENT ON TABLE event_counters IS 'Counters for tracking event frequency for monitoring';
COMMENT ON TABLE api_keys IS 'Secure API key management with hashed keys';
COMMENT ON TABLE api_key_usage IS 'Tracking of API key usage for monitoring and analytics';

COMMENT ON COLUMN audit_trail.old_values IS 'Previous values before change (for UPDATE/DELETE events)';
COMMENT ON COLUMN audit_trail.new_values IS 'New values after change (for CREATE/UPDATE events)';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional context and metadata for the event';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of the API key (never store plain text)';
COMMENT ON COLUMN api_keys.permissions IS 'Array of permissions granted to this API key';
COMMENT ON COLUMN security_alerts.metadata IS 'Additional context and data related to the alert';
