# Shift Display Fix for Team Availability

## Issue Description
In the user login dashboard "Today's Team Availability" section, users who should be shown as "Evening shift" are incorrectly displayed as "General/Day".

## Root Cause
The issue occurs because:
1. Shift details are stored in the `shift_schedules` table with short identifiers (e.g., 'E' for Evening)
2. The `custom_shift_enums` table maps these identifiers to full names, colors, and times
3. If a shift type exists in `shift_schedules` but not in `custom_shift_enums`, the system falls back to hardcoded defaults
4. The Evening shift ('E') was missing from the fallback mapping

## Solution Implemented

### 1. Fixed the `getShiftTypeInfo` function
- Added proper handling for Evening shift ('E') in the fallback mapping
- Ensured the function correctly maps `shift_identifier` to `shift_name` from custom enums
- Added Evening shift with appropriate styling (orange color, Moon icon)

### 2. Enhanced the fallback shift mapping
```typescript
const defaultShifts = {
  M: { label: 'Morning', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20', icon: Sun },
  A: { label: 'Afternoon', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/20', icon: Sun },
  N: { label: 'Night', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', icon: Moon },
  G: { label: 'General/Day', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20', icon: Sun },
  H: { label: 'Holiday', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/20', icon: CheckCircle },
  L: { label: 'Leave', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', icon: AlertCircle },
  E: { label: 'Evening', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/20', icon: Moon }, // Added Evening shift
};
```

### 3. Database Schema Requirements
The system expects the following tables to be properly configured:

#### `shift_schedules` table
- `shift_type`: Enum with values 'M', 'A', 'N', 'G', 'H', 'L', 'E'
- `project_id`: References projects table
- `team_id`: References teams table
- `user_email`: User's email address
- `shift_date`: Date of the shift

#### `custom_shift_enums` table
- `shift_identifier`: Short identifier (e.g., 'E')
- `shift_name`: Full name (e.g., 'Evening')
- `start_time`: Shift start time
- `end_time`: Shift end time
- `color`: Hex color code for display
- `is_default`: Whether this is the default shift

## Implementation Steps

### Step 1: Run the Database Fix Script
Execute the `scripts/fix-shift-enums.sql` script in your Supabase SQL Editor to ensure all shift types have proper custom enums defined.

### Step 2: Verify the Fix
1. Check that Evening shifts are now properly displayed in the Team Availability section
2. Verify that all shift types show their correct names, colors, and times
3. Test with different project-team combinations

### Step 3: Monitor the Console
The system will now properly handle all shift types, including Evening shifts, and display them with appropriate styling.

## Expected Behavior After Fix
- **Evening shifts ('E')**: Display as "Evening" with orange color and Moon icon
- **Morning shifts ('M')**: Display as "Morning" with blue color and Sun icon
- **Afternoon shifts ('A')**: Display as "Afternoon" with purple color and Sun icon
- **Night shifts ('N')**: Display as "Night" with indigo color and Moon icon
- **General shifts ('G')**: Display as "General/Day" with green color and Sun icon
- **Holiday shifts ('H')**: Display as "Holiday" with red color and CheckCircle icon
- **Leave shifts ('L')**: Display as "Leave" with yellow color and AlertCircle icon

## Troubleshooting

### If shifts still show incorrect names:
1. Check that `custom_shift_enums` table has entries for all shift types used in `shift_schedules`
2. Verify that the `shift_identifier` in custom enums matches the `shift_type` in shift schedules
3. Ensure the project-team combination has proper custom shift enum definitions

### If Evening shifts are not appearing:
1. Check that Evening shifts ('E') exist in the `shift_schedules` table
2. Verify that Evening shift enums are defined in `custom_shift_enums` for the relevant project-team combinations
3. Run the `scripts/fix-shift-enums.sql` script to create missing enums

## Files Modified
- `app/alignzo/page.tsx`: Fixed `getShiftTypeInfo` function and added Evening shift support
- `scripts/fix-shift-enums.sql`: Database script to ensure all shift types have proper enums
- `scripts/debug-shifts.sql`: Debug script to check current database state

## Testing
After implementing the fix:
1. Refresh the dashboard page
2. Check the "Today's Team Availability" section
3. Verify that Evening shifts display correctly as "Evening" instead of "General/Day"
4. Confirm that all other shift types display their proper names and colors
