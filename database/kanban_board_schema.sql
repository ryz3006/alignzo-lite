-- =====================================================
-- KANBAN BOARD DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema for the Kanban Board system
-- Run this file in your Supabase SQL Editor to set up the Kanban board functionality

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- KANBAN BOARD TABLES
-- =====================================================

-- Project categories table (for dynamic categorization)
CREATE TABLE IF NOT EXISTS project_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Project subcategories table
CREATE TABLE IF NOT EXISTS project_subcategories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Kanban board columns (status columns)
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., 'To Do', 'In Progress', 'Review', 'Done'
    description TEXT,
    color VARCHAR(7) DEFAULT '#10B981', -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Kanban tasks table
CREATE TABLE IF NOT EXISTS kanban_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES project_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE CASCADE,
    column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date TIMESTAMP WITH TIME ZONE,
    jira_ticket_id VARCHAR(255), -- Link to JIRA ticket
    jira_ticket_key VARCHAR(50), -- JIRA ticket key (e.g., PROJ-123)
    scope VARCHAR(20) DEFAULT 'project', -- 'personal' or 'project'
    created_by VARCHAR(255) NOT NULL, -- User email who created the task
    assigned_to VARCHAR(255), -- User email who is assigned to the task
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    sort_order INTEGER DEFAULT 0, -- For ordering within a column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments table (for tracking assignment history)
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) NOT NULL, -- User email
    assigned_by VARCHAR(255) NOT NULL, -- User email who made the assignment
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Task timeline table (for tracking all actions)
CREATE TABLE IF NOT EXISTS task_timeline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL, -- User who performed the action
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'assigned', 'moved', 'commented', 'linked_jira', etc.
    details JSONB, -- Additional details about the action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Project categories indexes
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_active ON project_categories(is_active);

-- Project subcategories indexes
CREATE INDEX IF NOT EXISTS idx_project_subcategories_category_id ON project_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_project_subcategories_active ON project_subcategories(is_active);

-- Kanban columns indexes
CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_active ON kanban_columns(is_active);

-- Kanban tasks indexes
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_id ON kanban_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_to ON kanban_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_created_by ON kanban_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_scope ON kanban_tasks(scope);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_jira_ticket ON kanban_tasks(jira_ticket_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_status ON kanban_tasks(status);

-- Task assignments indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON task_assignments(assigned_to);

-- Task timeline indexes
CREATE INDEX IF NOT EXISTS idx_task_timeline_task_id ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_task_timeline_user_email ON task_timeline(user_email);
CREATE INDEX IF NOT EXISTS idx_task_timeline_created_at ON task_timeline(created_at);

-- Task comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_email ON task_comments(user_email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Project categories policies
CREATE POLICY "Users can view categories for projects they have access to" ON project_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = project_categories.project_id
            AND u.email = current_user
        )
    );

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

CREATE POLICY "Users can update categories for projects they have access to" ON project_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = project_categories.project_id
            AND u.email = current_user
        )
    );

-- Project subcategories policies
CREATE POLICY "Users can view subcategories for categories they have access to" ON project_subcategories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_categories pc
            JOIN team_project_assignments tpa ON pc.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE pc.id = project_subcategories.category_id
            AND u.email = current_user
        )
    );

CREATE POLICY "Users can create subcategories for categories they have access to" ON project_subcategories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_categories pc
            JOIN team_project_assignments tpa ON pc.project_id = tpa.project_id
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE pc.id = project_subcategories.category_id
            AND u.email = current_user
        )
    );

-- Kanban columns policies
CREATE POLICY "Users can view columns for projects they have access to" ON kanban_columns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = kanban_columns.project_id
            AND u.email = current_user
        )
    );

CREATE POLICY "Users can create columns for projects they have access to" ON kanban_columns
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = kanban_columns.project_id
            AND u.email = current_user
        )
    );

-- Kanban tasks policies
CREATE POLICY "Users can view tasks they created or are assigned to, or project tasks they have access to" ON kanban_tasks
    FOR SELECT USING (
        created_by = current_user OR
        assigned_to = current_user OR
        (scope = 'project' AND EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = kanban_tasks.project_id
            AND u.email = current_user
        ))
    );

