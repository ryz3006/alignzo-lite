-- =====================================================
-- ALIGNZO LITE - MASTER DATABASE SCHEMA (GREENFIELD DEPLOYMENT)
-- =====================================================
-- This file contains the complete database schema for the Alignzo Lite application
-- Run this file in your Supabase SQL Editor to set up the entire database
-- 
-- This master schema includes:
-- 1. Core application tables (users, teams, projects, etc.)
-- 2. Work tracking tables (work_logs, timers)
-- 3. Kanban board functionality
-- 4. Integration tables (JIRA mappings, user integrations)
-- 5. Ticket upload functionality tables
-- 6. Shift schedule management
-- 7. Advanced security features (audit trail, security alerts)
-- 8. Enhanced category system with table-based options
-- 9. All necessary indexes, constraints, triggers, and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    access_dashboard BOOLEAN DEFAULT TRUE,
    access_work_report BOOLEAN DEFAULT FALSE,
    access_analytics BOOLEAN DEFAULT FALSE,
    access_analytics_workload BOOLEAN DEFAULT FALSE,
    access_analytics_project_health BOOLEAN DEFAULT FALSE,
    access_analytics_tickets BOOLEAN DEFAULT FALSE,
    access_analytics_operational BOOLEAN DEFAULT FALSE,
    access_analytics_team_insights BOOLEAN DEFAULT FALSE,
    access_analytics_remedy BOOLEAN DEFAULT FALSE,
    access_upload_tickets BOOLEAN DEFAULT FALSE,
    access_master_mappings BOOLEAN DEFAULT FALSE,
    access_integrations BOOLEAN DEFAULT FALSE,
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

-- Team-Project Assignment table
CREATE TABLE IF NOT EXISTS team_project_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, project_id)
);

-- =====================================================
-- ENHANCED CATEGORY SYSTEM
-- =====================================================

-- Project categories table (for dynamic categorization)
CREATE TABLE IF NOT EXISTS project_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Project subcategories table
CREATE TABLE IF NOT EXISTS project_subcategories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Category options table to store individual options for each category
CREATE TABLE IF NOT EXISTS category_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, option_value)
);

-- Subcategory options table to store individual options for each subcategory
CREATE TABLE IF NOT EXISTS subcategory_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    option_name VARCHAR(255) NOT NULL,
    option_value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subcategory_id, option_value)
);

-- =====================================================
-- WORK TRACKING TABLES
-- =====================================================

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

-- Work log category selections table
CREATE TABLE IF NOT EXISTS work_log_category_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    work_log_id UUID REFERENCES work_logs(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    selected_suboption_id UUID REFERENCES subcategory_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timer category selections table
CREATE TABLE IF NOT EXISTS timer_category_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    selected_suboption_id UUID REFERENCES subcategory_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- KANBAN BOARD TABLES
-- =====================================================

-- Kanban board columns (status columns)
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., 'To Do', 'In Progress', 'Review', 'Done'
    description TEXT,
    color VARCHAR(7) DEFAULT '#10B981', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Kanban tasks table
CREATE TABLE IF NOT EXISTS kanban_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
    category_option_id UUID REFERENCES category_options(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date TIMESTAMP WITH TIME ZONE,
    jira_ticket_id VARCHAR(255), -- Link to JIRA ticket
    jira_ticket_key VARCHAR(50), -- JIRA ticket key (e.g., PROJ-123)
    scope VARCHAR(20) DEFAULT 'project', -- 'personal' or 'project'
    created_by VARCHAR(255) NOT NULL, -- User email who created the task
    assigned_to VARCHAR(255), -- User email who is assigned to the task
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    sort_order INTEGER DEFAULT 0, -- For ordering within a column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task category mappings table (for multiple categories per task)
CREATE TABLE IF NOT EXISTS task_category_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    category_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, category_id)
);

-- Task assignments table (for tracking assignment history)
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) NOT NULL, -- User email
    assigned_by VARCHAR(255) NOT NULL, -- User email who made the assignment
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Task timeline table (for tracking all actions)
CREATE TABLE IF NOT EXISTS task_timeline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL, -- User who performed the action
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'assigned', 'moved', 'commented', 'linked_jira', etc.
    details JSONB, -- Additional details about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL, -- User who made the comment
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL, -- User who uploaded the attachment
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

-- User integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'jira', 'slack', etc.
    base_url VARCHAR(500),
    user_email_integration VARCHAR(255),
    api_token TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, integration_type)
);

-- JIRA User Mappings table
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

