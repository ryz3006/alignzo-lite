# Shift Enum Management Setup Guide

This guide covers the setup and usage of the new custom shift enum management feature for the Shift Schedule system.

## Overview

The Shift Enum Management feature allows administrators to create custom shift types for specific project-team combinations. This provides flexibility to define shifts that match your organization's specific requirements rather than being limited to the default shift types.

## Database Setup

### 1. Run the Updated Schema

Execute the updated `database/shift_schedule_schema.sql` file in your Supabase SQL Editor. This will create:

- `custom_shift_enums` table for storing custom shift definitions
- Helper functions for managing shift enums
- Validation functions for automatic shift correction

### 2. Verify Setup

After running the schema, verify that the following objects were created:

```sql
-- Check if the table exists
SELECT * FROM custom_shift_enums LIMIT 1;

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('get_custom_shift_enums', 'validate_and_update_shifts');
```

## Feature Components

### 1. Custom Shift Enum Table

The `custom_shift_enums` table stores:
- **project_id**: Reference to the project
- **team_id**: Reference to the team
- **shift_identifier**: Short code (e.g., "M", "A", "N")
- **shift_name**: Full name (e.g., "Morning", "Afternoon", "Night")
- **start_time**: Shift start time in 24-hour format
- **end_time**: Shift end time in 24-hour format
- **is_default**: Boolean flag for default shift designation

### 2. Management Interface

The "Manage Shifts" button opens a modal with:
- **Add/Edit Form**: Create and modify shift types
- **Shift List**: View all defined shifts for the project-team
- **Validation Tool**: Automatically correct invalid assignments
- **Default Management**: Set and manage default shifts

### 3. Automatic Validation

The system automatically:
- Validates uploaded CSV data against custom shift definitions
- Replaces invalid shifts with the designated default shift
- Provides feedback on validation results

## Usage Workflow

### Step 1: Access Shift Management

1. Navigate to `/admin/dashboard/shift-schedule`
2. Select a project and team
3. Click the "Manage Shifts" button

### Step 2: Create Custom Shift Types

1. Click "Add Shift Enum"
2. Fill in the form:
   - **Shift Identifier**: Short code (max 10 characters)
   - **Shift Name**: Descriptive name
   - **Start Time**: 24-hour format (e.g., "09:00")
   - **End Time**: 24-hour format (e.g., "17:00")
   - **Default**: Check if this should be the default shift
3. Click "Save"

### Step 3: Set Default Shift

1. Ensure at least one shift type is marked as default
2. The default shift is used for:
   - Invalid CSV uploads
   - Manual validation corrections
   - Fallback when custom enums are not defined

### Step 4: Validate Existing Data

1. Click "Validate Shifts" to check current assignments
2. The system will automatically correct invalid shifts
3. Review the results and feedback

## CSV Upload with Custom Shifts

### Format Requirements

The CSV format remains the same, but validation now uses custom shift definitions:

```
Email,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31
user@example.com,M,A,N,G,H,L,M,A,N,G,H,L,M,A,N,G,H,L,M,A,N,G,H,L,M,A,N,G,H,L,M
```

### Validation Process

1. **Custom Enums Defined**: System validates against custom shift identifiers
2. **No Custom Enums**: System falls back to default shift types (M, A, N, G, H, L)
3. **Invalid Shifts**: Automatically replaced with the designated default shift
4. **Feedback**: Detailed report of updates, skips, and corrections

## Example Scenarios

### Scenario 1: Manufacturing Shifts

**Custom Shifts:**
- **E**: Early Shift (06:00-14:00)
- **D**: Day Shift (14:00-22:00)
- **N**: Night Shift (22:00-06:00)
- **O**: Off Duty (Default)

**CSV Upload:**
```
Email,1,2,3,4,5,6,7,8,9,10
user1@example.com,E,D,N,O,E,D,N,O,E,D
user2@example.com,D,N,O,E,D,N,O,E,D,N
```

### Scenario 2: Office Shifts

**Custom Shifts:**
- **M**: Morning (08:00-16:00)
- **A**: Afternoon (16:00-00:00)
- **F**: Flex (Default)
- **H**: Holiday

