# JIRA Ticket Assignment Fix

## Problem Statement

When creating JIRA tickets from the timer modal and work log modal, the assignee field was not being set. Tickets were being created without proper assignment to the logged-in user.

## Solution Implemented

### 1. Enhanced JIRA Library (`lib/jira.ts`)

#### New Helper Function: `getJiraUsernameForUser()`
```typescript
export async function getJiraUsernameForUser(userEmail: string, projectKey?: string): Promise<string | null>
```

This function:
- Looks up the JIRA username for a given user email from the `jira_user_mappings` table
- First tries to find a project-specific mapping
- Falls back to any mapping for the user if no project-specific mapping exists
- Returns the JIRA username or null if no mapping is found

#### Enhanced `createJiraIssue()` Function
- Added optional `assignee` parameter
- Passes the assignee to the underlying `createTicket` method

#### Enhanced `JiraIntegration.createTicket()` Method
- Added optional `assignee` parameter
- Includes assignee field in JIRA API request when provided
- Uses spread operator to conditionally include assignee: `...(assignee && { assignee: { name: assignee } })`

### 2. Updated Create Ticket API (`app/api/jira/create-ticket/route.ts`)

#### Enhanced Ticket Creation Logic
1. **User Mapping Lookup**: Calls `getJiraUsernameForUser(userEmail, projectKey)` to get the JIRA username
2. **Assignment Logic**: Passes the JIRA username to the ticket creation function
3. **Fallback**: If no mapping is found, the ticket is created without assignment (uses integration user)
4. **Enhanced Logging**: Added detailed logging to track assignment process
5. **Updated Response**: Success message now includes assignment information

### 3. User Mapping Integration

The system leverages the existing user mapping infrastructure:

#### Database Tables Used
- `jira_user_mappings`: Stores user email to JIRA username mappings
- `ticket_master_mappings`: Source of truth for user mappings (used to populate JIRA mappings)

#### Mapping Lookup Process
1. **Project-Specific**: First looks for mapping with specific project key
2. **Fallback**: If no project-specific mapping, looks for any mapping for the user
3. **Dynamic Creation**: The user mapping API automatically creates JIRA mappings from master mappings if none exist

## How It Works

### 1. Ticket Creation Flow
```
User creates ticket → Timer/WorkLog Modal → API call with userEmail
    ↓
API looks up JIRA username from mappings
    ↓
If mapping found: Assign ticket to user's JIRA username
If no mapping: Create ticket without assignment (integration user)
    ↓
Return success with assignment information
```

### 2. User Mapping Lookup
```
getJiraUsernameForUser(userEmail, projectKey)
    ↓
Query jira_user_mappings WHERE user_email = ? AND jira_project_key = ?
    ↓
If found: Return jira_assignee_name
If not found: Query jira_user_mappings WHERE user_email = ? (any project)
    ↓
Return jira_assignee_name or null
```

### 3. JIRA API Integration
```
createJiraIssue(credentials, {..., assignee})
    ↓
createTicket(credentials, ..., assignee)
    ↓
JIRA API POST /rest/api/3/issue
{
  "fields": {
    "project": {"key": "PROJECT"},
    "summary": "...",
    "description": "...",
    "issuetype": {"name": "Task"},
    "priority": {"name": "Medium"},
    "assignee": {"name": "jira_username"} // ← Added when assignee provided
  }
}
```

## Files Modified

1. **`lib/jira.ts`**
   - Added `getJiraUsernameForUser()` function
   - Enhanced `createJiraIssue()` with assignee parameter
   - Enhanced `JiraIntegration.createTicket()` with assignee support

2. **`app/api/jira/create-ticket/route.ts`**
   - Added user mapping lookup
   - Enhanced ticket creation with assignment
   - Updated logging and response messages

3. **`scripts/test-jira-assignment.js`** (New)
   - Test script to verify assignment functionality
   - Checks user mappings and simulates ticket creation

## Testing

### Manual Testing
1. Create a JIRA ticket from the timer modal
2. Verify the ticket is assigned to the logged-in user in JIRA
3. Check the API response includes assignment information

### Automated Testing
Run the test script:
```bash
node scripts/test-jira-assignment.js
```

This will:
- Check existing user mappings
- Verify master mappings
- Simulate the assignment lookup process
- Show what would happen during ticket creation

## Expected Behavior

### With User Mapping
```
Request: {"userEmail": "user@example.com", "projectKey": "PROJ", ...}
Response: {
  "success": true,
  "ticket": {"key": "PROJ-123", "id": "456"},
  "message": "JIRA ticket PROJ-123 created successfully and assigned to jira_username!"
}
```

### Without User Mapping
```
Request: {"userEmail": "user@example.com", "projectKey": "PROJ", ...}
Response: {
  "success": true,
  "ticket": {"key": "PROJ-123", "id": "456"},
  "message": "JIRA ticket PROJ-123 created successfully and assigned to integration_user!"
}
```

## Benefits

1. **Automatic Assignment**: Tickets are automatically assigned to the logged-in user
2. **Fallback Support**: Gracefully handles cases where no mapping exists
3. **Project-Specific**: Supports project-specific user mappings
4. **Backward Compatible**: Existing functionality remains unchanged
5. **Enhanced Logging**: Better visibility into assignment process
6. **User-Friendly**: Clear success messages with assignment information

## Configuration

### Required Setup
1. **User Mappings**: Ensure users have JIRA username mappings in `jira_user_mappings` table
2. **Master Mappings**: The system can auto-create JIRA mappings from `ticket_master_mappings`
3. **JIRA Permissions**: Integration user must have permission to assign tickets

### Optional Configuration
- **Project-Specific Mappings**: Create mappings with specific `jira_project_key` for project-specific assignment
- **Fallback Mappings**: Create mappings without project key for general assignment

## Troubleshooting

### Common Issues
1. **No Assignment**: Check if user mapping exists in database
2. **Permission Errors**: Verify integration user has assign permission in JIRA
3. **Invalid Username**: Ensure JIRA username in mapping exists in JIRA system

### Debug Steps
1. Check user mappings: `SELECT * FROM jira_user_mappings WHERE user_email = 'user@example.com'`
2. Verify JIRA username exists in JIRA system
3. Check API logs for assignment details
4. Run test script to verify mapping lookup

## Future Enhancements

1. **Bulk Assignment**: Support for assigning multiple tickets
2. **Assignment Rules**: Configurable assignment rules based on project, issue type, etc.
3. **Assignment History**: Track assignment changes over time
4. **Auto-Notification**: Send notifications when tickets are assigned
