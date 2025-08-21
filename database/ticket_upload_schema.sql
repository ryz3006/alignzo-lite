-- =====================================================
-- TICKET UPLOAD SCHEMA
-- =====================================================
-- This file contains the database schema for ticket upload functionality
-- 
-- IMPORTANT: This schema is designed for FIRST-TIME INSTALLATIONS only.
-- If you need to update an existing database, use the migration scripts instead.
-- 
-- This schema will:
-- 1. Create all necessary tables with proper indexes and constraints
-- 2. Set up Row Level Security (RLS) policies
-- 3. Create triggers for automatic timestamp updates
-- 4. Insert initial ticket source data
-- 5. Add table comments for documentation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TICKET UPLOAD TABLES
-- =====================================================

-- Ticket sources table (Remedy, ServiceNow, etc.)
CREATE TABLE IF NOT EXISTS ticket_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket upload mappings table
CREATE TABLE IF NOT EXISTS ticket_upload_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    source_organization_field VARCHAR(255) NOT NULL, -- e.g., "Assigned_Support_Organization"
    source_organization_value VARCHAR(500) NOT NULL, -- e.g., "IT Support Team A"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_id, project_id, source_organization_value)
);

-- Ticket upload user mappings table
CREATE TABLE IF NOT EXISTS ticket_upload_user_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mapping_id UUID REFERENCES ticket_upload_mappings(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    source_assignee_field VARCHAR(255) NOT NULL, -- e.g., "Assignee"
    source_assignee_value VARCHAR(500) NOT NULL, -- e.g., "john.doe@company.com"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mapping_id, user_email, source_assignee_value)
);

-- Uploaded tickets table
CREATE TABLE IF NOT EXISTS uploaded_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE,
    mapping_id UUID REFERENCES ticket_upload_mappings(id) ON DELETE CASCADE,
    incident_id VARCHAR(255) NOT NULL UNIQUE,
    priority VARCHAR(50),
    region VARCHAR(255),
    assigned_support_organization VARCHAR(500),
    assigned_group VARCHAR(500),
    vertical VARCHAR(255),
    sub_vertical VARCHAR(255),
    owner_support_organization VARCHAR(500),
    owner_group VARCHAR(500),
    owner VARCHAR(255),
    reported_source VARCHAR(255),
    user_name VARCHAR(255),
    site_group VARCHAR(255),
    operational_category_tier_1 VARCHAR(255),
    operational_category_tier_2 VARCHAR(255),
    operational_category_tier_3 VARCHAR(255),
    product_name VARCHAR(255),
    product_categorization_tier_1 VARCHAR(255),
    product_categorization_tier_2 VARCHAR(255),
    product_categorization_tier_3 VARCHAR(255),
    incident_type VARCHAR(255),
    summary TEXT,
    assignee VARCHAR(255),
    mapped_user_email VARCHAR(255), -- Mapped user email from master mappings or project mappings
    reported_date1 TIMESTAMP WITH TIME ZONE,
    responded_date TIMESTAMP WITH TIME ZONE,
    last_resolved_date TIMESTAMP WITH TIME ZONE,
    closed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(100),
    status_reason_hidden TEXT,
    pending_reason TEXT,
    group_transfers INTEGER,
    total_transfers INTEGER,
    department VARCHAR(255),
    vip BOOLEAN,
    company VARCHAR(255),
    vendor_ticket_number VARCHAR(255),
    reported_to_vendor BOOLEAN,
    resolution TEXT,
    resolver_group VARCHAR(500),
    reopen_count INTEGER,
    reopened_date TIMESTAMP WITH TIME ZONE,
    service_desk_1st_assigned_date TIMESTAMP WITH TIME ZONE,
    service_desk_1st_assigned_group VARCHAR(500),
    submitter VARCHAR(255),
    owner_login_id VARCHAR(255),
    impact VARCHAR(100),
    submit_date TIMESTAMP WITH TIME ZONE,
    report_date TIMESTAMP WITH TIME ZONE,
    vil_function VARCHAR(255),
    it_partner VARCHAR(255),
    mttr DECIMAL(10,2),
    mtti DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload sessions table for tracking upload progress
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master mapping table for centralized user mappings (similar to JIRA integrations)
CREATE TABLE IF NOT EXISTS ticket_master_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE,
    source_assignee_value VARCHAR(500) NOT NULL, -- e.g., "john.doe@company.com"
    mapped_user_email VARCHAR(255) NOT NULL, -- e.g., "john.doe@alignzo.com"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_id, source_assignee_value)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Ticket source indexes
CREATE INDEX IF NOT EXISTS idx_ticket_sources_name ON ticket_sources(name);

