# Alignzo Lite Database Schema

This directory contains the complete database schema for the Alignzo Lite application.

## Master Schema File

**`schema.sql`** - This is the master schema file that contains all tables, indexes, constraints, triggers, and RLS policies for the entire application.

## Database Setup

### Option 1: Use Master Schema (Recommended)
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `schema.sql`
4. Click "Run"

This will create all tables and set up the complete database schema in one go.

### Option 2: Individual Files (Legacy)
The following individual files are kept for reference but are now consolidated in `schema.sql`:

- `jira_user_mapping.sql` - JIRA user mappings table
- `jira_project_mapping.sql` - JIRA project mappings table  
- `jira_project_mapping_simple.sql` - Simplified JIRA project mappings
- `team_project_assignment.sql` - Team-project assignments
- `fix_jira_project_mapping_rls.sql` - RLS policy fixes

## Schema Overview

### Core Tables
- **users** - Application users with authentication details
- **teams** - Teams that can be assigned to projects
- **team_members** - Junction table linking users to teams
- **projects** - Projects that users work on
- **team_project_assignments** - Junction table linking teams to projects
- **project_categories** - Custom categories for project work tracking

### Work Tracking Tables
- **work_logs** - Completed work sessions with time tracking
- **timers** - Active work timers for ongoing sessions

### Integration Tables
- **user_integrations** - External service integrations (JIRA, Slack, etc.)
- **jira_user_mappings** - Maps internal users to JIRA assignee/reporter names
- **jira_project_mappings** - Maps dashboard projects to JIRA projects for analytics integration

## Features

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies for API route compatibility.

### Automatic Timestamps
All tables have `created_at` and `updated_at` columns with automatic triggers.

### Performance Indexes
Comprehensive indexing strategy for optimal query performance.

### Foreign Key Constraints
Proper referential integrity with cascade delete where appropriate.

## Migration Notes

If you have an existing database with some of these tables, the `IF NOT EXISTS` clauses will ensure the schema can be run safely without conflicts.

## Troubleshooting

### RLS Policy Issues
If you encounter RLS policy violations, the policies in the master schema are simplified to work with API routes. They use `USING (true)` instead of complex JWT-based policies.

### Duplicate Constraints
The schema uses `IF NOT EXISTS` and `ADD CONSTRAINT IF NOT EXISTS` to prevent conflicts when running multiple times.

## Maintenance

When adding new tables or modifying the schema:
1. Update the master `schema.sql` file
2. Add appropriate indexes, constraints, triggers, and RLS policies
3. Update this README with any new tables or changes
4. Test the schema in a development environment first
