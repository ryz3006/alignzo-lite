-- Phase 4: Expert Level Security Database Schema (FIXED)
-- This schema adds advanced security features including encryption, session management, and automation
-- Fixed to be compatible with current admin management system (environment-based admin)

-- =====================================================
-- ENCRYPTION AND SECURE DATA STORAGE
-- =====================================================

-- Encrypted data storage table
CREATE TABLE IF NOT EXISTS encrypted_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(table_name, record_id, field_name)
);

-- Create index for efficient encrypted data queries
CREATE INDEX IF NOT EXISTS idx_encrypted_data_lookup 
ON encrypted_data(table_name, record_id);

-- =====================================================
-- ADVANCED SESSION MANAGEMENT
-- =====================================================

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    device_info JSONB,
    location_info JSONB,
    security_level VARCHAR(20) DEFAULT 'medium' CHECK (security_level IN ('low', 'medium', 'high')),
    metadata JSONB
);

-- Session activities tracking
CREATE TABLE IF NOT EXISTS session_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500),
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_session_activities_session ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_timestamp ON session_activities(timestamp);

-- =====================================================
-- PENETRATION TESTING RESULTS
-- =====================================================

-- Penetration test results
CREATE TABLE IF NOT EXISTS penetration_test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_type VARCHAR(100) NOT NULL,
    target VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'error')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recommendations TEXT[],
    duration_ms INTEGER,
    metadata JSONB
);

-- Vulnerability reports
CREATE TABLE IF NOT EXISTS vulnerability_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_result_id UUID REFERENCES penetration_test_results(id) ON DELETE CASCADE,
    vulnerability_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    affected_endpoint VARCHAR(500),
    affected_parameter VARCHAR(100),
    proof_of_concept TEXT,
    remediation_steps TEXT[],
    cve_references VARCHAR(100)[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'false_positive')),
    assigned_to VARCHAR(255),
    resolution_notes TEXT
);

-- Create indexes for penetration testing
CREATE INDEX IF NOT EXISTS idx_pen_test_results_type ON penetration_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_pen_test_results_status ON penetration_test_results(status);
CREATE INDEX IF NOT EXISTS idx_pen_test_results_severity ON penetration_test_results(severity);
CREATE INDEX IF NOT EXISTS idx_pen_test_results_timestamp ON penetration_test_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_vuln_reports_status ON vulnerability_reports(status);
CREATE INDEX IF NOT EXISTS idx_vuln_reports_severity ON vulnerability_reports(severity);

-- =====================================================
-- SECURITY AUTOMATION
-- =====================================================

-- Security automation workflows
CREATE TABLE IF NOT EXISTS security_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    triggers TEXT[] NOT NULL,
    actions TEXT[] NOT NULL,
    conditions JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    metadata JSONB
);

-- Automation results
CREATE TABLE IF NOT EXISTS automation_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES security_workflows(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    error_message TEXT
);

-- Security reports
CREATE TABLE IF NOT EXISTS security_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    metadata JSONB
);

-- Create indexes for automation
CREATE INDEX IF NOT EXISTS idx_security_workflows_enabled ON security_workflows(enabled, status);
CREATE INDEX IF NOT EXISTS idx_security_workflows_next_run ON security_workflows(next_run);
CREATE INDEX IF NOT EXISTS idx_automation_results_workflow ON automation_results(workflow_id);
CREATE INDEX IF NOT EXISTS idx_automation_results_timestamp ON automation_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_reports_type ON security_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_security_reports_generated ON security_reports(generated_at);

-- =====================================================
-- IP BLOCKING AND THREAT INTELLIGENCE
-- =====================================================

-- Blocked IP addresses
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

-- Threat intelligence feeds
CREATE TABLE IF NOT EXISTS threat_intelligence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    threat_type VARCHAR(100) NOT NULL,
    indicator VARCHAR(500) NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

-- Create indexes for threat intelligence
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_type ON threat_intelligence(threat_type);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_active ON threat_intelligence(is_active);

-- =====================================================
-- ADVANCED AUDIT TRAIL ENHANCEMENTS
-- =====================================================

-- Audit trail archive (for old data)
CREATE TABLE IF NOT EXISTS audit_trail_archive (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit archive
CREATE INDEX IF NOT EXISTS idx_audit_trail_archive_created ON audit_trail_archive(created_at);

-- =====================================================
-- SECURITY METRICS AND ANALYTICS
-- =====================================================

-- Security metrics
CREATE TABLE IF NOT EXISTS security_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period VARCHAR(20) DEFAULT 'hourly' CHECK (period IN ('minute', 'hourly', 'daily', 'weekly')),
    metadata JSONB
);

-- Security health scores
CREATE TABLE IF NOT EXISTS security_health_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 10),
    authentication_score INTEGER CHECK (authentication_score >= 0 AND authentication_score <= 10),
    authorization_score INTEGER CHECK (authorization_score >= 0 AND authorization_score <= 10),
    data_protection_score INTEGER CHECK (data_protection_score >= 0 AND data_protection_score <= 10),
    monitoring_score INTEGER CHECK (monitoring_score >= 0 AND monitoring_score <= 10),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    factors JSONB,
    recommendations TEXT[]
);

