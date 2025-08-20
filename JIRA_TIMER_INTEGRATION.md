# JIRA Timer & Work Log Integration

This document describes the enhanced timer and work log functionality with JIRA integration in the Alignzo Lite application.

## Overview

The enhanced timer and work log modals now support seamless integration with JIRA, allowing users to:
- Choose between custom tickets and JIRA tickets
- Search existing JIRA tickets using LIKE operator
- Create new JIRA tickets on-the-fly
- Link work logs to actual JIRA tickets

**Note**: The enhanced modals have now replaced the legacy timer and work log modals throughout the application. The legacy modals are no longer in use.

## Features

### 1. Ticket Source Selection
- **Custom**: Traditional work logging without JIRA integration
- **JIRA**: Enhanced mode with JIRA project mapping and ticket management

### 2. JIRA Project Mapping
- Automatic detection of JIRA integration
- Project mapping between dashboard projects and JIRA projects
- Filtered project selection based on user's team assignments

### 3. Ticket Search & Selection
- Search existing JIRA tickets by ticket ID or summary
- LIKE operator support for flexible searching
- Real-time search results with ticket details
- One-click ticket selection

### 4. New Ticket Creation
- "+ Add New Ticket" button for JIRA mode
- Automatic ticket creation with task details
- Self-assignment to the current user
- Seamless integration with work logging

## API Endpoints

### 1. Create JIRA Ticket
```
POST /api/jira/create-ticket
```
Creates a new JIRA ticket with the specified details.

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "projectKey": "PROJ",
  "summary": "Task summary",
  "description": "Task description",
  "issueType": "Task",
  "priority": "Medium"
}
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "key": "PROJ-123",
    "id": "12345",
    "fields": { ... }
  },
  "message": "JIRA ticket created successfully"
}
```

### 2. Search JIRA Tickets
```
POST /api/jira/search-tickets
```
Searches for existing JIRA tickets using LIKE operator.

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "projectKey": "PROJ",
  "searchTerm": "TASK-123",
  "maxResults": 20
}
```

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "key": "PROJ-123",
      "fields": {
        "summary": "Task Summary",
        "status": { "name": "In Progress" }
      }
    }
  ],
  "message": "Found 1 tickets"
}
```

## Components

### EnhancedTimerModal
- Enhanced timer modal with JIRA integration
- Supports both custom and JIRA ticket sources
- Real-time ticket search and creation
- Dynamic project category support

### EnhancedWorkLogModal
- Enhanced work log modal with JIRA integration
- Flexible time input formats (2h 30m, 2.5h, etc.)
- Automatic ticket creation for new tickets
- Seamless integration with existing work log system

## Database Schema

The work logs are stored in the `work_logs` table with the following structure:
```sql
CREATE TABLE work_logs (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id),
    ticket_id VARCHAR(255) NOT NULL,
    task_detail TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_pause_duration_seconds INTEGER NOT NULL DEFAULT 0,
    logged_duration_seconds INTEGER NOT NULL DEFAULT 0,
    dynamic_category_selections JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage Flow

### For JIRA Users:
1. Select "JIRA" as ticket source
2. Choose the mapped JIRA project from dropdown
3. Search for existing tickets or click "+ Add New Ticket"
4. If creating new ticket, enter task details
5. Select or create the ticket
6. Fill in additional details and start timer/save work log

### For Custom Work:
1. Select "Custom" as ticket source (or if no JIRA integration)
2. Enter custom ticket ID
3. Fill in task details and time spent
4. Start timer or save work log

## Configuration

### JIRA Integration Setup
1. Configure JIRA integration in `/alignzo/integrations`
2. Set up project mappings between dashboard and JIRA projects
3. Configure user mappings for JIRA assignee/reporter names

### Project Mappings
Project mappings are stored in the `jira_project_mappings` table:
```sql
CREATE TABLE jira_project_mappings (
    id UUID PRIMARY KEY,
    dashboard_project_id UUID REFERENCES projects(id),
    jira_project_key VARCHAR(255) NOT NULL,
    jira_project_name VARCHAR(500),
    integration_user_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Recent Changes (Latest Update)

### Legacy Modal Replacement
- **Enhanced Timer Modal**: Now replaces the legacy timer modal in the header
- **Enhanced Work Log Modal**: Now replaces the legacy work log modal in the reports page
- **Demo Page Removal**: The demo page has been removed as the enhanced modals are now integrated throughout the application

### Integration Points
- **Header Timer Button**: The "+" button in the header now opens the enhanced timer modal with JIRA integration
- **Reports Page**: The "Add Work Log" button now opens the enhanced work log modal with JIRA integration
- **Seamless Experience**: Users can now access JIRA integration features directly from the main application interface

## Error Handling

The system includes comprehensive error handling for:
- JIRA API failures
- Invalid ticket formats
- Missing project mappings
- Authentication issues
- Network timeouts

## Security

- All JIRA API calls use direct authentication
- User authentication is verified for all operations
- Project access is restricted based on team memberships
- API tokens are stored securely in the database

## Recent Fixes

### API Endpoint Fixes (Latest)
- **Fixed URL parsing error**: Removed relative URL usage in server-side API routes
- **Direct JIRA API calls**: All endpoints now call JIRA API directly instead of using proxy
- **Improved error handling**: Better error messages and logging
- **Enhanced debugging**: Added console logging for troubleshooting

### Known Issues Resolved
- ✅ Fixed "Failed to parse URL from /api/jira/proxy" error
- ✅ Fixed server-side fetch with relative URLs
- ✅ Improved error handling for JIRA API responses
- ✅ Added proper authentication headers

## Testing

A test script is available at `test-jira-api.js` to verify API endpoints:
```bash
node test-jira-api.js
```

## Future Enhancements

Potential future improvements:
- Bulk ticket creation
- Advanced JQL search support
- Time tracking synchronization with JIRA
- Work log comments integration
- Automated status updates
- Sprint and epic linking

## Troubleshooting

### Common Issues:
1. **JIRA integration not detected**: Check user integration setup
2. **No projects available**: Verify project mappings and team assignments
3. **Search not working**: Check JIRA API credentials and permissions
4. **Ticket creation fails**: Verify project key and user permissions in JIRA

### Debug Steps:
1. Check browser console for API errors
2. Verify JIRA credentials in integration settings
3. Confirm project mappings are correctly configured
4. Test JIRA API access directly
5. Check server logs for detailed error messages

### API Error Codes:
- **400**: Bad Request - Check request parameters
- **401**: Unauthorized - Check JIRA credentials
- **403**: Forbidden - Check JIRA permissions
- **404**: Not Found - Check project key or issue key
- **500**: Internal Server Error - Check server logs

### Recent Error Fixes:
- **URL Parsing Error**: Fixed by removing relative URLs in server-side code
- **Proxy Issues**: Resolved by direct JIRA API calls
- **Authentication**: Improved Basic Auth header creation
- **Error Messages**: Enhanced error reporting and logging