-- JIRA Project Mappings table
CREATE TABLE IF NOT EXISTS jira_project_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dashboard_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    jira_project_key VARCHAR(255) NOT NULL,
    jira_project_name VARCHAR(500),
    integration_user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Uploaded tickets table - UPDATED FOR BETTER CSV HANDLING
CREATE TABLE IF NOT EXISTS uploaded_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES ticket_sources(id) ON DELETE CASCADE,
    mapping_id UUID REFERENCES ticket_upload_mappings(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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
    group_transfers VARCHAR(50), -- Changed to VARCHAR(50) to handle empty values and larger numbers
    total_transfers VARCHAR(50), -- Changed to VARCHAR(50) to handle empty values and larger numbers
    department VARCHAR(255),
    vip VARCHAR(10), -- Changed to VARCHAR(10) to handle "Yes"/"No" values and empty strings
    company VARCHAR(255),
    vendor_ticket_number VARCHAR(255),
    reported_to_vendor VARCHAR(10), -- Changed to VARCHAR(10) to handle "Yes"/"No" values and empty strings
    resolution TEXT,
    resolver_group VARCHAR(500),
    reopen_count VARCHAR(50), -- Changed to VARCHAR(50) to handle empty values and larger numbers
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
    mttr VARCHAR(50), -- Time format like "02:58:25" - keep original format
    mtti VARCHAR(50), -- Time format like "02:58:25" - keep original format
    mttr_seconds INTEGER, -- Converted to seconds for calculations
    mtti_seconds INTEGER, -- Converted to seconds for calculations
    mttr_minutes DECIMAL(10,2), -- Converted to minutes for reporting
    mtti_minutes DECIMAL(10,2), -- Converted to minutes for reporting
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
-- SHIFT SCHEDULE TABLES
-- =====================================================

-- Shift types enum (default)
CREATE TYPE shift_type AS ENUM ('M', 'A', 'N', 'G', 'H', 'L', 'E');

-- Custom shift enums table for project-team specific shift definitions
CREATE TABLE IF NOT EXISTS custom_shift_enums (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    shift_identifier VARCHAR(10) NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, team_id, shift_identifier)
);

-- Shift schedules table
CREATE TABLE IF NOT EXISTS shift_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    shift_date DATE NOT NULL,
    shift_type shift_type NOT NULL DEFAULT 'G',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, team_id, user_email, shift_date)
);

-- =====================================================
-- SECURITY & AUDIT TRAIL TABLES
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

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
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

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_id ON team_project_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_project_assignments_project_id ON team_project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);

-- Category system indexes
CREATE INDEX IF NOT EXISTS idx_project_subcategories_category_id ON project_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_category_options_category_id ON category_options(category_id);
CREATE INDEX IF NOT EXISTS idx_category_options_sort_order ON category_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_subcategory_options_subcategory_id ON subcategory_options(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subcategory_options_sort_order ON subcategory_options(sort_order);

-- Work tracking indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_user_email ON work_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_work_logs_project_id ON work_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_timers_user_email ON timers(user_email);
CREATE INDEX IF NOT EXISTS idx_timers_is_running ON timers(is_running);

-- Category selections indexes
CREATE INDEX IF NOT EXISTS idx_work_log_category_selections_work_log_id ON work_log_category_selections(work_log_id);
CREATE INDEX IF NOT EXISTS idx_work_log_category_selections_category_id ON work_log_category_selections(category_id);
CREATE INDEX IF NOT EXISTS idx_timer_category_selections_timer_id ON timer_category_selections(timer_id);
CREATE INDEX IF NOT EXISTS idx_timer_category_selections_category_id ON timer_category_selections(category_id);

-- Kanban board indexes
CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_id ON kanban_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_to ON kanban_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_created_by ON kanban_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_email ON user_integrations(user_email);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);

-- JIRA mapping indexes
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_integration_user ON jira_user_mappings(integration_user_email);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_user_email ON jira_user_mappings(user_email);
CREATE INDEX IF NOT EXISTS idx_jira_user_mappings_project_key ON jira_user_mappings(jira_project_key);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_dashboard_project ON jira_project_mappings(dashboard_project_id);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_integration_user ON jira_project_mappings(integration_user_email);
CREATE INDEX IF NOT EXISTS idx_jira_project_mappings_jira_project ON jira_project_mappings(jira_project_key);

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
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_project_id ON uploaded_tickets(project_id);
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

-- Shift schedule indexes
CREATE INDEX IF NOT EXISTS idx_shift_schedules_project_id ON shift_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_team_id ON shift_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_user_email ON shift_schedules(user_email);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_shift_date ON shift_schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_project_team_date ON shift_schedules(project_id, team_id, shift_date);

