# Shift Schedule Setup Guide

This guide will help you set up the Shift Schedule functionality in your Alignzo Lite application.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the existing Alignzo Lite database schema
2. **Environment Variables**: Ensure your `.env.local` file is properly configured
3. **Existing Data**: Make sure you have projects, teams, and users set up

## Step 1: Database Setup

### Option A: Using the Setup Script (Recommended)

1. **Ensure your `.env.local` file exists** with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Run the setup script**:
   ```bash
   node scripts/create-shift-schedule-tables.js
   ```

### Option B: Manual Database Setup

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire content** from `database/shift_schedule_schema.sql`
4. **Execute the SQL**

## Step 2: Verify Setup

Run these queries in your Supabase SQL Editor to verify the setup:

```sql
-- Check if the table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'shift_schedules';

-- Check if the enum exists
SELECT typname FROM pg_type WHERE typname = 'shift_type';

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%shift%';
```

Expected results:
- `shift_schedules` table should exist
- `shift_type` enum should exist
- Functions: `upsert_shift_schedules`, `upsert_shift_schedules_bulk`, `get_shift_schedule`

## Step 3: Test the Feature

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the admin panel**:
   - Go to `http://localhost:3000/admin`
   - Login with admin credentials

3. **Access the Shift Schedule**:
   - Go to Dashboard (`/admin/dashboard`)
   - Click on "Shift Schedule" in the sidebar

4. **Test the functionality**:
   - Select a project
   - Select a team
   - Choose a month/year
   - Assign some shifts
   - Save the schedule
   - Download the CSV

## Step 4: Data Requirements

For the shift schedule to work properly, ensure you have:

### Projects
```sql
-- Check existing projects
SELECT * FROM projects;
```

### Teams
```sql
-- Check existing teams
SELECT * FROM teams;
```

### Team-Project Assignments
```sql
-- Check team-project assignments
SELECT 
  t.name as team_name,
  p.name as project_name
FROM team_project_assignments tpa
JOIN teams t ON tpa.team_id = t.id
JOIN projects p ON tpa.project_id = p.id;
```

### Team Members
```sql
-- Check team members
SELECT 
  t.name as team_name,
  u.email,
  u.full_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN users u ON tm.user_id = u.id;
```

## Troubleshooting

### Issue: "No teams showing for selected project"
**Solution**: Ensure teams are assigned to projects
```sql
-- Assign a team to a project
INSERT INTO team_project_assignments (team_id, project_id)
VALUES ('team_uuid', 'project_uuid');
```

### Issue: "No team members showing"
**Solution**: Ensure users are added to teams
```sql
-- Add a user to a team
INSERT INTO team_members (team_id, user_id)
VALUES ('team_uuid', 'user_uuid');
```

### Issue: "Save operation fails"
**Solution**: Check database permissions
```sql
-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'shift_schedules';
```

### Issue: "Script fails with environment variables"
**Solution**: Check your `.env.local` file
```bash
# Ensure these variables exist in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Sample Data Setup

If you need to create sample data for testing:

```sql
-- Create a sample project
INSERT INTO projects (name, product, country) 
VALUES ('Sample Project', 'Product A', 'USA');

-- Create a sample team
INSERT INTO teams (name) 
VALUES ('Sample Team');

-- Create a sample user
INSERT INTO users (full_name, email) 
VALUES ('John Doe', 'john@example.com');

-- Assign team to project
INSERT INTO team_project_assignments (team_id, project_id)
SELECT t.id, p.id 
FROM teams t, projects p 
WHERE t.name = 'Sample Team' AND p.name = 'Sample Project';

-- Add user to team
INSERT INTO team_members (team_id, user_id)
SELECT t.id, u.id 
FROM teams t, users u 
WHERE t.name = 'Sample Team' AND u.email = 'john@example.com';
```

## Security Considerations

The shift schedule feature includes:
- **Row Level Security (RLS)** enabled on all tables
- **Public read/write access** for admin functionality
- **Input validation** on the frontend
- **SQL injection protection** through parameterized queries

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase logs
3. Verify all database tables and functions exist
4. Ensure proper data relationships are set up

## Next Steps

After successful setup:
1. **Train your team** on using the shift schedule feature
2. **Set up regular backups** of your shift schedule data
3. **Monitor usage** and gather feedback for improvements
4. **Consider implementing** additional features like shift templates or automated scheduling
