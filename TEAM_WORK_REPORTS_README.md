# Work Report Feature

## Overview
The Work Report feature allows users to view work reports from all team members they are part of. This provides a comprehensive view of team productivity and work distribution.

## Features

### 1. Team-Based Access Control
- Access to the Work Report page is controlled from the Admin Dashboard
- Admins can enable/disable access for individual users via the "Users" page
- Access control key: `access_team_work_reports`

### 2. Work Report Page (`/alignzo/work-reports`)
- **Location**: User dashboard under "Work Report" navigation item
- **Access**: Controlled by admin through user access controls
- **Data Source**: Work logs from all team members

### 3. Table Columns
- **Project**: Name of the project the work was done for
- **Date**: Date and time when the work was logged
- **Employee**: Name and email of the team member
- **Logged Time**: Duration of the work session
- **Actions**: View icon to see detailed information

### 4. Filtering Options
- **Employee**: Filter by specific team member
- **Project**: Filter by specific project
- **Date From**: Filter work logs from a specific date
- **Date To**: Filter work logs up to a specific date

### 5. Pagination
- 10 items per page by default
- Navigation controls for moving between pages
- Shows current page range and total results

### 6. View Modal
- Detailed view of individual work reports
- Shows all work log information including:
  - Project details
  - Employee information
  - Start and end times
  - Duration and break time
  - Task details
  - Category selections

### 7. Export Functionality
- Export filtered data to CSV format
- Includes all relevant columns for analysis

## Technical Implementation

### Database Changes
- New column added to `users` table: `access_team_work_reports BOOLEAN DEFAULT FALSE`
- Migration script: `database/add_team_work_reports_access.sql`

### New API Methods
- `getTeamMemberships(userEmail)`: Get user's team memberships
- `getTeamProjectAssignments(teamIds)`: Get projects assigned to teams
- `getTeamMembersByTeams(teamIds)`: Get team members for given teams
- `getTeamWorkLogs(filters, options)`: Get work logs with team filtering

### Access Control Integration
- Updated `getUserAccessControls()` in `lib/auth.ts`
- Added checkbox in admin users page
- Updated navigation filtering in `app/alignzo/layout.tsx`

### Team Logic
- If user is not in any teams: Shows only their own work logs
- If user is in teams: Shows work logs from all team members
- Handles edge cases where team data might be missing

## Setup Instructions

### 1. Database Migration
Run the migration script in your Supabase database:
```sql
-- Add the new column to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS access_team_work_reports BOOLEAN DEFAULT FALSE;
```

### 2. Admin Configuration
1. Go to Admin Dashboard → Users
2. Edit any user you want to grant access to
3. Check the "Work Report" checkbox
4. Save the changes

### 3. User Access
- Users with access will see "Work Report" in their navigation
- Users without access will not see the menu item
- Access is checked on every page load

## Usage

### For Users
1. Navigate to "Work Report" from the sidebar
2. Use filters to narrow down the data
3. Click the eye icon to view detailed information
4. Export data as needed

### For Admins
1. Manage access through the Users page
2. Monitor team productivity through the reports
3. Use export functionality for external analysis

## Security Considerations
- Users can only see work reports from their team members
- Access is controlled at the database level
- Team membership is verified before showing data
- Individual work log access is still restricted to the owner

## Future Enhancements
- Real-time updates when new work logs are added
- Advanced analytics and charts
- Team performance metrics
- Custom date range presets
- Bulk export options