-- Custom shift enums indexes
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_project_id ON custom_shift_enums(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_team_id ON custom_shift_enums(team_id);
CREATE INDEX IF NOT EXISTS idx_custom_shift_enums_project_team ON custom_shift_enums(project_id, team_id);

-- Security and audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_email ON audit_trail(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_name ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_ip_address ON audit_trail(ip_address);

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

CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_session_activities_session ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_timestamp ON session_activities(timestamp);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- JIRA User Mappings unique constraint
ALTER TABLE jira_user_mappings 
ADD CONSTRAINT IF NOT EXISTS unique_user_project_integration 
UNIQUE (user_email, jira_project_key, integration_user_email);

-- JIRA Project Mappings unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_jira_project_mappings_unique 
ON jira_project_mappings(dashboard_project_id, jira_project_key, integration_user_email);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Core table triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_project_assignments_updated_at BEFORE UPDATE ON team_project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_subcategories_updated_at BEFORE UPDATE ON project_subcategories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_category_options_updated_at BEFORE UPDATE ON category_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subcategory_options_updated_at BEFORE UPDATE ON subcategory_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Work tracking triggers
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timers_updated_at BEFORE UPDATE ON timers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Kanban board triggers
CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON kanban_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kanban_tasks_updated_at BEFORE UPDATE ON kanban_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Integration triggers
CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON user_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jira_user_mappings_updated_at BEFORE UPDATE ON jira_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jira_project_mappings_updated_at BEFORE UPDATE ON jira_project_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ticket upload table triggers
CREATE TRIGGER update_ticket_sources_updated_at BEFORE UPDATE ON ticket_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_upload_mappings_updated_at BEFORE UPDATE ON ticket_upload_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_upload_user_mappings_updated_at BEFORE UPDATE ON ticket_upload_user_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploaded_tickets_updated_at BEFORE UPDATE ON uploaded_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_upload_sessions_updated_at BEFORE UPDATE ON upload_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_master_mappings_updated_at BEFORE UPDATE ON ticket_master_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Shift schedule triggers
CREATE TRIGGER update_shift_schedules_updated_at BEFORE UPDATE ON shift_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_shift_enums_updated_at BEFORE UPDATE ON custom_shift_enums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security and monitoring triggers
CREATE TRIGGER update_monitoring_rules_updated_at BEFORE UPDATE ON monitoring_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategory_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_log_category_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_category_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_project_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upload_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_upload_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_master_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_shift_enums ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Core table policies (public access for now, auth handled in app layer)
CREATE POLICY "Allow public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_project_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON project_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON project_subcategories FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON category_options FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON subcategory_options FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON team_project_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON project_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON project_subcategories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON category_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON subcategory_options FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON team_project_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON project_categories FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON project_subcategories FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON category_options FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON subcategory_options FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON users FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON teams FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON team_members FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON projects FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON team_project_assignments FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON project_categories FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON project_subcategories FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON category_options FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON subcategory_options FOR DELETE USING (true);

-- Work tracking policies
CREATE POLICY "Allow public read access" ON work_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON timers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON work_log_category_selections FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON timer_category_selections FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON work_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON timers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON work_log_category_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON timer_category_selections FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON work_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON timers FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON work_log_category_selections FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON timer_category_selections FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON work_logs FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON timers FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON work_log_category_selections FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON timer_category_selections FOR DELETE USING (true);

-- Kanban board policies
CREATE POLICY "Allow public read access" ON kanban_columns FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON kanban_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON task_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON task_timeline FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON task_comments FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON task_attachments FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON kanban_columns FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON kanban_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON task_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON task_timeline FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON task_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON task_attachments FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON kanban_columns FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON kanban_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON task_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON task_timeline FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON task_comments FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON task_attachments FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON kanban_columns FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON kanban_tasks FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON task_assignments FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON task_timeline FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON task_comments FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON task_attachments FOR DELETE USING (true);

-- Integration policies
CREATE POLICY "Allow public read access" ON user_integrations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON user_integrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON user_integrations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON user_integrations FOR DELETE USING (true);

-- JIRA mapping policies (simplified for API routes)
CREATE POLICY "Users can view their own mappings" ON jira_user_mappings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own mappings" ON jira_user_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own mappings" ON jira_user_mappings FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own mappings" ON jira_user_mappings FOR DELETE USING (true);

CREATE POLICY "Users can view their own project mappings" ON jira_project_mappings FOR SELECT USING (true);
CREATE POLICY "Users can create project mappings" ON jira_project_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own project mappings" ON jira_project_mappings FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own project mappings" ON jira_project_mappings FOR DELETE USING (true);

-- Ticket upload policies (public access for now)
CREATE POLICY "Allow public read access" ON ticket_sources FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_sources FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_sources FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON ticket_upload_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_upload_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_upload_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_upload_mappings FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON ticket_upload_user_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_upload_user_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_upload_user_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_upload_user_mappings FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON uploaded_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON uploaded_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON uploaded_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON uploaded_tickets FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON upload_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON upload_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON upload_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON upload_sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON ticket_master_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ticket_master_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ticket_master_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ticket_master_mappings FOR DELETE USING (true);

-- Shift schedule policies
CREATE POLICY "shift_schedules_select_policy" ON shift_schedules FOR SELECT USING (true);
CREATE POLICY "shift_schedules_insert_policy" ON shift_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "shift_schedules_update_policy" ON shift_schedules FOR UPDATE USING (true);
CREATE POLICY "shift_schedules_delete_policy" ON shift_schedules FOR DELETE USING (true);

-- Custom shift enums policies
CREATE POLICY "custom_shift_enums_select_policy" ON custom_shift_enums FOR SELECT USING (true);
CREATE POLICY "custom_shift_enums_insert_policy" ON custom_shift_enums FOR INSERT WITH CHECK (true);
CREATE POLICY "custom_shift_enums_update_policy" ON custom_shift_enums FOR UPDATE USING (true);
CREATE POLICY "custom_shift_enums_delete_policy" ON custom_shift_enums FOR DELETE USING (true);

-- Security and audit policies
CREATE POLICY "Allow all audit trail access" ON audit_trail FOR ALL USING (true);
CREATE POLICY "Allow all security alerts access" ON security_alerts FOR ALL USING (true);
CREATE POLICY "Allow all monitoring rules access" ON monitoring_rules FOR ALL USING (true);
CREATE POLICY "Allow all event counters access" ON event_counters FOR ALL USING (true);
CREATE POLICY "Allow all user sessions access" ON user_sessions FOR ALL USING (true);
CREATE POLICY "Allow all session activities access" ON session_activities FOR ALL USING (true);

-- =====================================================
-- SHIFT SCHEDULE FUNCTIONS
-- =====================================================

-- Function to get shift schedule for a specific project, team, and month
CREATE OR REPLACE FUNCTION get_shift_schedule(
    p_project_id UUID,
    p_team_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    user_email VARCHAR(255),
    shift_date DATE,
    shift_type shift_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.user_email,
        ss.shift_date,
        ss.shift_type
    FROM shift_schedules ss
    WHERE ss.project_id = p_project_id
      AND ss.team_id = p_team_id
      AND EXTRACT(YEAR FROM ss.shift_date) = p_year
      AND EXTRACT(MONTH FROM ss.shift_date) = p_month
    ORDER BY ss.user_email, ss.shift_date;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk insert/update shift schedules
CREATE OR REPLACE FUNCTION upsert_shift_schedules(
    p_project_id UUID,
    p_team_id UUID,
    p_user_email VARCHAR(255),
    p_shift_date DATE,
    p_shift_type shift_type
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO shift_schedules (project_id, team_id, user_email, shift_date, shift_type)
    VALUES (p_project_id, p_team_id, p_user_email, p_shift_date, p_shift_type)
    ON CONFLICT (project_id, team_id, user_email, shift_date)
    DO UPDATE SET 
        shift_type = EXCLUDED.shift_type,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to bulk upsert shift schedules from JSON array
CREATE OR REPLACE FUNCTION upsert_shift_schedules_bulk(
    shift_data JSONB
)
RETURNS VOID AS $$
DECLARE
    shift_record JSONB;
BEGIN
    -- Loop through each shift record in the JSON array
    FOR shift_record IN SELECT * FROM jsonb_array_elements(shift_data)
    LOOP
        INSERT INTO shift_schedules (
            project_id, 
            team_id, 
            user_email, 
            shift_date, 
            shift_type
        )
        VALUES (
            (shift_record->>'project_id')::UUID,
            (shift_record->>'team_id')::UUID,
            shift_record->>'user_email',
            (shift_record->>'shift_date')::DATE,
            (shift_record->>'shift_type')::shift_type
        )
        ON CONFLICT (project_id, team_id, user_email, shift_date)
        DO UPDATE SET 
            shift_type = EXCLUDED.shift_type,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get custom shift enums for a project-team combination
CREATE OR REPLACE FUNCTION get_custom_shift_enums(
    p_project_id UUID,
    p_team_id UUID
)
RETURNS TABLE (
    id UUID,
    shift_identifier VARCHAR(10),
    shift_name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    is_default BOOLEAN,
    color VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cse.id,
        cse.shift_identifier,
        cse.shift_name,
        cse.start_time,
        cse.end_time,
        cse.is_default,
        cse.color
    FROM custom_shift_enums cse
    WHERE cse.project_id = p_project_id
      AND cse.team_id = p_team_id
    ORDER BY cse.shift_identifier;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and update shifts based on custom enums
CREATE OR REPLACE FUNCTION validate_and_update_shifts(
    p_project_id UUID,
    p_team_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    default_shift VARCHAR(10);
    updated_count INTEGER := 0;
BEGIN
    -- Get the default shift for this project-team combination
    SELECT shift_identifier INTO default_shift
    FROM custom_shift_enums
    WHERE project_id = p_project_id
      AND team_id = p_team_id
      AND is_default = true
    LIMIT 1;

    -- If no custom enums defined, use 'G' as default
    IF default_shift IS NULL THEN
        default_shift := 'G';
    END IF;

    -- Update all shifts that don't match valid custom enums
    UPDATE shift_schedules
    SET 
        shift_type = default_shift::shift_type,
        updated_at = NOW()
    WHERE project_id = p_project_id
      AND team_id = p_team_id
      AND EXTRACT(YEAR FROM shift_date) = p_year
      AND EXTRACT(MONTH FROM shift_date) = p_month
      AND shift_type::VARCHAR NOT IN (
          SELECT shift_identifier 
          FROM custom_shift_enums 
          WHERE project_id = p_project_id 
            AND team_id = p_team_id
      );

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CATEGORY FUNCTIONS
-- =====================================================

-- Function to get project categories with options
CREATE OR REPLACE FUNCTION get_project_categories_with_options(
    p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH category_data AS (
        SELECT
            pc.id,
            pc.name,
            pc.description,
            pc.color,
            pc.sort_order,
            pc.created_at,
            pc.updated_at,
            json_agg(
                CASE WHEN co.id IS NOT NULL THEN
                    json_build_object(
                        'id', co.id,
                        'option_name', co.option_name,
                        'option_value', co.option_value,
                        'sort_order', co.sort_order
                    )
                END
            ) FILTER (WHERE co.id IS NOT NULL) as options
        FROM project_categories pc
        LEFT JOIN category_options co ON pc.id = co.category_id AND co.is_active = true
        WHERE pc.project_id = p_project_id AND pc.is_active = true
        GROUP BY pc.id, pc.name, pc.description, pc.color, pc.sort_order, pc.created_at, pc.updated_at
    )
    SELECT json_agg(
        json_build_object(
            'id', cd.id,
            'name', cd.name,
            'description', cd.description,
            'color', cd.color,
            'sort_order', cd.sort_order,
            'created_at', cd.created_at,
            'updated_at', cd.updated_at,
            'options', COALESCE(cd.options, '[]'::json)
        ) ORDER BY cd.sort_order
    ) INTO result
    FROM category_data cd;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- KANBAN TASK CATEGORIES FUNCTIONS
-- =====================================================

-- Drop existing functions if they exist to avoid conflicts
-- Use CASCADE to drop all overloaded versions
DROP FUNCTION IF EXISTS get_task_categories_with_options_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_with_options(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_task_categories_simple_json(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, JSONB, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_task_categories(UUID, TEXT, VARCHAR) CASCADE;

-- Additional cleanup for any remaining function variations
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find and drop all functions with these names
    FOR func_record IN 
        SELECT 
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN (
            'get_task_categories_with_options_json', 
            'get_task_categories_with_options', 
            'get_task_categories_simple_json', 
            'update_task_categories'
        )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(func_record.func_name) || '(' || func_record.func_args || ') CASCADE';
        RAISE NOTICE 'Dropped function: %(%)', func_record.func_name, func_record.func_args;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        -- If the dynamic drop fails, continue with the static drops
        RAISE NOTICE 'Dynamic cleanup failed: %', SQLERRM;
END $$;

-- Function to get task categories with options (JSON format)
CREATE OR REPLACE FUNCTION get_task_categories_with_options_json(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH category_data AS (
        SELECT
            tcm.id as mapping_id,
            tcm.category_id,
            tcm.category_option_id,
            tcm.is_primary,
            tcm.sort_order,
            pc.name as category_name,
            pc.description as category_description,
            pc.color as category_color,
            co.option_name,
            co.option_value
        FROM task_category_mappings tcm
        JOIN project_categories pc ON tcm.category_id = pc.id
        LEFT JOIN category_options co ON tcm.category_option_id = co.id
        WHERE tcm.task_id = p_task_id
        ORDER BY tcm.sort_order, pc.name
    )
    SELECT json_agg(
        json_build_object(
            'mapping_id', cd.mapping_id,
            'category_id', cd.category_id,
            'category_option_id', cd.category_option_id,
            'is_primary', cd.is_primary,
            'sort_order', cd.sort_order,
            'category_name', cd.category_name,
            'category_description', cd.category_description,
            'category_color', cd.category_color,
            'option_name', cd.option_name,
            'option_value', cd.option_value
        )
    ) INTO result
    FROM category_data cd;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get task categories with options (table format - fallback)
CREATE OR REPLACE FUNCTION get_task_categories_with_options(
    p_task_id UUID
)
RETURNS TABLE (
    mapping_id UUID,
    category_id UUID,
    category_option_id UUID,
    is_primary BOOLEAN,
    sort_order INTEGER,
    category_name TEXT,
    category_description TEXT,
    category_color TEXT,
    option_name TEXT,
    option_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tcm.id as mapping_id,
        tcm.category_id,
        tcm.category_option_id,
        tcm.is_primary,
        tcm.sort_order,
        pc.name as category_name,
        pc.description as category_description,
        pc.color as category_color,
        co.option_name,
        co.option_value
    FROM task_category_mappings tcm
    JOIN project_categories pc ON tcm.category_id = pc.id
    LEFT JOIN category_options co ON tcm.category_option_id = co.id
    WHERE tcm.task_id = p_task_id
    ORDER BY tcm.sort_order, pc.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get task categories with options (simple JSON format - fallback)
CREATE OR REPLACE FUNCTION get_task_categories_simple_json(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT json_agg(
        json_build_object(
            'category_id', tcm.category_id,
            'category_option_id', tcm.category_option_id,
            'is_primary', tcm.is_primary,
            'sort_order', tcm.sort_order
        )
    ) INTO result
    FROM task_category_mappings tcm
    WHERE tcm.task_id = p_task_id
    ORDER BY tcm.sort_order;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to update task categories
CREATE OR REPLACE FUNCTION update_task_categories(
    p_task_id UUID,
    p_categories JSONB,
    p_user_email TEXT DEFAULT 'system'
)
RETURNS JSONB AS $$
DECLARE
    category_record JSONB;
    category_id UUID;
    category_option_id UUID;
    is_primary BOOLEAN;
    sort_order INTEGER;
    result JSONB;
BEGIN
    -- Start transaction
    BEGIN
        -- Delete existing category mappings for this task
        DELETE FROM task_category_mappings WHERE task_id = p_task_id;
        
        -- Insert new category mappings
        FOR category_record IN SELECT * FROM jsonb_array_elements(p_categories)
        LOOP
            category_id := (category_record->>'category_id')::UUID;
            category_option_id := CASE 
                WHEN category_record->>'category_option_id' IS NOT NULL 
                AND category_record->>'category_option_id' != 'null'
                AND category_record->>'category_option_id' != ''
                THEN (category_record->>'category_option_id')::UUID
                ELSE NULL
            END;
            is_primary := COALESCE((category_record->>'is_primary')::BOOLEAN, false);
            sort_order := COALESCE((category_record->>'sort_order')::INTEGER, 0);
            
            INSERT INTO task_category_mappings (
                task_id,
                category_id,
                category_option_id,
                is_primary,
                sort_order
            ) VALUES (
                p_task_id,
                category_id,
                category_option_id,
                is_primary,
                sort_order
            );
        END LOOP;
        
        -- Return success
        result := jsonb_build_object(
            'success', true,
            'message', 'Task categories updated successfully',
            'task_id', p_task_id,
            'categories_count', jsonb_array_length(p_categories)
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'task_id', p_task_id
        );
        
        RETURN result;
    END;
END;
$$ LANGUAGE plpgsql;

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

COMMENT ON TABLE users IS 'Application users with authentication details and access controls';
COMMENT ON COLUMN users.phone_number IS 'Optional phone number for user contact';
COMMENT ON COLUMN users.access_dashboard IS 'Access to main dashboard (always enabled)';
COMMENT ON COLUMN users.access_work_report IS 'Access to work report functionality';
COMMENT ON COLUMN users.access_analytics IS 'Access to main analytics section';
COMMENT ON COLUMN users.access_analytics_workload IS 'Access to workload & utilization analytics';
COMMENT ON COLUMN users.access_analytics_project_health IS 'Access to project health & FTE analytics';
COMMENT ON COLUMN users.access_analytics_tickets IS 'Access to tickets & issues analytics';
COMMENT ON COLUMN users.access_analytics_operational IS 'Access to operational efficiency analytics';
COMMENT ON COLUMN users.access_analytics_team_insights IS 'Access to team insights analytics';
COMMENT ON COLUMN users.access_analytics_remedy IS 'Access to remedy dashboard analytics';
COMMENT ON COLUMN users.access_upload_tickets IS 'Access to upload tickets functionality';
COMMENT ON COLUMN users.access_master_mappings IS 'Access to master mappings functionality';
COMMENT ON COLUMN users.access_integrations IS 'Access to integrations functionality';

COMMENT ON TABLE teams IS 'Teams that can be assigned to projects';
COMMENT ON TABLE team_members IS 'Junction table linking users to teams';
COMMENT ON TABLE projects IS 'Projects that users work on';
COMMENT ON TABLE team_project_assignments IS 'Junction table linking teams to projects';
COMMENT ON TABLE project_categories IS 'Custom categories for project work tracking';
COMMENT ON TABLE project_subcategories IS 'Subcategories for project categories';
COMMENT ON TABLE category_options IS 'Individual options for each category';
COMMENT ON TABLE subcategory_options IS 'Individual options for each subcategory';
COMMENT ON TABLE work_logs IS 'Completed work sessions with time tracking';
COMMENT ON TABLE timers IS 'Active work timers for ongoing sessions';
COMMENT ON TABLE work_log_category_selections IS 'Category selections for work logs';
COMMENT ON TABLE timer_category_selections IS 'Category selections for timers';
COMMENT ON TABLE kanban_columns IS 'Kanban board status columns';
COMMENT ON TABLE kanban_tasks IS 'Kanban board tasks';
COMMENT ON TABLE task_assignments IS 'Task assignment history';
COMMENT ON TABLE task_timeline IS 'Task action timeline';
COMMENT ON TABLE task_comments IS 'Task comments';
COMMENT ON TABLE task_attachments IS 'Task file attachments';
COMMENT ON TABLE user_integrations IS 'External service integrations (JIRA, Slack, etc.)';
COMMENT ON TABLE jira_user_mappings IS 'Maps internal users to JIRA assignee/reporter names';
COMMENT ON TABLE jira_project_mappings IS 'Maps dashboard projects to JIRA projects for analytics integration';
COMMENT ON TABLE ticket_sources IS 'Supported ticket system sources for data upload';
COMMENT ON TABLE ticket_upload_mappings IS 'Maps source organization fields to dashboard projects';
COMMENT ON TABLE ticket_upload_user_mappings IS 'Maps source assignee fields to dashboard users';
COMMENT ON TABLE uploaded_tickets IS 'Uploaded ticket data from external systems';
COMMENT ON TABLE upload_sessions IS 'Tracks upload progress and status';
COMMENT ON TABLE ticket_master_mappings IS 'Centralized user mappings for all ticket sources (similar to JIRA integrations)';

COMMENT ON TABLE shift_schedules IS 'Stores shift assignments for users by project, team, and date';
COMMENT ON COLUMN shift_schedules.shift_type IS 'Shift type: M=Morning, A=Afternoon, N=Night, G=General/Day, H=Holiday, L=Leave, E=Evening';
COMMENT ON COLUMN shift_schedules.shift_date IS 'Date for the shift assignment';
COMMENT ON COLUMN shift_schedules.user_email IS 'Email of the user assigned to the shift';

COMMENT ON TABLE custom_shift_enums IS 'Stores custom shift definitions for specific project-team combinations';
COMMENT ON COLUMN custom_shift_enums.shift_identifier IS 'Short identifier for the shift (e.g., M, A, N, E)';
COMMENT ON COLUMN custom_shift_enums.shift_name IS 'Full name of the shift (e.g., Morning, Afternoon, Night, Evening)';
COMMENT ON COLUMN custom_shift_enums.start_time IS 'Shift start time in 24-hour format';
COMMENT ON COLUMN custom_shift_enums.end_time IS 'Shift end time in 24-hour format';
COMMENT ON COLUMN custom_shift_enums.is_default IS 'Whether this shift is the default for invalid assignments';
COMMENT ON COLUMN custom_shift_enums.color IS 'Hex color code for the shift type display';

COMMENT ON TABLE audit_trail IS 'Comprehensive audit trail for all user actions and system events';
COMMENT ON COLUMN audit_trail.user_email IS 'Email of the user who performed the action';
COMMENT ON COLUMN audit_trail.event_type IS 'Type of event (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_trail.table_name IS 'Database table affected by the action';
COMMENT ON COLUMN audit_trail.record_id IS 'ID of the specific record affected';
COMMENT ON COLUMN audit_trail.old_values IS 'Previous values before change (for UPDATE/DELETE events)';
COMMENT ON COLUMN audit_trail.new_values IS 'New values after change (for CREATE/UPDATE events)';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional context and metadata for the event';

COMMENT ON TABLE security_alerts IS 'Security alerts and monitoring events';
COMMENT ON COLUMN security_alerts.type IS 'Type of security alert';
COMMENT ON COLUMN security_alerts.severity IS 'Alert severity level (LOW, MEDIUM, HIGH, CRITICAL)';
COMMENT ON COLUMN security_alerts.acknowledged IS 'Whether the alert has been acknowledged';
COMMENT ON COLUMN security_alerts.resolved IS 'Whether the alert has been resolved';

COMMENT ON TABLE monitoring_rules IS 'Rules for automated security monitoring';
COMMENT ON COLUMN monitoring_rules.conditions IS 'JSON conditions that trigger the rule';
COMMENT ON COLUMN monitoring_rules.actions IS 'JSON actions to take when rule is triggered';

COMMENT ON TABLE event_counters IS 'Counters for tracking event frequencies';
COMMENT ON COLUMN event_counters.event_key IS 'Unique key identifying the event type';
COMMENT ON COLUMN event_counters.count IS 'Number of times this event has occurred';

COMMENT ON TABLE user_sessions IS 'User session management and tracking';
COMMENT ON COLUMN user_sessions.session_token IS 'Unique session token for authentication';
COMMENT ON COLUMN user_sessions.refresh_token IS 'Refresh token for session renewal';
COMMENT ON COLUMN user_sessions.security_level IS 'Security level for the session (low, medium, high)';

COMMENT ON TABLE session_activities IS 'Tracks user activities within sessions';
COMMENT ON COLUMN session_activities.activity_type IS 'Type of activity performed';
COMMENT ON COLUMN session_activities.endpoint IS 'API endpoint accessed';

-- Add comments for task category functions
COMMENT ON TABLE task_category_mappings IS 'Maps tasks to multiple categories with options';
COMMENT ON COLUMN task_category_mappings.task_id IS 'Reference to the kanban task';
COMMENT ON COLUMN task_category_mappings.category_id IS 'Reference to the project category';
COMMENT ON COLUMN task_category_mappings.category_option_id IS 'Optional reference to a specific category option';
COMMENT ON COLUMN task_category_mappings.is_primary IS 'Whether this is the primary category for the task';
COMMENT ON COLUMN task_category_mappings.sort_order IS 'Order for displaying categories';

COMMENT ON FUNCTION get_task_categories_with_options_json(UUID) IS 'Get task categories with full details in JSON format';
COMMENT ON FUNCTION get_task_categories_with_options(UUID) IS 'Get task categories with full details in table format';
COMMENT ON FUNCTION get_task_categories_simple_json(UUID) IS 'Get task categories with basic details in JSON format';
COMMENT ON FUNCTION update_task_categories(UUID, JSONB, TEXT) IS 'Update task categories by replacing all existing mappings with new ones';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- All tables, indexes, constraints, triggers, and RLS policies have been created
-- The database is now ready for the Alignzo Lite application
-- 
-- This master schema includes:
-- ✓ Core application functionality (users, teams, projects, work tracking)
-- ✓ Enhanced category system with table-based options and subcategories
-- ✓ Kanban board functionality with tasks, comments, attachments, and timeline
-- ✓ User access control system with granular permissions
-- ✓ JIRA integration support (user mappings, project mappings)  
-- ✓ Ticket upload functionality (Remedy, ServiceNow, etc.)
-- ✓ Master mapping system for centralized user management
-- ✓ Shift schedule management with custom shift types and color coding
-- ✓ Advanced security features (audit trail, security alerts, session management)
-- ✓ All necessary performance indexes and security policies
-- 
-- NEXT STEPS:
-- 1. Access the main application at /alignzo
-- 2. Set up your first project and team
-- 3. Configure user access controls in admin panel (/admin/dashboard/users)
-- 4. Set up shift schedules for teams (/admin/dashboard/shift-schedule)
-- 5. Configure JIRA integrations if needed
-- 6. Set up ticket upload mappings at /alignzo/upload-tickets
-- 7. Upload your first ticket dump file
-- 8. Monitor work tracking, analytics, and shift schedules
