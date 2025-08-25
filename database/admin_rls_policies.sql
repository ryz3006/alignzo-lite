-- =====================================================
-- ADMIN RLS POLICIES
-- =====================================================
-- This file contains RLS policies specifically for admin operations
-- These policies allow admin users to perform operations on admin tables
-- without requiring the service role key

-- =====================================================
-- ADMIN USER DETECTION FUNCTION
-- =====================================================

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user is in the admin list
    -- You can modify this list to include admin email addresses
    RETURN current_user IN (
        'admin@alignzo.com',
        'admin@example.com',
        'your-admin-email@example.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROJECT CATEGORIES ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage project categories" ON project_categories;
DROP POLICY IF EXISTS "Admin users can view all project categories" ON project_categories;

-- Admin policy for all operations on project_categories
CREATE POLICY "Admin users can manage project categories" ON project_categories
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all project categories
CREATE POLICY "Admin users can view all project categories" ON project_categories
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- PROJECT SUBCATEGORIES ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage project subcategories" ON project_subcategories;
DROP POLICY IF EXISTS "Admin users can view all project subcategories" ON project_subcategories;

-- Admin policy for all operations on project_subcategories
CREATE POLICY "Admin users can manage project subcategories" ON project_subcategories
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all project subcategories
CREATE POLICY "Admin users can view all project subcategories" ON project_subcategories
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- TEAM PROJECT ASSIGNMENTS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage team project assignments" ON team_project_assignments;
DROP POLICY IF EXISTS "Admin users can view all team project assignments" ON team_project_assignments;

-- Admin policy for all operations on team_project_assignments
CREATE POLICY "Admin users can manage team project assignments" ON team_project_assignments
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all team project assignments
CREATE POLICY "Admin users can view all team project assignments" ON team_project_assignments
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- PROJECTS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage projects" ON projects;
DROP POLICY IF EXISTS "Admin users can view all projects" ON projects;

-- Admin policy for all operations on projects
CREATE POLICY "Admin users can manage projects" ON projects
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all projects
CREATE POLICY "Admin users can view all projects" ON projects
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- TEAMS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage teams" ON teams;
DROP POLICY IF EXISTS "Admin users can view all teams" ON teams;

-- Admin policy for all operations on teams
CREATE POLICY "Admin users can manage teams" ON teams
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all teams
CREATE POLICY "Admin users can view all teams" ON teams
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- USERS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage users" ON users;
DROP POLICY IF EXISTS "Admin users can view all users" ON users;

-- Admin policy for all operations on users
CREATE POLICY "Admin users can manage users" ON users
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all users
CREATE POLICY "Admin users can view all users" ON users
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- CATEGORY OPTIONS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage category options" ON category_options;
DROP POLICY IF EXISTS "Admin users can view all category options" ON category_options;

-- Admin policy for all operations on category_options
CREATE POLICY "Admin users can manage category options" ON category_options
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all category options
CREATE POLICY "Admin users can view all category options" ON category_options
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- SUBCATEGORY OPTIONS ADMIN POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage subcategory options" ON subcategory_options;
DROP POLICY IF EXISTS "Admin users can view all subcategory options" ON subcategory_options;

-- Admin policy for all operations on subcategory_options
CREATE POLICY "Admin users can manage subcategory options" ON subcategory_options
    FOR ALL USING (is_admin_user())
    WITH CHECK (is_admin_user());

-- Admin policy for viewing all subcategory options
CREATE POLICY "Admin users can view all subcategory options" ON subcategory_options
    FOR SELECT USING (is_admin_user());

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Admin RLS policies have been successfully created!';
    RAISE NOTICE 'Admin users can now perform operations on:';
    RAISE NOTICE '- project_categories';
    RAISE NOTICE '- project_subcategories';
    RAISE NOTICE '- team_project_assignments';
    RAISE NOTICE '- projects';
    RAISE NOTICE '- teams';
    RAISE NOTICE '- users';
    RAISE NOTICE '- category_options';
    RAISE NOTICE '- subcategory_options';
    RAISE NOTICE '';
    RAISE NOTICE 'To add more admin users, modify the is_admin_user() function';
    RAISE NOTICE 'Current admin emails: admin@alignzo.com, riyas.siddikk@gmail.com, admin@example.com';
END $$;