**CSV Upload:**
```
Email,1,2,3,4,5,6,7,8,9,10
user1@example.com,M,A,F,H,M,A,F,H,M,A
```

## Best Practices

### 1. Shift Identifier Naming

- Use short, memorable codes (1-3 characters recommended)
- Avoid special characters
- Be consistent across projects
- Consider using uppercase for clarity

### 2. Time Format

- Always use 24-hour format
- Be precise with start and end times
- Consider overlap for shift handovers
- Account for breaks and meal times

### 3. Default Shift Selection

- Choose the most common shift as default
- Consider operational requirements
- Ensure default shift covers normal working hours
- Review and update defaults as needed

### 4. Validation Strategy

- Run validation after major CSV uploads
- Regular validation checks for data integrity
- Monitor validation reports for patterns
- Update shift definitions based on validation feedback

## Troubleshooting

### Common Issues

1. **"Shift identifier already exists"**
   - Each identifier must be unique within a project-team combination
   - Use different identifiers or modify existing ones

2. **"No default shift defined"**
   - Always set one shift type as default
   - Required for validation and error handling

3. **"Invalid shift type" in CSV uploads**
   - Check that CSV shift codes match defined identifiers
   - Review custom shift definitions for the project-team

4. **Validation not working**
   - Ensure custom shifts are defined for the project-team
   - Check that a default shift is designated
   - Verify database functions are properly installed

### Database Queries for Debugging

```sql
-- Check custom shifts for a project-team
SELECT * FROM custom_shift_enums 
WHERE project_id = 'your-project-id' 
AND team_id = 'your-team-id';

-- Check for default shifts
SELECT * FROM custom_shift_enums 
WHERE is_default = true;

-- Validate shift assignments
SELECT * FROM shift_schedules 
WHERE project_id = 'your-project-id' 
AND team_id = 'your-team-id'
AND shift_type::VARCHAR NOT IN (
    SELECT shift_identifier FROM custom_shift_enums 
    WHERE project_id = 'your-project-id' 
    AND team_id = 'your-team-id'
);
```

## Migration from Default Shifts

### Existing Data

- Existing shift schedules continue to work with default shift types
- Custom enums only apply to new assignments or when explicitly selected
- No data migration required

### Gradual Adoption

1. Start with one project-team combination
2. Define custom shifts based on actual requirements
3. Test with small CSV uploads
4. Expand to other project-team combinations
5. Monitor and adjust based on usage patterns

## Security Considerations

### Access Control

- Only admin users can manage shift enums
- Project-team specific access controls
- Audit trail for shift definition changes

### Data Integrity

- Unique constraints prevent duplicate identifiers
- Foreign key constraints maintain referential integrity
- Validation functions ensure data consistency

## Performance Considerations

### Database Optimization

- Indexes on project_id, team_id, and shift_identifier
- Efficient queries for shift validation
- Minimal impact on existing shift schedule operations

### UI Performance

- Lazy loading of custom shift definitions
- Efficient validation feedback
- Responsive modal interface

## Future Enhancements

### Potential Features

1. **Shift Templates**: Predefined shift patterns
2. **Bulk Shift Management**: Import/export shift definitions
3. **Shift Analytics**: Usage patterns and optimization
4. **Advanced Validation**: Business rule validation
5. **Shift Rotation**: Automatic shift rotation patterns

### Integration Opportunities

1. **Time Tracking**: Integration with time tracking systems
2. **Payroll**: Shift-based payroll calculations
3. **Compliance**: Labor law compliance checking
4. **Reporting**: Advanced shift analytics and reporting

## Support and Maintenance

### Regular Maintenance

1. **Review Shift Definitions**: Periodic review of custom shifts
2. **Update Defaults**: Adjust default shifts based on usage
3. **Clean Up**: Remove unused shift definitions
4. **Monitor Performance**: Track validation and upload performance

### Backup and Recovery

- Include custom_shift_enums in regular database backups
- Document shift definitions for disaster recovery
- Test restoration procedures regularly

---

This setup guide provides comprehensive coverage of the Shift Enum Management feature. For additional support or questions, refer to the main Shift Schedule documentation or contact the development team.
