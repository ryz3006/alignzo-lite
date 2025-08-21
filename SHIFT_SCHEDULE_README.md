# Shift Schedule Management

This document describes the Shift Schedule functionality added to the Alignzo Lite admin panel.

## Overview

The Shift Schedule feature allows administrators to manage and assign shifts to team members for specific projects and time periods. It provides a comprehensive interface for creating, editing, and exporting shift schedules.

## Features

### Core Functionality
- **Project & Team Selection**: Choose from available projects and their assigned teams
- **Month/Year Navigation**: Navigate between different months and years
- **Shift Assignment**: Assign different shift types to team members for each day
- **Visual Indicators**: Color-coded shift types for easy identification
- **Weekend Highlighting**: Visual distinction for weekend days
- **Bulk Operations**: Save entire month schedules at once
- **CSV Export**: Download shift schedules as CSV files
- **CSV Upload**: Upload shift schedules with partial updates (only updates specified users/dates)
- **Custom Shift Management**: Create and manage custom shift types for specific project-team combinations
- **Shift Validation**: Automatic validation and correction of invalid shift assignments

### Shift Types

#### Default Shift Types
- **M (Morning)**: Blue background - Morning shift
- **A (Afternoon)**: Purple background - Afternoon shift  
- **N (Night)**: Indigo background - Night shift
- **G (General/Day)**: Green background - General/Day shift (default)
- **H (Holiday)**: Red background - Holiday
- **L (Leave)**: Yellow background - Leave

#### Custom Shift Types
- **Project-Specific**: Create custom shift types for specific project-team combinations
- **Attributes**: Shift identifier, name, start time, end time, and default designation
- **Validation**: Automatic validation against custom shift definitions
- **Fallback**: Invalid shifts are automatically replaced with the designated default shift

## Database Schema

### Tables
- `shift_schedules`: Main table storing shift assignments
- `shift_type`: Enum defining available shift types

### Key Fields
- `project_id`: Reference to the project
- `team_id`: Reference to the team
- `user_email`: Email of the team member
- `shift_date`: Date of the shift assignment
- `shift_type`: Type of shift (M, A, N, G, H, L)

### Functions
- `upsert_shift_schedules()`: Insert or update individual shift records
- `upsert_shift_schedules_bulk()`: Bulk insert/update shift records
- `get_shift_schedule()`: Retrieve shift schedule for a specific project, team, and month

## Setup Instructions

### 1. Database Setup
Run the shift schedule database schema:

```bash
# Option 1: Run the script
node scripts/create-shift-schedule-tables.js

# Option 2: Manual execution
# Copy and paste the contents of database/shift_schedule_schema.sql 
# into your Supabase SQL Editor and execute
```

### 2. Access the Feature
1. Navigate to the Admin Panel (`/admin`)
2. Login with admin credentials
3. Go to the Dashboard (`/admin/dashboard`)
4. Click on "Shift Schedule" in the sidebar

## Usage Guide

### Creating a Shift Schedule

1. **Select Project**: Choose a project from the dropdown
2. **Select Team**: Choose a team assigned to the selected project
3. **Select Month/Year**: Use the navigation controls to select the desired month and year
4. **Assign Shifts**: 
   - Each cell in the table represents a day for a team member
   - Click on any cell to change the shift type
   - Use the dropdown to select from available shift types
5. **Save Schedule**: Click "Save Schedule" to persist all changes
6. **Export**: Click "Download CSV" to export the schedule

### Managing Custom Shift Types

1. **Access Management**: Click "Manage Shifts" button after selecting a project and team
2. **Create Shift Types**: 
   - Click "Add Shift Enum" to create new shift types
   - Enter shift identifier (e.g., M, A, N), name, start time, and end time
   - Set one shift as default for invalid assignments
3. **Edit/Delete**: Use the edit and delete buttons to modify existing shift types
4. **Validation**: Click "Validate Shifts" to automatically correct invalid assignments

### Uploading a Shift Schedule

### Uploading a Shift Schedule

1. **Prepare CSV File**: Create a CSV file with the following format:
   ```
   Email,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
   user1@example.com,G,M,A,N,H,L,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G
   user2@example.com,G,G,G,G,G,H,H,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G
   ```

2. **Upload Process**:
   - Click "Upload CSV" button
   - Select your CSV file
   - The system will process the file and show results

3. **Upload Behavior**:
   - **Partial Updates**: Only updates users and dates mentioned in the CSV
   - **Preservation**: Existing shifts for unmentioned users/dates are preserved
   - **Validation**: Users must be members of the selected team
   - **Shift Validation**: Invalid shifts are automatically replaced with the default shift
   - **Error Handling**: Invalid entries are skipped with detailed feedback

### Default Behavior
- All team members are assigned "G" (General/Day) shift by default
- Weekends are visually highlighted with a gray background
- The table shows all days in the selected month
- Custom shift types override default types when defined for a project-team combination
- Invalid shifts are automatically corrected to the designated default shift

### Team Member Loading
The system automatically loads team members based on:
- Team membership (from `team_members` table)
- User information (from `users` table)

## File Structure

```
app/admin/dashboard/shift-schedule/
└── page.tsx                    # Main shift schedule page

database/
└── shift_schedule_schema.sql   # Database schema and functions

scripts/
└── create-shift-schedule-tables.js  # Setup script

lib/
└── supabase.ts                # Updated with shift schedule types
```

## API Integration

The shift schedule functionality integrates with:
- **Projects**: Uses existing project data
- **Teams**: Uses existing team data and team-project assignments
- **Users**: Uses existing user data for team members
- **Team Members**: Uses team membership relationships

## Security

- Row Level Security (RLS) is enabled on the `shift_schedules` table
- Public read/write access is granted for admin functionality
- All operations are logged with timestamps

## Troubleshooting

### Common Issues

1. **No teams showing for selected project**
   - Ensure the team is assigned to the project in the team-project assignments
   - Check the `team_project_assignments` table

2. **No team members showing**
   - Ensure users are added to the team via the team members table
   - Check the `team_members` table

3. **Save operation fails**
   - Check database connectivity
   - Verify the shift_schedules table exists
   - Check for any constraint violations

4. **CSV download not working**
   - Ensure the browser allows downloads
   - Check if there's data to export

### Database Verification

To verify the setup, run these queries in Supabase:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'shift_schedules';

-- Check if enum exists
SELECT typname FROM pg_type WHERE typname = 'shift_type';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%shift%';
```

## Future Enhancements

Potential improvements for the shift schedule feature:
- Shift pattern templates
- Bulk shift assignment tools
- Shift conflict detection
- Integration with calendar systems
- Mobile-responsive interface
- Shift statistics and reporting
- Automated shift rotation
- Notification system for shift changes