-- Mapping indexes
CREATE INDEX IF NOT EXISTS idx_ticket_upload_mappings_source_id ON ticket_upload_mappings(source_id);
CREATE INDEX IF NOT EXISTS idx_ticket_upload_mappings_project_id ON ticket_upload_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_upload_mappings_organization_value ON ticket_upload_mappings(source_organization_value);

-- User mapping indexes
CREATE INDEX IF NOT EXISTS idx_ticket_upload_user_mappings_mapping_id ON ticket_upload_user_mappings(mapping_id);
CREATE INDEX IF NOT EXISTS idx_ticket_upload_user_mappings_user_email ON ticket_upload_user_mappings(user_email);
CREATE INDEX IF NOT EXISTS idx_ticket_upload_user_mappings_assignee_value ON ticket_upload_user_mappings(source_assignee_value);

-- Uploaded tickets indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_source_id ON uploaded_tickets(source_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_mapping_id ON uploaded_tickets(mapping_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_incident_id ON uploaded_tickets(incident_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_assignee ON uploaded_tickets(assignee);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_mapped_user_email ON uploaded_tickets(mapped_user_email);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_reported_date ON uploaded_tickets(reported_date1);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_status ON uploaded_tickets(status);

-- Upload sessions indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_email ON upload_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at);

-- Master mapping indexes
CREATE INDEX IF NOT EXISTS idx_ticket_master_mappings_source_id ON ticket_master_mappings(source_id);
CREATE INDEX IF NOT EXISTS idx_ticket_master_mappings_assignee_value ON ticket_master_mappings(source_assignee_value);
CREATE INDEX IF NOT EXISTS idx_ticket_master_mappings_user_email ON ticket_master_mappings(mapped_user_email);
CREATE INDEX IF NOT EXISTS idx_ticket_master_mappings_active ON ticket_master_mappings(is_active);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Note: Unique constraints are already defined in the table creation statements above
-- The UNIQUE constraints in CREATE TABLE statements handle this automatically

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ticket upload table triggers
CREATE TRIGGER update_ticket_sources_updated_at BEFORE UPDATE ON ticket_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_upload_mappings_updated_at BEFORE UPDATE ON ticket_upload_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_upload_user_mappings_updated_at BEFORE UPDATE ON ticket_upload_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploaded_tickets_updated_at BEFORE UPDATE ON uploaded_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_upload_sessions_updated_at BEFORE UPDATE ON upload_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_master_mappings_updated_at BEFORE UPDATE ON ticket_master_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ticket_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upload_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upload_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_master_mappings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Ticket sources policies (public access)
CREATE POLICY "Allow public read access" ON ticket_sources FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_sources FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_sources FOR DELETE USING (true);

-- Mapping policies (public access for now)
CREATE POLICY "Allow public read access" ON ticket_upload_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_upload_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_upload_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_upload_mappings FOR DELETE USING (true);

-- User mapping policies (public access for now)
CREATE POLICY "Allow public read access" ON ticket_upload_user_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_upload_user_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_upload_user_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_upload_user_mappings FOR DELETE USING (true);

-- Uploaded tickets policies (public access for now)
CREATE POLICY "Allow public read access" ON uploaded_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON uploaded_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON uploaded_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON uploaded_tickets FOR DELETE USING (true);

-- Upload sessions policies (public access for now)
CREATE POLICY "Allow public read access" ON upload_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON upload_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON upload_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON upload_sessions FOR DELETE USING (true);

-- Master mapping policies (public access for now)
CREATE POLICY "Allow public read access" ON ticket_master_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_master_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_master_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_master_mappings FOR DELETE USING (true);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default ticket sources
INSERT INTO ticket_sources (name, description) VALUES 
('Remedy', 'BMC Remedy ITSM ticketing system')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE ticket_sources IS 'Supported ticket system sources for data upload';
COMMENT ON TABLE ticket_upload_mappings IS 'Maps source organization fields to dashboard projects';
COMMENT ON TABLE ticket_upload_user_mappings IS 'Maps source assignee fields to dashboard users';
COMMENT ON TABLE uploaded_tickets IS 'Uploaded ticket data from external systems';
COMMENT ON TABLE upload_sessions IS 'Tracks upload progress and status';
COMMENT ON TABLE ticket_master_mappings IS 'Centralized user mappings for all ticket sources (similar to JIRA integrations)';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- All tables, indexes, constraints, triggers, and RLS policies have been created
-- The database is now ready for ticket upload functionality
-- 
-- NEXT STEPS:
-- 1. Access the upload page at /alignzo/upload-tickets
-- 2. Configure your first source mapping
-- 3. Upload your first ticket dump file
-- 4. Monitor upload progress and review results