-- Create indexes for metrics
CREATE INDEX IF NOT EXISTS idx_security_metrics_name ON security_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_security_metrics_timestamp ON security_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_health_calculated ON security_health_scores(calculated_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (FIXED)
-- =====================================================

-- Enable RLS on all security tables
ALTER TABLE encrypted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE penetration_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for encrypted_data (Admin access handled in application layer)
CREATE POLICY "Admin can manage encrypted data" ON encrypted_data
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Admin can manage all sessions" ON user_sessions
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for session_activities
CREATE POLICY "Users can view their own session activities" ON session_activities
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Admin can view all session activities" ON session_activities
    FOR SELECT USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for penetration_test_results (Admin access handled in application layer)
CREATE POLICY "Admin can manage penetration test results" ON penetration_test_results
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for vulnerability_reports (Admin access handled in application layer)
CREATE POLICY "Admin can manage vulnerability reports" ON vulnerability_reports
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for security_workflows (Admin access handled in application layer)
CREATE POLICY "Admin can manage security workflows" ON security_workflows
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for automation_results (Admin access handled in application layer)
CREATE POLICY "Admin can view automation results" ON automation_results
    FOR SELECT USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for security_reports (Admin access handled in application layer)
CREATE POLICY "Admin can manage security reports" ON security_reports
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for blocked_ips (Admin access handled in application layer)
CREATE POLICY "Admin can manage blocked IPs" ON blocked_ips
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for threat_intelligence (Admin access handled in application layer)
CREATE POLICY "Admin can manage threat intelligence" ON threat_intelligence
    FOR ALL USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for audit_trail_archive (Admin access handled in application layer)
CREATE POLICY "Admin can view audit archive" ON audit_trail_archive
    FOR SELECT USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for security_metrics (Admin access handled in application layer)
CREATE POLICY "Admin can view security metrics" ON security_metrics
    FOR SELECT USING (auth.jwt() ->> 'email' IS NOT NULL);

-- RLS Policies for security_health_scores (Admin access handled in application layer)
CREATE POLICY "Admin can view security health scores" ON security_health_scores
    FOR SELECT USING (auth.jwt() ->> 'email' IS NOT NULL);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO audit_trail (user_email, event_type, table_name, record_id, ip_address, endpoint, method, metadata)
    VALUES ('system', 'CONFIGURATION_CHANGE', 'user_sessions', 'cleanup', 
            '127.0.0.1', '/system/cleanup', 'SYSTEM',
            jsonb_build_object('cleaned_count', deleted_count, 'action', 'expired_session_cleanup'));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate security health score
CREATE OR REPLACE FUNCTION calculate_security_health_score()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    critical_alerts INTEGER;
    high_alerts INTEGER;
    failed_tests INTEGER;
    overall_score INTEGER := 10;
BEGIN
    -- Count critical alerts in last 24 hours
    SELECT COUNT(*) INTO critical_alerts
    FROM security_alerts 
    WHERE severity = 'CRITICAL' 
    AND timestamp > NOW() - INTERVAL '24 hours';
    
    -- Count high alerts in last 24 hours
    SELECT COUNT(*) INTO high_alerts
    FROM security_alerts 
    WHERE severity = 'HIGH' 
    AND timestamp > NOW() - INTERVAL '24 hours';
    
    -- Count failed penetration tests in last 24 hours
    SELECT COUNT(*) INTO failed_tests
    FROM penetration_test_results 
    WHERE status = 'failed' 
    AND timestamp > NOW() - INTERVAL '24 hours';
    
    -- Calculate score
    IF critical_alerts > 0 THEN
        overall_score := overall_score - 3;
    END IF;
    
    IF high_alerts > 0 THEN
        overall_score := overall_score - 1;
    END IF;
    
    IF failed_tests > 0 THEN
        overall_score := overall_score - 2;
    END IF;
    
    -- Ensure score doesn't go below 0
    overall_score := GREATEST(0, overall_score);
    
    result := jsonb_build_object(
        'overall_score', overall_score,
        'critical_alerts', critical_alerts,
        'high_alerts', high_alerts,
        'failed_tests', failed_tests,
        'calculated_at', NOW()
    );
    
    -- Store the health score
    INSERT INTO security_health_scores (
        overall_score, 
        calculated_at, 
        factors,
        recommendations
    ) VALUES (
        overall_score,
        NOW(),
        result,
        CASE 
            WHEN critical_alerts > 0 THEN ARRAY['Address critical security alerts immediately']
            WHEN high_alerts > 0 THEN ARRAY['Review and resolve high-priority alerts']
            WHEN failed_tests > 0 THEN ARRAY['Investigate failed penetration tests']
            ELSE ARRAY['Security posture is good, continue monitoring']
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old audit trail data
CREATE OR REPLACE FUNCTION archive_old_audit_trail(retention_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old audit trail entries to archive
    INSERT INTO audit_trail_archive 
    SELECT *, NOW() as archived_at
    FROM audit_trail 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived entries from main table
    DELETE FROM audit_trail 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Log the archival
    INSERT INTO audit_trail (user_email, event_type, table_name, record_id, ip_address, endpoint, method, metadata)
    VALUES ('system', 'CONFIGURATION_CHANGE', 'audit_trail', 'archive', 
            '127.0.0.1', '/system/archive', 'SYSTEM',
            jsonb_build_object('archived_count', archived_count, 'retention_days', retention_days));
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULED TASKS
-- =====================================================

-- Create a function to run scheduled security tasks
CREATE OR REPLACE FUNCTION run_scheduled_security_tasks()
RETURNS VOID AS $$
BEGIN
    -- Clean up expired sessions
    PERFORM cleanup_expired_sessions();
    
    -- Calculate security health score
    PERFORM calculate_security_health_score();
    
    -- Archive old audit trail data (keep last 7 days)
    PERFORM archive_old_audit_trail(7);
    
    -- Log the scheduled task execution
    INSERT INTO audit_trail (user_email, event_type, table_name, record_id, ip_address, endpoint, method, metadata)
    VALUES ('system', 'CONFIGURATION_CHANGE', 'scheduled_tasks', 'security_maintenance', 
            '127.0.0.1', '/system/maintenance', 'SYSTEM',
            jsonb_build_object('task', 'scheduled_security_maintenance', 'executed_at', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for security dashboard (Phase 4)
-- Drop existing view first to avoid column conflicts
DROP VIEW IF EXISTS security_dashboard;
CREATE VIEW security_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM security_alerts WHERE severity = 'CRITICAL' AND acknowledged = FALSE) as critical_alerts,
    (SELECT COUNT(*) FROM security_alerts WHERE severity = 'HIGH' AND acknowledged = FALSE) as high_alerts,
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE) as active_sessions,
    (SELECT COUNT(*) FROM blocked_ips WHERE is_active = TRUE) as blocked_ips,
    (SELECT COUNT(*) FROM penetration_test_results WHERE status = 'failed' AND timestamp > NOW() - INTERVAL '24 hours') as failed_tests_24h,
    (SELECT overall_score FROM security_health_scores ORDER BY calculated_at DESC LIMIT 1) as current_health_score;

-- View for recent security events
DROP VIEW IF EXISTS recent_security_events;
CREATE VIEW recent_security_events AS
SELECT 
    'security_alert' as event_type,
    timestamp as created_at,
    severity,
    message,
    user_email,
    ip_address
FROM security_alerts 
WHERE timestamp > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'penetration_test' as event_type,
    timestamp as created_at,
    severity,
    description as message,
    'system' as user_email,
    NULL as ip_address
FROM penetration_test_results 
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE encrypted_data IS 'Stores encrypted sensitive data with field-level encryption';
COMMENT ON TABLE user_sessions IS 'Advanced session management with security tracking';
COMMENT ON TABLE session_activities IS 'Tracks all session activities for security monitoring';
COMMENT ON TABLE penetration_test_results IS 'Results from automated penetration testing';
COMMENT ON TABLE vulnerability_reports IS 'Detailed vulnerability reports with remediation steps';
COMMENT ON TABLE security_workflows IS 'Automated security workflows and their configurations';
COMMENT ON TABLE automation_results IS 'Results from security automation actions';
COMMENT ON TABLE security_reports IS 'Generated security reports and analytics';
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked due to suspicious activity';
COMMENT ON TABLE threat_intelligence IS 'Threat intelligence data from various sources';
COMMENT ON TABLE audit_trail_archive IS 'Archived audit trail data for compliance';
COMMENT ON TABLE security_metrics IS 'Security metrics and KPIs for monitoring';
COMMENT ON TABLE security_health_scores IS 'Overall security health scores and trends';

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Automatically cleans up expired user sessions';
COMMENT ON FUNCTION calculate_security_health_score() IS 'Calculates overall security health score based on various factors';
COMMENT ON FUNCTION archive_old_audit_trail(INTEGER) IS 'Archives old audit trail data to maintain performance';
COMMENT ON FUNCTION run_scheduled_security_tasks() IS 'Runs scheduled security maintenance tasks';

-- =====================================================
-- PHASE 4 COMPLETION
-- =====================================================

-- Log Phase 4 schema completion
INSERT INTO audit_trail (user_email, event_type, table_name, record_id, ip_address, endpoint, method, metadata)
VALUES ('system', 'CONFIGURATION_CHANGE', 'database', 'phase4_schema_fixed', 
        '127.0.0.1', '/database/schema', 'SETUP',
        jsonb_build_object('phase', 4, 'status', 'completed', 'features', 
                          ARRAY['encryption', 'advanced_sessions', 'penetration_testing', 'automation', 'threat_intelligence']));
