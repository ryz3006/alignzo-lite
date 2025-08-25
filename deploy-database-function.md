# Database Function Deployment Guide

## Issue
The API is returning empty categories because the `get_project_categories_with_options` function hasn't been deployed to the production database yet.

## Solution
You need to run the updated database script in your production Supabase database.

## Steps to Deploy

### 1. Access Your Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### 2. Open the SQL Editor
1. In your Supabase dashboard, click on "SQL Editor" in the left sidebar
2. Click "New query"

### 3. Deploy the Function
1. Copy the entire contents of `database/kanban_performance_optimization.sql`
2. Paste it into the SQL Editor
3. Click "Run" to execute the script

### 4. Verify the Deployment
After running the script, you can verify it worked by running this test query:

```sql
-- Test the function
SELECT get_project_categories_with_options('992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID);

-- Check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_project_categories_with_options';
```

### 5. Test the API
After deployment, test the API endpoint:
```
https://alignzo-lite.vercel.app/api/categories/project-options?projectId=992bb505-f93b-4a9e-88ba-f4aede14c9e0
```

## Expected Results
- The function should be created successfully
- The API should return categories with their options
- The modal should display category options properly

## Troubleshooting
If you encounter any errors during deployment:
1. Check the Supabase logs for specific error messages
2. Make sure you have the necessary permissions to create functions
3. Verify that the `category_options` table exists and has data

## Alternative: Use Direct Queries
If the function deployment fails, the API is already configured to use direct database queries as a fallback, which should work once the database connection is properly established.
