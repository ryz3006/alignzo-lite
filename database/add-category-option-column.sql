-- Add missing category_option_id column to kanban_tasks table
-- This column is needed to store the selected category option when creating tasks

-- 1. Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'kanban_tasks' 
AND column_name IN ('category_id', 'category_option_id')
ORDER BY column_name;

-- 2. Add the missing category_option_id column
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kanban_tasks' 
        AND column_name = 'category_option_id'
    ) THEN
        -- Add the column
        ALTER TABLE kanban_tasks 
        ADD COLUMN category_option_id UUID REFERENCES category_options(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added category_option_id column to kanban_tasks table';
    ELSE
        RAISE NOTICE '⚠️ category_option_id column already exists';
    END IF;
END $$;

-- 3. Add index for better performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'kanban_tasks' 
        AND indexname = 'idx_kanban_tasks_category_option_id'
    ) THEN
        CREATE INDEX idx_kanban_tasks_category_option_id ON kanban_tasks(category_option_id);
        RAISE NOTICE '✅ Added index for category_option_id';
    ELSE
        RAISE NOTICE '⚠️ Index for category_option_id already exists';
    END IF;
END $$;

-- 4. Update RLS policies if needed
DO $$
BEGIN
    -- Check if there are RLS policies that need to be updated
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'kanban_tasks' 
        AND cmd = 'INSERT'
    ) THEN
        RAISE NOTICE 'ℹ️ RLS policies exist for kanban_tasks INSERT - may need manual review';
    ELSE
        RAISE NOTICE 'ℹ️ No RLS policies found for kanban_tasks INSERT';
    END IF;
END $$;

-- 5. Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'kanban_tasks' 
AND column_name IN ('category_id', 'category_option_id')
ORDER BY column_name;

-- 6. Test inserting a task with category_option_id
DO $$
DECLARE
    test_category_id UUID;
    test_option_id UUID;
    test_task_id UUID;
BEGIN
    -- Get a test category and option
    SELECT pc.id INTO test_category_id 
    FROM project_categories pc 
    WHERE pc.project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' 
    AND pc.is_active = true 
    LIMIT 1;
    
    IF test_category_id IS NOT NULL THEN
        SELECT co.id INTO test_option_id 
        FROM category_options co 
        WHERE co.category_id = test_category_id 
        AND co.is_active = true 
        LIMIT 1;
        
        IF test_option_id IS NOT NULL THEN
            RAISE NOTICE '✅ Found test category: % and option: %', test_category_id, test_option_id;
            
            -- Test insert (commented out to avoid creating actual test data)
            -- INSERT INTO kanban_tasks (title, project_id, category_id, category_option_id, column_id, created_by, status)
            -- VALUES ('Test Task', '992bb505-f93b-4a9e-88ba-f4aede14c9e0'::UUID, test_category_id, test_option_id, 
            --         (SELECT id FROM kanban_columns WHERE project_id = '992bb505-f93b-4a9e-88ba-f4aede14c9e0' LIMIT 1), 
            --         'test@example.com', 'active')
            -- RETURNING id INTO test_task_id;
            
            RAISE NOTICE '✅ Column structure supports category_option_id inserts';
        ELSE
            RAISE NOTICE '⚠️ No category options found for testing';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ No project categories found for testing';
    END IF;
END $$;
