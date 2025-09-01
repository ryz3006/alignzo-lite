# JIRA Project Mapping Delete 400 Error Fix

## Issue Description
When attempting to delete a project mapping in the JIRA integrations, the following error was occurring:

```
DELETE https://alignzo-lite.vercel.app/api/integrations/jira/project-mapping?mappingId=8b37bafb-87d1-4dab-a8a8-fb5900fdefb4 400 (Bad Request)
```

## Root Cause
The issue was a parameter name mismatch between the frontend and backend:

- **Frontend** (`app/alignzo/integrations/page.tsx` line 289): Sending `mappingId` as query parameter
- **Backend** (`app/api/integrations/jira/project-mapping/route.ts` line 147): Expecting `id` as query parameter

## Fix Applied
Updated the backend DELETE endpoint in `app/api/integrations/jira/project-mapping/route.ts` to accept both parameter names for backward compatibility:

```typescript
// Before
const mappingId = searchParams.get('id');

// After  
const mappingId = searchParams.get('mappingId') || searchParams.get('id');
```

## Files Modified
- `app/api/integrations/jira/project-mapping/route.ts` - Updated DELETE endpoint parameter handling

## Testing
Created a test script `test-project-mapping-delete.js` to verify the fix works with both parameter names.

## Verification Steps
1. The fix ensures the API accepts `mappingId` parameter (as sent by frontend)
2. Maintains backward compatibility with `id` parameter
3. Database table `jira_project_mappings` has correct UUID primary key structure
4. RLS policies are properly configured for delete operations

## Related Endpoints
- User mapping delete endpoint (`/api/integrations/jira/user-mapping`) already correctly uses `mappingId` parameter
- Project mapping delete endpoint now fixed to match the same pattern

## Deployment
The fix is ready for deployment. The change is minimal and maintains backward compatibility.
