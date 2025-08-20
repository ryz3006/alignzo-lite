# Alignzo Lite - Master Database Schema Summary

## Overview
The `database/schema.sql` file now contains a complete, consolidated database schema that includes all tables, indexes, constraints, triggers, and RLS policies from all existing SQL files in the project.

## What's Included

### 1. Core Application Tables
- **users** - Application users with authentication details
- **teams** - Teams that can be assigned to projects
- **team_members** - Junction table linking users to teams
- **projects** - Projects that users work on
- **team_project_assignments** - Junction table linking teams to projects
- **project_categories** - Custom categories for project work tracking

### 2. Work Tracking Tables
- **work_logs** - Completed work sessions with time tracking
- **timers** - Active work timers for ongoing sessions

### 3. Integration Tables
- **user_integrations** - External service integrations (JIRA, Slack, etc.)
- **jira_user_mappings** - Maps internal users to JIRA assignee/reporter names
- **jira_project_mappings** - Maps dashboard projects to JIRA projects for analytics integration

### 4. Ticket Upload Tables
- **ticket_sources** - Supported ticket system sources for data upload (Remedy, ServiceNow, etc.)
- **ticket_upload_mappings** - Maps source organization fields to dashboard projects
- **ticket_upload_user_mappings** - Maps source assignee fields to dashboard users
- **uploaded_tickets** - Uploaded ticket data from external systems
- **upload_sessions** - Tracks upload progress and status
- **ticket_master_mappings** - Centralized user mappings for all ticket sources (similar to JIRA integrations)

## Consolidated Files

The master schema consolidates the following individual SQL files:

1. **Original `schema.sql`** - Core application tables and JIRA integration
2. **`ticket_upload_schema.sql`** - Complete ticket upload functionality
3. **`jira_project_mapping.sql`** - JIRA project mapping table
4. **`jira_user_mapping.sql`** - JIRA user mapping table
5. **`team_project_assignment.sql`** - Team-project assignment table
6. **`fix_jira_project_mapping_rls.sql`** - RLS policy fixes
7. **`jira_project_mapping_simple.sql`** - Simplified JIRA project mapping

## Key Features

### Performance Optimizations
- Comprehensive indexing strategy for all tables
- Optimized queries for common operations
- Proper foreign key relationships

### Security
- Row Level Security (RLS) enabled on all tables
- Simplified policies for API route compatibility
- Public access policies (auth handled in application layer)

### Data Integrity
- Proper constraints and unique indexes
- Automatic timestamp updates via triggers
- Foreign key relationships with cascade deletes

### Extensibility
- Support for multiple ticket sources (Remedy, ServiceNow, etc.)
- Master mapping system for centralized user management
- Flexible category system for projects

## Initial Data
- Default ticket source: "Remedy" (BMC Remedy ITSM ticketing system)

## Usage

### For First-Time Installations
1. Run the complete `database/schema.sql` file in your Supabase SQL Editor
2. All tables, indexes, constraints, triggers, and policies will be created
3. The database will be ready for immediate use

### For Existing Installations
- The schema uses `IF NOT EXISTS` clauses, so it's safe to run on existing databases
- New tables and features will be added without affecting existing data
- Existing tables will remain unchanged

## Navigation Structure

After running the schema, you can access:

- **Main Application**: `/alignzo`
- **Upload Tickets**: `/alignzo/upload-tickets`
- **Uploaded Tickets**: `/alignzo/uploaded-tickets`
- **Master Mappings**: `/alignzo/master-mappings`
- **Reports**: `/alignzo/reports`

## Next Steps

1. Set up your first project and team
2. Configure JIRA integrations if needed
3. Set up ticket upload mappings
4. Upload your first ticket dump file
5. Monitor work tracking and analytics

## Maintenance

- All tables include `created_at` and `updated_at` timestamps
- Automatic trigger updates for `updated_at` fields
- Comprehensive logging and audit trails
- Scalable architecture for future enhancements

---

**Note**: This master schema is designed for first-time installations and includes all functionality from the existing SQL files. For production deployments, consider reviewing and customizing the RLS policies based on your specific security requirements.