CREATE POLICY "Users can create tasks for themselves or projects they have access to" ON kanban_tasks
    FOR INSERT WITH CHECK (
        created_by = current_user AND (
            scope = 'personal' OR
            (scope = 'project' AND EXISTS (
                SELECT 1 FROM team_project_assignments tpa
                JOIN team_members tm ON tpa.team_id = tm.team_id
                JOIN users u ON tm.user_id = u.id
                WHERE tpa.project_id = kanban_tasks.project_id
                AND u.email = current_user
            ))
        )
    );

CREATE POLICY "Users can update tasks they created, are assigned to, or project tasks they have access to" ON kanban_tasks
    FOR UPDATE USING (
        created_by = current_user OR
        assigned_to = current_user OR
        (scope = 'project' AND EXISTS (
            SELECT 1 FROM team_project_assignments tpa
            JOIN team_members tm ON tpa.team_id = tm.team_id
            JOIN users u ON tm.user_id = u.id
            WHERE tpa.project_id = kanban_tasks.project_id
            AND u.email = current_user
        ))
    );

CREATE POLICY "Only task creator or admin can delete tasks" ON kanban_tasks
    FOR DELETE USING (
        created_by = current_user OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.email = current_user
            AND u.access_dashboard = true
        )
    );

-- Task assignments policies
CREATE POLICY "Users can view assignments for tasks they have access to" ON task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_assignments.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

CREATE POLICY "Users can create assignments for tasks they have access to" ON task_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_assignments.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

-- Task timeline policies
CREATE POLICY "Users can view timeline for tasks they have access to" ON task_timeline
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_timeline.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

CREATE POLICY "Users can create timeline entries for tasks they have access to" ON task_timeline
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_timeline.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

-- Task comments policies
CREATE POLICY "Users can view comments for tasks they have access to" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_comments.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

CREATE POLICY "Users can create comments for tasks they have access to" ON task_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM kanban_tasks kt
            WHERE kt.id = task_comments.task_id
            AND (
                kt.created_by = current_user OR
                kt.assigned_to = current_user OR
                (kt.scope = 'project' AND EXISTS (
                    SELECT 1 FROM team_project_assignments tpa
                    JOIN team_members tm ON tpa.team_id = tm.team_id
                    JOIN users u ON tm.user_id = u.id
                    WHERE tpa.project_id = kt.project_id
                    AND u.email = current_user
                ))
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON task_comments
    FOR UPDATE USING (user_email = current_user);

CREATE POLICY "Users can delete their own comments or admin can delete any" ON task_comments
    FOR DELETE USING (
        user_email = current_user OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.email = current_user
            AND u.access_dashboard = true
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_subcategories_updated_at BEFORE UPDATE ON project_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_tasks_updated_at BEFORE UPDATE ON kanban_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA INSERTION
-- =====================================================

-- Insert default kanban columns for new projects
CREATE OR REPLACE FUNCTION create_default_kanban_columns()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO kanban_columns (project_id, name, description, color, sort_order)
    VALUES 
        (NEW.id, 'To Do', 'Tasks that need to be started', '#6B7280', 1),
        (NEW.id, 'In Progress', 'Tasks currently being worked on', '#3B82F6', 2),
        (NEW.id, 'Review', 'Tasks ready for review', '#F59E0B', 3),
        (NEW.id, 'Done', 'Completed tasks', '#10B981', 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default columns for new projects
CREATE TRIGGER create_default_kanban_columns_trigger
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_default_kanban_columns();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_accessible_projects(user_email_param TEXT)
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR(255),
    product VARCHAR(255),
    country VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.id, p.name, p.product, p.country
    FROM projects p
    JOIN team_project_assignments tpa ON p.id = tpa.project_id
    JOIN team_members tm ON tpa.team_id = tm.team_id
    JOIN users u ON tm.user_id = u.id
    WHERE u.email = user_email_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get task timeline with user details
CREATE OR REPLACE FUNCTION get_task_timeline_with_users(task_id_param UUID)
RETURNS TABLE (
    id UUID,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id,
        tt.user_email,
        u.full_name,
        tt.action,
        tt.details,
        tt.created_at
    FROM task_timeline tt
    LEFT JOIN users u ON tt.user_email = u.email
    WHERE tt.task_id = task_id_param
    ORDER BY tt.created_at DESC;
END;
$$ LANGUAGE plpgsql;
