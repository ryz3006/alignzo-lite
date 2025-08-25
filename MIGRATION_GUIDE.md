# Migration Guide: JSONB to Table-Based Categories

This guide documents the migration from JSONB-based category storage to a proper table-based structure for better reporting and data analysis.

## Overview

The migration converts:
- Category options from JSONB arrays to a dedicated `category_options` table
- Subcategory options from JSONB arrays to a dedicated `subcategory_options` table
- Work log category selections from JSONB to `work_log_category_selections` table
- Timer category selections from JSONB to `timer_category_selections` table

## Schema Compatibility

The migration script is designed to work with both schema variants:

### Main Schema (`database/schema.sql`)
- `project_categories` has an `options JSONB` column
- Migration extracts options directly from the JSONB column

### Kanban Schema (`database/kanban_board_schema_clean.sql`)
- `project_categories` has a `description TEXT` column (no `options` column)
- Migration parses options from the description field (format: "Category with options: option1, option2")

## Migration Steps

### 1. Backup Your Database
Before running any migration, create a backup of your database.

### 2. Run the Migration Script
Execute the migration script in your Supabase SQL Editor:

```sql
-- Run the complete migration script
-- This will create new tables and migrate existing data
```

### 3. Verify Migration
After running the migration, verify that:
- New tables are created: `category_options`, `subcategory_options`, `work_log_category_selections`, `timer_category_selections`
- Existing category data is migrated correctly
- New API endpoints work as expected

## API Endpoints

### Categories and Options
- `GET /api/categories/project-options` - Get categories with options for a project
- `POST /api/categories/options` - Create a new category option
- `PUT /api/categories/options/[id]` - Update a category option
- `DELETE /api/categories/options/[id]` - Delete a category option

### Subcategories and Options
- `POST /api/subcategories/options` - Create a new subcategory option
- `PUT /api/subcategories/options/[id]` - Update a subcategory option
- `DELETE /api/subcategories/options/[id]` - Delete a subcategory option

### Category Selections
- `POST /api/work-logs/category-selections` - Save work log category selections
- `GET /api/work-logs/category-selections/[workLogId]` - Get work log category selections
- `POST /api/timers/category-selections` - Save timer category selections
- `GET /api/timers/category-selections/[timerId]` - Get timer category selections

## Troubleshooting

### Error: "column 'options' does not exist"
This error occurs when the migration script tries to access the `options` column in a schema that doesn't have it.

**Solution**: The updated migration script automatically detects which schema is being used and handles both cases:
- If `options` column exists: Uses JSONB data directly
- If `options` column doesn't exist: Parses options from the `description` field

### Data Not Migrating
If categories are not being migrated:

1. Check if categories have options in the expected format
2. For kanban schema: Ensure description contains "options:" followed by comma-separated values
3. For main schema: Ensure the `options` JSONB column contains valid arrays

### API Endpoints Not Working
If new API endpoints return errors:

1. Verify that the new tables were created successfully
2. Check that RLS policies are in place
3. Ensure the RPC functions are created correctly

## Rollback Plan

If you need to rollback the migration:

1. Drop the new tables:
```sql
DROP TABLE IF EXISTS timer_category_selections CASCADE;
DROP TABLE IF EXISTS work_log_category_selections CASCADE;
DROP TABLE IF EXISTS subcategory_options CASCADE;
DROP TABLE IF EXISTS category_options CASCADE;
```

2. Drop the RPC functions:
```sql
DROP FUNCTION IF EXISTS get_project_category_options(UUID);
DROP FUNCTION IF EXISTS get_project_subcategory_options(UUID);
DROP FUNCTION IF EXISTS get_work_log_category_selections(UUID);
DROP FUNCTION IF EXISTS get_timer_category_selections(UUID);
```

3. Revert to using the old JSONB-based approach in your application code

## Project-Specific Mapping

Categories and subcategories are project-specific:
- Each category belongs to a specific project (`project_id` foreign key)
- Each subcategory belongs to a specific category (`category_id` foreign key)
- This creates a hierarchy: Project → Categories → Subcategories

When creating reports, you can filter by project to get only relevant categories and subcategories.

## Performance Considerations

The new table-based structure provides better performance for:
- Filtering and searching by category/subcategory
- Generating reports based on category data
- Joining with other tables for complex queries

Indexes are created on frequently queried columns for optimal performance.
