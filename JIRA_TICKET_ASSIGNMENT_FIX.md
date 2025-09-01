# JIRA Ticket Assignment Fix - Consistent User Assignment

## Issue Description
When creating JIRA tickets, the assignment behavior was inconsistent:
- **Some users** got tickets that were self-assigned (to themselves)
- **Other users** got tickets with undefined assignees
- **No users** got tickets properly assigned to the actual user creating them

## Root Cause
The problem was in the `create-ticket` API endpoint (`app/api/jira/create-ticket/route.ts`):

### What Was Happening (Incorrect)
1. **Every ticket creation** called `/rest/api/3/myself` with **integration user's** credentials
2. **Got integration user's** accountId (not the actual user's)
3. **Assigned every ticket** to the integration user
4. **Result**: All tickets were assigned to the same person (integration user)

### Why Some Users Saw Self-Assigned Tickets
- Users who **were the integration user** saw tickets assigned to themselves
- Users who **were NOT the integration user** saw tickets assigned to the integration user (appearing as "undefined" in their view)

## The Fix
Completely rewrote the assignment logic to properly assign tickets to the actual user creating them:

### New Assignment Flow
1. **Look up user mapping** in `jira_user_mappings` table
2. **Search JIRA for user** using the mapped JIRA username
3. **Get actual user's accountId** from JIRA
4. **Assign ticket to that user** instead of integration user

### Assignment Strategy
```typescript
// Step 1: Try project-specific user mapping
const userMappings = await supabase
  .from('jira_user_mappings')
  .select('jira_assignee_name, jira_reporter_name')
  .eq('user_email', userEmail)
  .eq('jira_project_key', projectKey)
  .single();

// Step 2: Fallback to any user mapping
if (!userMappings) {
  const fallbackMappings = await supabase
    .from('jira_user_mappings')
    .select('jira_assignee_name, jira_reporter_name')
    .eq('user_email', userEmail)
    .limit(1)
    .single();
}

// Step 3: Search JIRA for the user
const searchResponse = await fetch(`${baseUrl}/rest/api/3/user/search?query=${username}`);

// Step 4: Use found accountId for assignment
assignee: user.accountId
```

## Files Modified

### 1. `app/api/jira/create-ticket/route.ts` - Complete Rewrite
- **Removed**: Incorrect `/rest/api/3/myself` call
- **Added**: User mapping lookup from database
- **Added**: JIRA user search to get actual accountId
- **Added**: Proper assignment logic
- **Added**: Fallback handling for users without mappings

### 2. `test-jira-ticket-assignment.js` - New Test Script
- Tests ticket creation with assignment
- Tests multiple users to verify consistent behavior
- Shows assignment status and details

## Expected Results After Fix

### ✅ **Users WITH JIRA Mappings**
- Tickets will be **automatically assigned** to the correct user
- Assignment will use the **actual user's JIRA accountId**
- No more tickets assigned to integration user

### ✅ **Users WITHOUT JIRA Mappings**
- Tickets will be created **without assignment**
- Clear message: "No user mapping found for automatic assignment"
- User can manually assign in JIRA

### ✅ **Consistent Behavior**
- **All users** get the same assignment logic
- **No more self-assignment** for integration users
- **No more undefined assignees**

## How It Works Now

### 1. **User Creates Ticket**
```
User clicks "Create JIRA Ticket" → API receives userEmail
```

### 2. **Lookup User Mapping**
```
API queries jira_user_mappings table
├── First: project-specific mapping (jira_project_key = projectKey)
└── Fallback: any mapping for user (jira_project_key = null)
```

### 3. **Find JIRA User**
```
API searches JIRA for user with mapped username
├── Success: Get accountId and displayName
└── Failure: No assignment possible
```

### 4. **Create Ticket**
```
API creates ticket with assignee field
├── With assignee: assignee: { accountId: "user123" }
└── Without assignee: No assignee field
```

## Benefits

1. **Consistent Assignment**: All users get the same assignment logic
2. **Proper Ownership**: Tickets are assigned to the actual creator
3. **Fallback Support**: Gracefully handles users without mappings
4. **Clear Messaging**: Users know if assignment succeeded or failed
5. **No More Confusion**: No more self-assigned vs undefined assignee issues

## Configuration Required

### 1. **User Mappings Must Exist**
Users need entries in `jira_user_mappings` table:
```sql
INSERT INTO jira_user_mappings (
  user_email, 
  jira_assignee_name, 
  jira_reporter_name, 
  integration_user_email
) VALUES (
  'user@company.com', 
  'jira_username', 
  'jira_username', 
  'admin@company.com'
);
```

### 2. **JIRA Permissions**
- Integration user must have permission to assign tickets
- Integration user must have access to search users

## Testing

### Manual Testing
1. Create JIRA ticket from timer modal
2. Verify ticket is assigned to the correct user in JIRA
3. Check API response includes assignment information

### Automated Testing
Run the test script:
```bash
node test-jira-ticket-assignment.js
```

This will:
- Test ticket creation with assignment
- Test multiple users to verify consistency
- Show assignment status for each user

## Deployment Status
The fix is ready for deployment. The changes:
- **Fix the core assignment issue** completely
- **Maintain backward compatibility** for existing functionality
- **Add comprehensive error handling** and logging
- **Provide clear user feedback** about assignment status

## Expected User Experience

### Before Fix
- User A creates ticket → Gets assigned to integration user (confusing)
- User B creates ticket → Gets assigned to integration user (confusing)
- Integration user creates ticket → Gets self-assigned (confusing)

### After Fix
- User A creates ticket → Gets assigned to User A (correct!)
- User B creates ticket → Gets assigned to User B (correct!)
- User C (no mapping) creates ticket → No assignment, clear message (correct!)
