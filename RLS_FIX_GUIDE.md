# RLS Policy Fix Guide

## Problem Description

The error `"new row violates row-level security policy for table \"project_categories\""` occurs when trying to create categories in the admin project page. This happens because:

1. **RLS Policies are Active**: The `project_categories` table has Row-Level Security (RLS) enabled
2. **User Context Missing**: The RLS policies check for `current_user`, but this context isn't properly set during admin operations
3. **Admin Operations Restricted**: Admin operations are being performed through the regular Supabase client (anon key) instead of bypassing RLS

## Root Cause

The RLS policies in `database/kanban_board_schema_clean.sql` require users to have access to projects through team assignments:

```sql
CREATE POLICY "Users can create categories for projects they have access to" ON project_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = project_categories.project_id
            AND u.email = current_user
        )
    );
```

However, admin operations don't go through this user-team-project relationship, causing the policy to fail.

## Solutions

### Solution 1: Use Service Role Key (Recommended)

**Pros**: 
- Bypasses RLS entirely for admin operations
- Most secure approach
- No need to modify existing policies

**Cons**: 
- Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Service role key has full database access

**Implementation**:
1. Add `SUPABASE_SERVICE_ROLE_KEY` to your Vercel environment variables
2. The updated `supabase-proxy` will automatically use the service role key for admin operations
3. No additional database changes needed

### Solution 2: Admin-Specific RLS Policies

**Pros**: 
- Works with existing anon key
- More granular control
- No need for service role key

**Cons**: 
- Requires database schema changes
- Need to maintain admin user list

**Implementation**:
1. Run the `database/admin_rls_policies.sql` script in your Supabase SQL Editor
2. Update the admin email list in the `is_admin_user()` function
3. The policies will allow admin operations while maintaining security for regular users

### Solution 3: Hybrid Approach (Current Implementation)

**Pros**: 
- Works with or without service role key
- Graceful fallback
- Maintains security

**Cons**: 
- More complex logic
- Requires both approaches to be implemented

**Implementation**:
1. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables (if available)
2. Run `database/admin_rls_policies.sql` as backup
3. The system will use service role key when available, otherwise fall back to admin policies

## Implementation Steps

### Step 1: Environment Variables

Add the following to your Vercel environment variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

To get your service role key:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the anon key)

### Step 2: Database Changes

Run the admin RLS policies script in your Supabase SQL Editor:

```sql
-- File: database/admin_rls_policies.sql
-- This creates admin-specific policies that allow admin operations
```

### Step 3: Update Admin User List

Edit the `is_admin_user()` function in the database to include your admin email:

```sql
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user IN (
        'your-admin-email@example.com',
        'riyas.siddikk@gmail.com',
        'admin@alignzo.com'
        -- Add more admin emails as needed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 4: Test the Fix

1. Deploy the changes to Vercel
2. Navigate to the admin project page
3. Try to create/edit categories
4. Check the browser console for any errors

## Verification

To verify the fix is working:

1. **Check Environment Variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
2. **Test Admin Operations**: Try creating categories in the admin interface
3. **Check Logs**: Look for "Using admin client" messages in the console
4. **Verify Security**: Ensure regular users still can't access admin operations

## Troubleshooting

### Error: "Service role key not available"

**Cause**: `SUPABASE_SERVICE_ROLE_KEY` environment variable is not set

**Solution**: 
1. Add the service role key to Vercel environment variables
2. Redeploy the application

### Error: "Admin user not found"

**Cause**: Your email is not in the admin user list

**Solution**: 
1. Update the `is_admin_user()` function in the database
2. Add your email to the admin list

### Error: "RLS policy still blocking"

**Cause**: Admin policies not applied correctly

**Solution**: 
1. Re-run the `admin_rls_policies.sql` script
2. Check that the policies were created successfully
3. Verify the `is_admin_user()` function returns true for your email

## Security Considerations

1. **Service Role Key**: Keep this key secure and never expose it to the client
2. **Admin List**: Regularly review and update the admin user list
3. **Audit Trail**: Consider implementing audit logging for admin operations
4. **Access Control**: Ensure only authorized users can access admin functions

## Files Modified

1. `app/api/supabase-proxy/route.ts` - Updated to handle admin operations
2. `database/admin_rls_policies.sql` - New admin-specific RLS policies
3. `app/admin/dashboard/projects/page.tsx` - Enhanced error handling and validation

## Next Steps

After implementing the fix:

1. Test all admin operations thoroughly
2. Monitor for any security issues
3. Consider implementing audit logging
4. Document the admin user management process
5. Set up regular security reviews
