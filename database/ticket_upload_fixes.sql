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

-- Function to validate uploaded ticket data for UPSERT operations (no duplicate check)
CREATE OR REPLACE FUNCTION validate_ticket_data_upsert(
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

-- Function to bulk insert tickets with validation and UPSERT functionality
CREATE OR REPLACE FUNCTION bulk_insert_tickets(
    p_tickets JSONB
)
RETURNS TABLE(
    success_count INTEGER,
    error_count INTEGER,
    updated_count INTEGER,
    errors JSONB
) AS $$
DECLARE
    ticket JSONB;
    validation_result RECORD;
    success_counter INTEGER := 0;
    error_counter INTEGER := 0;
    updated_counter INTEGER := 0;
    error_list JSONB := '[]'::JSONB;
BEGIN
    -- Loop through each ticket in the JSON array
    FOR ticket IN SELECT * FROM jsonb_array_elements(p_tickets)
    LOOP
        -- Validate the ticket (remove duplicate check since we want to update)
        SELECT * INTO validation_result 
        FROM validate_ticket_data_upsert(
            ticket->>'incident_id',
            ticket->>'priority',
            ticket->>'assignee',
            ticket->>'reported_date1'
        );
        
        IF validation_result.is_valid THEN
            -- Insert or update the ticket using UPSERT
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
                    mtti,
                    mttr_seconds,
                    mtti_seconds,
                    mttr_minutes,
                    mtti_minutes
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
                    clean_csv_field(ticket->>'mtti'),
                    time_string_to_seconds(clean_csv_field(ticket->>'mttr')),
                    time_string_to_seconds(clean_csv_field(ticket->>'mtti')),
                    time_string_to_minutes(clean_csv_field(ticket->>'mttr')),
                    time_string_to_minutes(clean_csv_field(ticket->>'mtti'))
                )
                ON CONFLICT (incident_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    mapping_id = EXCLUDED.mapping_id,
                    project_id = EXCLUDED.project_id,
                    priority = EXCLUDED.priority,
                    region = EXCLUDED.region,
                    assigned_support_organization = EXCLUDED.assigned_support_organization,
                    assigned_group = EXCLUDED.assigned_group,
                    vertical = EXCLUDED.vertical,
                    sub_vertical = EXCLUDED.sub_vertical,
                    owner_support_organization = EXCLUDED.owner_support_organization,
                    owner_group = EXCLUDED.owner_group,
                    owner = EXCLUDED.owner,
                    reported_source = EXCLUDED.reported_source,
                    user_name = EXCLUDED.user_name,
                    site_group = EXCLUDED.site_group,
                    operational_category_tier_1 = EXCLUDED.operational_category_tier_1,
                    operational_category_tier_2 = EXCLUDED.operational_category_tier_2,
                    operational_category_tier_3 = EXCLUDED.operational_category_tier_3,
                    product_name = EXCLUDED.product_name,
                    product_categorization_tier_1 = EXCLUDED.product_categorization_tier_1,
                    product_categorization_tier_2 = EXCLUDED.product_categorization_tier_2,
                    product_categorization_tier_3 = EXCLUDED.product_categorization_tier_3,
                    incident_type = EXCLUDED.incident_type,
                    summary = EXCLUDED.summary,
                    assignee = EXCLUDED.assignee,
                    mapped_user_email = EXCLUDED.mapped_user_email,
                    reported_date1 = EXCLUDED.reported_date1,
                    responded_date = EXCLUDED.responded_date,
                    last_resolved_date = EXCLUDED.last_resolved_date,
                    closed_date = EXCLUDED.closed_date,
                    status = EXCLUDED.status,
                    status_reason_hidden = EXCLUDED.status_reason_hidden,
                    pending_reason = EXCLUDED.pending_reason,
                    group_transfers = EXCLUDED.group_transfers,
                    total_transfers = EXCLUDED.total_transfers,
                    department = EXCLUDED.department,
                    vip = EXCLUDED.vip,
                    company = EXCLUDED.company,
                    vendor_ticket_number = EXCLUDED.vendor_ticket_number,
                    reported_to_vendor = EXCLUDED.reported_to_vendor,
                    resolution = EXCLUDED.resolution,
                    resolver_group = EXCLUDED.resolver_group,
                    reopen_count = EXCLUDED.reopen_count,
                    reopened_date = EXCLUDED.reopened_date,
                    service_desk_1st_assigned_date = EXCLUDED.service_desk_1st_assigned_date,
                    service_desk_1st_assigned_group = EXCLUDED.service_desk_1st_assigned_group,
                    submitter = EXCLUDED.submitter,
                    owner_login_id = EXCLUDED.owner_login_id,
                    impact = EXCLUDED.impact,
                    submit_date = EXCLUDED.submit_date,
                    report_date = EXCLUDED.report_date,
                    vil_function = EXCLUDED.vil_function,
                    it_partner = EXCLUDED.it_partner,
                    mttr = EXCLUDED.mttr,
                    mtti = EXCLUDED.mtti,
                    mttr_seconds = EXCLUDED.mttr_seconds,
                    mtti_seconds = EXCLUDED.mtti_seconds,
                    mttr_minutes = EXCLUDED.mttr_minutes,
                    mtti_minutes = EXCLUDED.mtti_minutes,
                    updated_at = NOW();
                
                -- Check if this was an update or insert
                IF FOUND THEN
                    IF (SELECT COUNT(*) FROM uploaded_tickets WHERE incident_id = clean_csv_field(ticket->>'incident_id')) > 1 THEN
                        -- This was an update (record existed before)
                        updated_counter := updated_counter + 1;
                    ELSE
                        -- This was an insert (new record)
                        success_counter := success_counter + 1;
                    END IF;
                ELSE
                    -- This was an insert
                    success_counter := success_counter + 1;
                END IF;
                
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
    
    RETURN QUERY SELECT success_counter, error_counter, updated_counter, error_list;
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

-- Enhanced analytics functions with MTTR/MTTI calculations
-- Function to get MTTR and MTTI statistics by project
CREATE OR REPLACE FUNCTION get_mttr_mtti_stats_by_project(
    p_project_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    project_name TEXT,
    total_tickets BIGINT,
    avg_mttr_seconds INTEGER,
    avg_mttr_minutes DECIMAL(10,2),
    avg_mtti_seconds INTEGER,
    avg_mtti_minutes DECIMAL(10,2),
    min_mttr_minutes DECIMAL(10,2),
    max_mttr_minutes DECIMAL(10,2),
    min_mtti_minutes DECIMAL(10,2),
    max_mtti_minutes DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as project_name,
        COUNT(*) as total_tickets,
        AVG(ut.mttr_seconds)::INTEGER as avg_mttr_seconds,
        AVG(ut.mttr_minutes) as avg_mttr_minutes,
        AVG(ut.mtti_seconds)::INTEGER as avg_mtti_seconds,
        AVG(ut.mtti_minutes) as avg_mtti_minutes,
        MIN(ut.mttr_minutes) as min_mttr_minutes,
        MAX(ut.mttr_minutes) as max_mttr_minutes,
        MIN(ut.mtti_minutes) as min_mtti_minutes,
        MAX(ut.mtti_minutes) as max_mtti_minutes
    FROM uploaded_tickets ut
    JOIN projects p ON ut.project_id = p.id
    WHERE (p_project_id IS NULL OR ut.project_id = p_project_id)
        AND (p_start_date IS NULL OR ut.reported_date1 >= p_start_date)
        AND (p_end_date IS NULL OR ut.reported_date1 <= p_end_date)
        AND (ut.mttr_seconds IS NOT NULL OR ut.mtti_seconds IS NOT NULL)
    GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get MTTR and MTTI statistics by user
CREATE OR REPLACE FUNCTION get_mttr_mtti_stats_by_user(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    user_email TEXT,
    total_tickets BIGINT,
    avg_mttr_minutes DECIMAL(10,2),
    avg_mtti_minutes DECIMAL(10,2),
    total_mttr_minutes DECIMAL(10,2),
    total_mtti_minutes DECIMAL(10,2),
    efficiency_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ut.mapped_user_email, ut.assignee) as user_email,
        COUNT(*) as total_tickets,
        AVG(ut.mttr_minutes) as avg_mttr_minutes,
        AVG(ut.mtti_minutes) as avg_mtti_minutes,
        SUM(ut.mttr_minutes) as total_mttr_minutes,
        SUM(ut.mtti_minutes) as total_mtti_minutes,
        CASE 
            WHEN AVG(ut.mttr_minutes) > 0 THEN 
                ROUND((100 - (AVG(ut.mttr_minutes) / 60))::DECIMAL, 2) -- Efficiency score based on MTTR
            ELSE 100 
        END as efficiency_score
    FROM uploaded_tickets ut
    WHERE (p_start_date IS NULL OR ut.reported_date1 >= p_start_date)
        AND (p_end_date IS NULL OR ut.reported_date1 <= p_end_date)
        AND (ut.mapped_user_email IS NOT NULL OR ut.assignee IS NOT NULL)
        AND (ut.mttr_seconds IS NOT NULL OR ut.mtti_seconds IS NOT NULL)
    GROUP BY COALESCE(ut.mapped_user_email, ut.assignee);
END;
$$ LANGUAGE plpgsql;

-- Function to get MTTR and MTTI trends over time
CREATE OR REPLACE FUNCTION get_mttr_mtti_trends(
    p_project_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    date DATE,
    avg_mttr_minutes DECIMAL(10,2),
    avg_mtti_minutes DECIMAL(10,2),
    ticket_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(ut.reported_date1) as date,
        AVG(ut.mttr_minutes) as avg_mttr_minutes,
        AVG(ut.mtti_minutes) as avg_mtti_minutes,
        COUNT(*) as ticket_count
    FROM uploaded_tickets ut
    WHERE (p_project_id IS NULL OR ut.project_id = p_project_id)
        AND ut.reported_date1 >= CURRENT_DATE - INTERVAL '1 day' * p_days
        AND (ut.mttr_seconds IS NOT NULL OR ut.mtti_seconds IS NOT NULL)
    GROUP BY DATE(ut.reported_date1)
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Function to get performance benchmarks
CREATE OR REPLACE FUNCTION get_performance_benchmarks(
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(
    metric_name TEXT,
    current_avg DECIMAL(10,2),
    target_value DECIMAL(10,2),
    performance_percentage DECIMAL(5,2),
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_stats AS (
        SELECT 
            AVG(ut.mttr_minutes) as avg_mttr,
            AVG(ut.mtti_minutes) as avg_mtti
        FROM uploaded_tickets ut
        WHERE (p_project_id IS NULL OR ut.project_id = p_project_id)
            AND (ut.mttr_seconds IS NOT NULL OR ut.mtti_seconds IS NOT NULL)
    )
    SELECT 
        'MTTR (Minutes)' as metric_name,
        cs.avg_mttr as current_avg,
        30.0 as target_value, -- 30 minutes target
        CASE 
            WHEN cs.avg_mttr > 0 THEN 
                ROUND(((30.0 / cs.avg_mttr) * 100)::DECIMAL, 2)
            ELSE 0 
        END as performance_percentage,
        CASE 
            WHEN cs.avg_mttr <= 30.0 THEN 'Excellent'
            WHEN cs.avg_mttr <= 60.0 THEN 'Good'
            WHEN cs.avg_mttr <= 120.0 THEN 'Fair'
            ELSE 'Needs Improvement'
        END as status
    FROM current_stats cs
    
    UNION ALL
    
    SELECT 
        'MTTI (Minutes)' as metric_name,
        cs.avg_mtti as current_avg,
        15.0 as target_value, -- 15 minutes target
        CASE 
            WHEN cs.avg_mtti > 0 THEN 
                ROUND(((15.0 / cs.avg_mtti) * 100)::DECIMAL, 2)
            ELSE 0 
        END as performance_percentage,
        CASE 
            WHEN cs.avg_mtti <= 15.0 THEN 'Excellent'
            WHEN cs.avg_mtti <= 30.0 THEN 'Good'
            WHEN cs.avg_mtti <= 60.0 THEN 'Fair'
            ELSE 'Needs Improvement'
        END as status
    FROM current_stats cs;
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
COMMENT ON FUNCTION bulk_insert_tickets(JSONB) IS 'Bulk inserts or updates tickets with UPSERT functionality';
COMMENT ON FUNCTION cleanup_uploaded_tickets() IS 'Cleans existing data by converting empty strings to NULL';
COMMENT ON FUNCTION get_ticket_stats_by_project(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets ticket statistics by project with date filtering';
COMMENT ON FUNCTION get_user_workload_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets user workload statistics with date filtering';
COMMENT ON FUNCTION get_mttr_mtti_stats_by_project(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets MTTR/MTTI statistics by project with date filtering';
COMMENT ON FUNCTION get_mttr_mtti_stats_by_user(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets MTTR/MTTI statistics by user with date filtering';
COMMENT ON FUNCTION get_mttr_mtti_trends(INTEGER, INTEGER) IS 'Gets MTTR/MTTI trends over time with date filtering';
COMMENT ON FUNCTION get_performance_benchmarks(UUID) IS 'Gets performance benchmarks for MTTR and MTTI';
COMMENT ON FUNCTION validate_ticket_data_upsert(TEXT, TEXT, TEXT, TEXT) IS 'Validates ticket data for UPSERT operations (no duplicate check)';
COMMENT ON FUNCTION get_upsert_statistics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Gets statistics on new vs updated records from UPSERT operations';
COMMENT ON FUNCTION get_incident_change_history(TEXT) IS 'Gets change history for a specific incident ID';

-- =====================================================
-- FIXES COMPLETE
-- =====================================================
-- All fixes and improvements for ticket upload functionality have been implemented
-- 
-- Key improvements:
-- ✓ Better data type handling for numeric fields
-- ✓ Improved date parsing for Remedy format
-- ✓ Enhanced CSV field cleaning and validation
-- ✓ **UPSERT functionality - updates existing records instead of rejecting duplicates**
-- ✓ Bulk insert/update with validation and error reporting
-- ✓ Data cleanup functions for existing data
-- ✓ Analytics helper functions for reporting
-- ✓ **MTTR/MTTI mathematical conversions for better analytics**
-- ✓ Additional performance indexes
-- 
-- **UPSERT Behavior:**
-- - When the same Incident ID is encountered again, the existing record is updated
-- - No duplicate records are created
-- - All fields are updated with the latest data from the CSV
-- - Upload statistics show new vs updated record counts
-- 
-- Usage:
-- 1. Run this file to apply all fixes
-- 2. Use bulk_insert_tickets() for safe bulk data insertion/updates
-- 3. Use cleanup_uploaded_tickets() to clean existing data
-- 4. Use analytics functions for reporting and insights
-- 5. **Use get_upsert_statistics() to track new vs updated records**

-- Function to convert time format string to seconds
CREATE OR REPLACE FUNCTION time_string_to_seconds(time_string TEXT)
RETURNS INTEGER AS $$
DECLARE
    parts TEXT[];
    hours INTEGER := 0;
    minutes INTEGER := 0;
    seconds INTEGER := 0;
BEGIN
    -- Return NULL for empty or null strings
    IF time_string IS NULL OR TRIM(time_string) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Handle format like "02:58:25" (HH:MM:SS)
    IF time_string LIKE '%:%:%' THEN
        parts := string_to_array(time_string, ':');
        
        IF array_length(parts, 1) = 3 THEN
            BEGIN
                hours := parts[1]::INTEGER;
                minutes := parts[2]::INTEGER;
                seconds := parts[3]::INTEGER;
                
                -- Validate time components
                IF hours >= 0 AND hours <= 23 AND 
                   minutes >= 0 AND minutes <= 59 AND 
                   seconds >= 0 AND seconds <= 59 THEN
                    RETURN (hours * 3600) + (minutes * 60) + seconds;
                ELSE
                    RETURN NULL;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
        END IF;
    END IF;
    
    -- Handle format like "02:58" (MM:SS)
    IF time_string LIKE '%:%' AND array_length(string_to_array(time_string, ':'), 1) = 2 THEN
        parts := string_to_array(time_string, ':');
        BEGIN
            minutes := parts[1]::INTEGER;
            seconds := parts[2]::INTEGER;
            
            IF minutes >= 0 AND minutes <= 59 AND seconds >= 0 AND seconds <= 59 THEN
                RETURN (minutes * 60) + seconds;
            ELSE
                RETURN NULL;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN NULL;
        END;
    END IF;
    
    -- Handle format like "125" (seconds only)
    BEGIN
        RETURN time_string::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to convert time format string to minutes
CREATE OR REPLACE FUNCTION time_string_to_minutes(time_string TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    seconds INTEGER;
BEGIN
    seconds := time_string_to_seconds(time_string);
    
    IF seconds IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND((seconds::DECIMAL / 60), 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update MTTR and MTTI mathematical values for existing records
CREATE OR REPLACE FUNCTION update_mttr_mtti_calculations()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE uploaded_tickets 
    SET 
        mttr_seconds = time_string_to_seconds(mttr),
        mtti_seconds = time_string_to_seconds(mtti),
        mttr_minutes = time_string_to_minutes(mttr),
        mtti_minutes = time_string_to_minutes(mtti),
        updated_at = NOW()
    WHERE mttr IS NOT NULL OR mtti IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get upsert statistics for a specific upload session
CREATE OR REPLACE FUNCTION get_upsert_statistics(
    p_session_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    total_records BIGINT,
    new_records BIGINT,
    updated_records BIGINT,
    duplicate_incident_ids TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH upsert_stats AS (
        SELECT 
            incident_id,
            created_at,
            updated_at,
            CASE 
                WHEN created_at = updated_at THEN 'new'
                ELSE 'updated'
            END as record_type
        FROM uploaded_tickets ut
        WHERE (p_session_id IS NULL OR ut.source_id IN (
            SELECT source_id FROM upload_sessions WHERE id = p_session_id
        ))
        AND (p_start_date IS NULL OR ut.updated_at >= p_start_date)
        AND (p_end_date IS NULL OR ut.updated_at <= p_end_date)
    )
    SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN record_type = 'new' THEN 1 END) as new_records,
        COUNT(CASE WHEN record_type = 'updated' THEN 1 END) as updated_records,
        ARRAY_AGG(DISTINCT incident_id) FILTER (WHERE record_type = 'updated') as duplicate_incident_ids
    FROM upsert_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get change history for a specific incident
CREATE OR REPLACE FUNCTION get_incident_change_history(
    p_incident_id TEXT
)
RETURNS TABLE(
    incident_id TEXT,
    change_type TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- This function can be enhanced with a proper audit trail table
    -- For now, return basic information about the incident
    RETURN QUERY
    SELECT 
        ut.incident_id,
        CASE 
            WHEN ut.created_at = ut.updated_at THEN 'Initial Upload'
            ELSE 'Updated'
        END as change_type,
        '{}'::JSONB as old_values, -- Placeholder for audit trail
        jsonb_build_object(
            'status', ut.status,
            'assignee', ut.assignee,
            'resolution', ut.resolution,
            'last_updated', ut.updated_at
        ) as new_values,
        ut.updated_at as changed_at
    FROM uploaded_tickets ut
    WHERE ut.incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;
