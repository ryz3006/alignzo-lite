-- =====================================================
-- TICKET UPLOAD FIXES AND IMPROVEMENTS
-- =====================================================
-- This file contains all the fixes needed for the ticket upload functionality
-- based on analysis of the CSV sample data
-- 
-- Issues addressed:
-- 1. Data type mismatches for numeric fields
-- 2. Better handling of empty values
-- 3. Improved date parsing
-- 4. Enhanced CSV parsing for quoted fields
-- 5. Better error handling

-- =====================================================
-- SCHEMA UPDATES
-- =====================================================

-- Update existing uploaded_tickets table to fix data type issues
-- Note: These changes are already included in the updated schema.sql

-- =====================================================
-- HELPER FUNCTIONS FOR BETTER DATA PROCESSING
-- =====================================================

-- Function to safely parse Remedy date format
CREATE OR REPLACE FUNCTION parse_remedy_date(date_string TEXT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    parsed_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Return NULL for empty or null strings
    IF date_string IS NULL OR TRIM(date_string) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Handle Remedy format: "08/18/2025, 07:11:50 PM"
    IF date_string LIKE '%/%/%%, %:%:% %M' THEN
        BEGIN
            parsed_date := date_string::TIMESTAMP WITH TIME ZONE;
            RETURN parsed_date;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN NULL;
        END;
    END IF;
    
    -- Handle other date formats
    BEGIN
        parsed_date := date_string::TIMESTAMP WITH TIME ZONE;
        RETURN parsed_date;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to safely convert string to integer
CREATE OR REPLACE FUNCTION safe_string_to_int(value TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Return NULL for empty or null strings
    IF value IS NULL OR TRIM(value) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Try to convert to integer
    BEGIN
        RETURN value::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to clean and validate CSV field values
CREATE OR REPLACE FUNCTION clean_csv_field(value TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return NULL for empty or null strings
    IF value IS NULL OR TRIM(value) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove leading/trailing whitespace and quotes
    value := TRIM(value);
    
    -- Handle quoted fields - remove outer quotes if they exist
    IF value LIKE '"%"' THEN
        value := SUBSTRING(value FROM 2 FOR LENGTH(value) - 2);
    END IF;
    
    -- Handle escaped quotes within the field
    value := REPLACE(value, '""', '"');
    
    -- Clean up any remaining whitespace
    value := TRIM(value);
    
    -- Return cleaned value
    RETURN value;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate uploaded ticket data
CREATE OR REPLACE FUNCTION validate_ticket_data(
    p_incident_id TEXT,
    p_priority TEXT,
    p_assignee TEXT,
    p_reported_date TEXT
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    -- Check required fields
    IF p_incident_id IS NULL OR TRIM(p_incident_id) = '' THEN
        RETURN QUERY SELECT FALSE, 'Incident ID is required';
        RETURN;
    END IF;
    
    -- Check if incident ID already exists
    IF EXISTS (SELECT 1 FROM uploaded_tickets WHERE incident_id = p_incident_id) THEN
        RETURN QUERY SELECT FALSE, 'Incident ID already exists: ' || p_incident_id;
        RETURN;
    END IF;
    
    -- Validate priority if provided
    IF p_priority IS NOT NULL AND p_priority != '' THEN
        IF p_priority NOT IN ('SR', 'INC', 'CR', 'PR') THEN
            RETURN QUERY SELECT FALSE, 'Invalid priority value: ' || p_priority;
            RETURN;
        END IF;
    END IF;
    
    -- Validate reported date if provided
    IF p_reported_date IS NOT NULL AND p_reported_date != '' THEN
        IF parse_remedy_date(p_reported_date) IS NULL THEN
            RETURN QUERY SELECT FALSE, 'Invalid reported date format: ' || p_reported_date;
            RETURN;
        END IF;
    END IF;
    
    -- All validations passed
    RETURN QUERY SELECT TRUE, 'Valid';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BULK INSERT FUNCTION WITH VALIDATION
-- =====================================================

-- Function to bulk insert tickets with validation
CREATE OR REPLACE FUNCTION bulk_insert_tickets(
    p_tickets JSONB
)
RETURNS TABLE(
    success_count INTEGER,
    error_count INTEGER,
    errors JSONB
) AS $$
DECLARE
    ticket JSONB;
    validation_result RECORD;
    success_counter INTEGER := 0;
    error_counter INTEGER := 0;
    error_list JSONB := '[]'::JSONB;
BEGIN
    -- Loop through each ticket in the JSON array
    FOR ticket IN SELECT * FROM jsonb_array_elements(p_tickets)
    LOOP
        -- Validate the ticket
        SELECT * INTO validation_result 
        FROM validate_ticket_data(
            ticket->>'incident_id',
            ticket->>'priority',
            ticket->>'assignee',
            ticket->>'reported_date1'
        );
        
        IF validation_result.is_valid THEN
            -- Insert the ticket
            BEGIN
                INSERT INTO uploaded_tickets (
                    source_id,
                    mapping_id,
                    project_id,
                    incident_id,
                    priority,
                    region,
                    assigned_support_organization,
                    assigned_group,
                    vertical,
                    sub_vertical,
                    owner_support_organization,
                    owner_group,
                    owner,
                    reported_source,
                    user_name,
                    site_group,
                    operational_category_tier_1,
                    operational_category_tier_2,
                    operational_category_tier_3,
                    product_name,
                    product_categorization_tier_1,
                    product_categorization_tier_2,
                    product_categorization_tier_3,
                    incident_type,
                    summary,
                    assignee,
                    mapped_user_email,
                    reported_date1,
                    responded_date,
                    last_resolved_date,
                    closed_date,
                    status,
                    status_reason_hidden,
                    pending_reason,
                    group_transfers,
                    total_transfers,
                    department,
                    vip,
                    company,
                    vendor_ticket_number,
                    reported_to_vendor,
                    resolution,
                    resolver_group,
                    reopen_count,
                    reopened_date,
                    service_desk_1st_assigned_date,
                    service_desk_1st_assigned_group,
                    submitter,
                    owner_login_id,
                    impact,
                    submit_date,
                    report_date,
                    vil_function,
                    it_partner,
                    mttr,
                    mtti
                ) VALUES (
                    (ticket->>'source_id')::UUID,
                    (ticket->>'mapping_id')::UUID,
                    (ticket->>'project_id')::UUID,
                    clean_csv_field(ticket->>'incident_id'),
                    clean_csv_field(ticket->>'priority'),
                    clean_csv_field(ticket->>'region'),
                    clean_csv_field(ticket->>'assigned_support_organization'),
                    clean_csv_field(ticket->>'assigned_group'),
                    clean_csv_field(ticket->>'vertical'),
                    clean_csv_field(ticket->>'sub_vertical'),
                    clean_csv_field(ticket->>'owner_support_organization'),
                    clean_csv_field(ticket->>'owner_group'),
                    clean_csv_field(ticket->>'owner'),
                    clean_csv_field(ticket->>'reported_source'),
                    clean_csv_field(ticket->>'user_name'),
                    clean_csv_field(ticket->>'site_group'),
                    clean_csv_field(ticket->>'operational_category_tier_1'),
                    clean_csv_field(ticket->>'operational_category_tier_2'),
                    clean_csv_field(ticket->>'operational_category_tier_3'),
                    clean_csv_field(ticket->>'product_name'),
                    clean_csv_field(ticket->>'product_categorization_tier_1'),
                    clean_csv_field(ticket->>'product_categorization_tier_2'),
                    clean_csv_field(ticket->>'product_categorization_tier_3'),
                    clean_csv_field(ticket->>'incident_type'),
                    clean_csv_field(ticket->>'summary'),
                    clean_csv_field(ticket->>'assignee'),
                    clean_csv_field(ticket->>'mapped_user_email'),
                    parse_remedy_date(ticket->>'reported_date1'),
                    parse_remedy_date(ticket->>'responded_date'),
                    parse_remedy_date(ticket->>'last_resolved_date'),
                    parse_remedy_date(ticket->>'closed_date'),
                    clean_csv_field(ticket->>'status'),
                    clean_csv_field(ticket->>'status_reason_hidden'),
                    clean_csv_field(ticket->>'pending_reason'),
                    clean_csv_field(ticket->>'group_transfers'),
                    clean_csv_field(ticket->>'total_transfers'),
                    clean_csv_field(ticket->>'department'),
                    clean_csv_field(ticket->>'vip'),
                    clean_csv_field(ticket->>'company'),
                    clean_csv_field(ticket->>'vendor_ticket_number'),
                    clean_csv_field(ticket->>'reported_to_vendor'),
                    clean_csv_field(ticket->>'resolution'),
                    clean_csv_field(ticket->>'resolver_group'),
                    clean_csv_field(ticket->>'reopen_count'),
                    parse_remedy_date(ticket->>'reopened_date'),
                    parse_remedy_date(ticket->>'service_desk_1st_assigned_date'),
                    clean_csv_field(ticket->>'service_desk_1st_assigned_group'),
                    clean_csv_field(ticket->>'submitter'),
                    clean_csv_field(ticket->>'owner_login_id'),
                    clean_csv_field(ticket->>'impact'),
                    parse_remedy_date(ticket->>'submit_date'),
                    parse_remedy_date(ticket->>'report_date'),
                    clean_csv_field(ticket->>'vil_function'),
                    clean_csv_field(ticket->>'it_partner'),
                    clean_csv_field(ticket->>'mttr'),
                    clean_csv_field(ticket->>'mtti')
                );
                
                success_counter := success_counter + 1;
            EXCEPTION
                WHEN OTHERS THEN
                    error_counter := error_counter + 1;
                    error_list := error_list || jsonb_build_object(
                        'incident_id', ticket->>'incident_id',
                        'error', SQLERRM
                    );
            END;
        ELSE
            error_counter := error_counter + 1;
            error_list := error_list || jsonb_build_object(
                'incident_id', ticket->>'incident_id',
                'error', validation_result.error_message
            );
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT success_counter, error_counter, error_list;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean existing data
CREATE OR REPLACE FUNCTION cleanup_uploaded_tickets()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Update empty strings to NULL for better data consistency
    UPDATE uploaded_tickets 
    SET 
        priority = NULL WHERE priority = '';
    
    UPDATE uploaded_tickets 
    SET 
        region = NULL WHERE region = '';
    
    UPDATE uploaded_tickets 
    SET 
        assigned_support_organization = NULL WHERE assigned_support_organization = '';
    
    UPDATE uploaded_tickets 
    SET 
        assigned_group = NULL WHERE assigned_group = '';
    
    UPDATE uploaded_tickets 
    SET 
        vertical = NULL WHERE vertical = '';
    
    UPDATE uploaded_tickets 
    SET 
        sub_vertical = NULL WHERE sub_vertical = '';
    
    UPDATE uploaded_tickets 
    SET 
        owner_support_organization = NULL WHERE owner_support_organization = '';
    
    UPDATE uploaded_tickets 
    SET 
        owner_group = NULL WHERE owner_group = '';
    
    UPDATE uploaded_tickets 
    SET 
        owner = NULL WHERE owner = '';
    
    UPDATE uploaded_tickets 
    SET 
        reported_source = NULL WHERE reported_source = '';
    
    UPDATE uploaded_tickets 
    SET 
        user_name = NULL WHERE user_name = '';
    
    UPDATE uploaded_tickets 
    SET 
        site_group = NULL WHERE site_group = '';
    
    UPDATE uploaded_tickets 
    SET 
        operational_category_tier_1 = NULL WHERE operational_category_tier_1 = '';
    
    UPDATE uploaded_tickets 
    SET 
        operational_category_tier_2 = NULL WHERE operational_category_tier_2 = '';
    
    UPDATE uploaded_tickets 
    SET 
        operational_category_tier_3 = NULL WHERE operational_category_tier_3 = '';
    
    UPDATE uploaded_tickets 
    SET 
        product_name = NULL WHERE product_name = '';
    
    UPDATE uploaded_tickets 
    SET 
        product_categorization_tier_1 = NULL WHERE product_categorization_tier_1 = '';
    
    UPDATE uploaded_tickets 
    SET 
        product_categorization_tier_2 = NULL WHERE product_categorization_tier_2 = '';
    
    UPDATE uploaded_tickets 
    SET 
        product_categorization_tier_3 = NULL WHERE product_categorization_tier_3 = '';
    
    UPDATE uploaded_tickets 
    SET 
        incident_type = NULL WHERE incident_type = '';
    
    UPDATE uploaded_tickets 
    SET 
        summary = NULL WHERE summary = '';
    
    UPDATE uploaded_tickets 
    SET 
        assignee = NULL WHERE assignee = '';
    
    UPDATE uploaded_tickets 
    SET 
        status = NULL WHERE status = '';
    
    UPDATE uploaded_tickets 
    SET 
        status_reason_hidden = NULL WHERE status_reason_hidden = '';
    
    UPDATE uploaded_tickets 
    SET 
        pending_reason = NULL WHERE pending_reason = '';
    
    UPDATE uploaded_tickets 
    SET 
        group_transfers = NULL WHERE group_transfers = '';
    
    UPDATE uploaded_tickets 
    SET 
        total_transfers = NULL WHERE total_transfers = '';
    
    UPDATE uploaded_tickets 
    SET 
        department = NULL WHERE department = '';
    
    UPDATE uploaded_tickets 
    SET 
        vip = NULL WHERE vip = '';
    
    UPDATE uploaded_tickets 
    SET 
        company = NULL WHERE company = '';
    
    UPDATE uploaded_tickets 
    SET 
        vendor_ticket_number = NULL WHERE vendor_ticket_number = '';
    
    UPDATE uploaded_tickets 
    SET 
        reported_to_vendor = NULL WHERE reported_to_vendor = '';
    
    UPDATE uploaded_tickets 
    SET 
        resolution = NULL WHERE resolution = '';
    
    UPDATE uploaded_tickets 
    SET 
        resolver_group = NULL WHERE resolver_group = '';
    
    UPDATE uploaded_tickets 
    SET 
        reopen_count = NULL WHERE reopen_count = '';
    
    UPDATE uploaded_tickets 
    SET 
        service_desk_1st_assigned_group = NULL WHERE service_desk_1st_assigned_group = '';
    
    UPDATE uploaded_tickets 
    SET 
        submitter = NULL WHERE submitter = '';
    
    UPDATE uploaded_tickets 
    SET 
        owner_login_id = NULL WHERE owner_login_id = '';
    
    UPDATE uploaded_tickets 
    SET 
        impact = NULL WHERE impact = '';
    
    UPDATE uploaded_tickets 
    SET 
        vil_function = NULL WHERE vil_function = '';
    
    UPDATE uploaded_tickets 
    SET 
        it_partner = NULL WHERE it_partner = '';
    
    UPDATE uploaded_tickets 
    SET 
        mttr = NULL WHERE mttr = '';
    
    UPDATE uploaded_tickets 
    SET 
        mtti = NULL WHERE mtti = '';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Function to get ticket statistics by project
CREATE OR REPLACE FUNCTION get_ticket_stats_by_project(
    p_project_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    project_name TEXT,
    total_tickets BIGINT,
    resolved_tickets BIGINT,
    pending_tickets BIGINT,
    avg_resolution_time INTERVAL,
    priority_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as project_name,
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN ut.status = 'Resolved' OR ut.status = 'Closed' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN ut.status = 'Pending' OR ut.status = 'Assigned' THEN 1 END) as pending_tickets,
        AVG(
            CASE 
                WHEN ut.last_resolved_date IS NOT NULL AND ut.reported_date1 IS NOT NULL 
                THEN ut.last_resolved_date - ut.reported_date1 
                ELSE NULL 
            END
        ) as avg_resolution_time,
        jsonb_object_agg(
            COALESCE(ut.priority, 'Unknown'),
            COUNT(*)
        ) as priority_distribution
    FROM uploaded_tickets ut
    JOIN projects p ON ut.project_id = p.id
    WHERE (p_project_id IS NULL OR ut.project_id = p_project_id)
        AND (p_start_date IS NULL OR ut.reported_date1 >= p_start_date)
        AND (p_end_date IS NULL OR ut.reported_date1 <= p_end_date)
    GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get user workload statistics
CREATE OR REPLACE FUNCTION get_user_workload_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    user_email TEXT,
    total_assigned_tickets BIGINT,
    resolved_tickets BIGINT,
    avg_resolution_time INTERVAL,
    active_tickets BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ut.mapped_user_email, ut.assignee) as user_email,
        COUNT(*) as total_assigned_tickets,
        COUNT(CASE WHEN ut.status = 'Resolved' OR ut.status = 'Closed' THEN 1 END) as resolved_tickets,
        AVG(
            CASE 
                WHEN ut.last_resolved_date IS NOT NULL AND ut.reported_date1 IS NOT NULL 
                THEN ut.last_resolved_date - ut.reported_date1 
                ELSE NULL 
            END
        ) as avg_resolution_time,
        COUNT(CASE WHEN ut.status IN ('Pending', 'Assigned', 'In Progress') THEN 1 END) as active_tickets
    FROM uploaded_tickets ut
    WHERE (p_start_date IS NULL OR ut.reported_date1 >= p_start_date)
        AND (p_end_date IS NULL OR ut.reported_date1 <= p_end_date)
        AND (ut.mapped_user_email IS NOT NULL OR ut.assignee IS NOT NULL)
    GROUP BY COALESCE(ut.mapped_user_email, ut.assignee);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_status_date ON uploaded_tickets(status, reported_date1);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_assignee_status ON uploaded_tickets(assignee, status);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_mapped_user_status ON uploaded_tickets(mapped_user_email, status);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_priority ON uploaded_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_department ON uploaded_tickets(department);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_company ON uploaded_tickets(company);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_project_status_date ON uploaded_tickets(project_id, status, reported_date1);
CREATE INDEX IF NOT EXISTS idx_uploaded_tickets_user_status_date ON uploaded_tickets(mapped_user_email, status, reported_date1);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION parse_remedy_date(TEXT) IS 'Safely parses Remedy date format with error handling';
COMMENT ON FUNCTION safe_string_to_int(TEXT) IS 'Safely converts string to integer with NULL handling';
COMMENT ON FUNCTION clean_csv_field(TEXT) IS 'Cleans and validates CSV field values';
COMMENT ON FUNCTION validate_ticket_data(TEXT, TEXT, TEXT, TEXT) IS 'Validates ticket data before insertion';
COMMENT ON FUNCTION bulk_insert_tickets(JSONB) IS 'Bulk inserts tickets with validation and error reporting';
COMMENT ON FUNCTION cleanup_uploaded_tickets() IS 'Cleans existing data by converting empty strings to NULL';
COMMENT ON FUNCTION get_ticket_stats_by_project(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets ticket statistics by project with date filtering';
COMMENT ON FUNCTION get_user_workload_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets user workload statistics with date filtering';

-- =====================================================
-- FIXES COMPLETE
-- =====================================================
-- All fixes and improvements for ticket upload functionality have been implemented
-- 
-- Key improvements:
-- ✓ Better data type handling for numeric fields
-- ✓ Improved date parsing for Remedy format
-- ✓ Enhanced CSV field cleaning and validation
-- ✓ Bulk insert with validation and error reporting
-- ✓ Data cleanup functions for existing data
-- ✓ Analytics helper functions for reporting
-- ✓ Additional performance indexes
-- 
-- Usage:
-- 1. Run this file to apply all fixes
-- 2. Use bulk_insert_tickets() for safe bulk data insertion
-- 3. Use cleanup_uploaded_tickets() to clean existing data
-- 4. Use analytics functions for reporting and insights
