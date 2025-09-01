# JIRA Projects API Fix - Return Actual Projects Instead of Mappings

## Issue Description
In the JIRA Integrations tab, the project mapping modal was showing existing project mappings instead of allowing users to search for new JIRA projects to map. The API endpoint `/api/integrations/jira/projects` was incorrectly returning database mappings instead of fetching actual JIRA projects from the JIRA API.

## Root Cause
The `/api/integrations/jira/projects` endpoint was incorrectly implemented:

1. **Expected Behavior**: Should call JIRA API to fetch available JIRA projects for mapping
2. **Actual Behavior**: Was querying the `jira_project_mappings` table and returning existing mappings
3. **Frontend Expectation**: Expected `data.projects` array of JIRA projects
4. **Backend Response**: Was returning `data.mappings` array of database records

## API Endpoints Fixed

### 1. `/api/integrations/jira/projects` (Fixed)
- **Before**: Returned `jira_project_mappings` from database
- **After**: Now calls JIRA API to fetch actual JIRA projects
- **Response Format**: `{ success: true, projects: [...] }`

### 2. `/api/integrations/jira/users` (Fixed)
- **Before**: Returned `jira_user_mappings` from database  
- **After**: Now calls JIRA API to fetch actual JIRA users
- **Response Format**: `{ success: true, users: [...] }`

## Implementation Details

### Projects Endpoint
```typescript
// Before - Incorrect database query
const { data, error } = await supabase
  .from('jira_project_mappings')
  .select('*')
  .eq('integration_user_email', userEmail);

// After - Correct JIRA API call
const jiraProjects = await getJiraProjects(userEmail);
```

### Users Endpoint
```typescript
// Before - Incorrect database query
const response = await supabaseClient.get('jira_user_mappings', {
  select: '*',
  filters: { integration_user_email: userEmail }
});

// After - Correct JIRA API call
const jiraUsers = await getJiraUsers(userEmail);
```

## Files Modified
1. `app/api/integrations/jira/projects/route.ts` - Complete rewrite to fetch from JIRA API
2. `app/api/integrations/jira/users/route.ts` - Complete rewrite to fetch from JIRA API

## Frontend Compatibility
- Frontend already expected `data.projects` format ✅
- No frontend changes required ✅
- Search functionality now works correctly ✅

## Testing
Created test script `test-jira-projects-api.js` to verify:
- API returns projects instead of mappings
- Search filtering works correctly
- Response format is correct

## Expected Results
After the fix:
1. **Project Mapping Modal**: Will show actual JIRA projects available for mapping
2. **Search Functionality**: Will filter JIRA projects by key/name
3. **User Experience**: Users can now properly search and select JIRA projects to map

## Related Endpoints
- `/api/integrations/jira/project-mapping` - Still returns mappings (correct behavior)
- `/api/integrations/jira/user-mapping` - Still returns mappings (correct behavior)
- `/api/integrations/jira/projects` - Now returns actual JIRA projects ✅
- `/api/integrations/jira/users` - Now returns actual JIRA users ✅

## Deployment Status
The fix is ready for deployment. The changes are:
- Minimal and focused
- Maintain backward compatibility where appropriate
- Fix the core functionality issue
- Improve user experience in project mapping
