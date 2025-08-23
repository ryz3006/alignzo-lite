# Shift Schedule Metrics View

## Overview

The Shift Schedule page has been redesigned to provide a modern metrics view that displays shift schedules in a table format with users as rows and days as columns. This provides a comprehensive overview of team schedules for any given month.

## Features

### 1. **Metrics Table Layout**
- **Rows**: Users (with email, name, team, and project information)
- **Columns**: Days of the selected month (with weekday abbreviations)
- **Cells**: Color-coded shift types for each user on each day

### 2. **Filtering System**
- **Year Selection**: Choose from current year ±2 years
- **Month Selection**: Select any month (1-12)
- **Team Selection**: Choose specific team or "All Teams"
- **Apply Button**: Load data only when filters are applied

### 3. **Data Loading Behavior**
- **Initial State**: No data shown until filters are applied
- **Loading State**: Shows spinner and "Loading shift metrics..." message
- **Data State**: Displays metrics table with user schedules
- **Empty State**: Shows appropriate message when no data is found

### 4. **Color Coding System**
- **Custom Shift Enums**: Uses colors from `custom_shift_enums.color` column
- **Default Shift Types**: Fallback colors for standard shift types (M, A, N, G, H, L)
- **Visual Consistency**: Colors work with both light and dark themes

### 5. **Responsive Design**
- **Sticky First Column**: User information remains visible during horizontal scroll
- **Modern UI**: Clean, professional appearance with proper spacing and shadows
- **Dark/Light Theme**: Compatible with system theme preferences

## Database Integration

### Tables Used
1. **`shift_schedules`**: Main shift data
   - `project_id`, `team_id`, `user_email`, `shift_date`, `shift_type`

2. **`custom_shift_enums`**: Custom shift definitions and colors
   - `shift_identifier`, `shift_name`, `color`, `project_id`, `team_id`

3. **`teams`**: Team information
   - `id`, `name`

4. **`projects`**: Project information
   - `id`, `name`

5. **`team_members`**: User-team relationships
   - `team_id`, `user_id`

6. **`team_project_assignments`**: Team-project relationships
   - `team_id`, `project_id`

7. **`users`**: User information
   - `id`, `email`, `full_name`

### Data Flow
1. User selects filters (Year, Month, Team)
2. System queries database for:
   - Team members in selected teams
   - Project assignments for those teams
   - Custom shift enums for team-project combinations
   - Shift schedules for the selected month and teams
3. Data is processed into metrics format
4. Table is rendered with color-coded shift cells

## User Experience

### Initial Load
- Page loads with no data
- User sees filter controls and "No data loaded" message
- User's current shift information is displayed (today/tomorrow)

### Filter Application
- User selects desired filters
- Clicks "Apply" button
- Loading state is shown
- Data is fetched from database
- Success toast notification is displayed

### Data Display
- Each row represents a user with their team and project
- Each column represents a day with weekday abbreviation
- Shift cells show shift type code with custom colors
- Empty cells show "-" for days without shifts

### Responsive Behavior
- Table scrolls horizontally for months with many days
- First column (User info) remains sticky for easy reference
- Mobile-friendly design with proper touch targets

## Technical Implementation

### State Management
- `shiftMetrics`: Array of user shift data
- `dataLoaded`: Boolean flag for data loading state
- `loading`: Boolean flag for API call state
- `customShiftEnums`: Array of custom shift definitions

### Key Functions
- `loadShiftMetrics()`: Main data loading function
- `getShiftDisplay()`: Shift type to display info mapping
- `getDaysInMonth()`: Generate array of month days
- `handleApplyFilters()`: Trigger data loading

### Error Handling
- Graceful fallbacks for missing data
- User-friendly error messages
- Toast notifications for success/error states

## Styling

### Color Scheme
- **Primary**: Blue (#0ea5e9) for primary actions
- **Success**: Green (#22c55e) for general shifts
- **Warning**: Yellow (#f59e0b) for leave shifts
- **Danger**: Red (#ef4444) for holiday shifts
- **Info**: Purple (#8b5cf6) for afternoon shifts
- **Secondary**: Indigo (#6366f1) for night shifts

### CSS Classes
- `shadow-soft`: Subtle shadow for cards
- `shadow-medium`: Medium shadow for hover states
- `animate-fade-in`: Smooth fade-in animation
- Responsive grid layouts with Tailwind CSS

## Future Enhancements

### Potential Improvements
1. **Export Functionality**: CSV/PDF export of shift data
2. **Bulk Editing**: Modify multiple shifts at once
3. **Shift Templates**: Pre-defined shift patterns
4. **Conflict Detection**: Identify scheduling conflicts
5. **Shift Statistics**: Summary views and analytics
6. **Mobile App**: Native mobile application
7. **Real-time Updates**: Live shift schedule updates
8. **Shift Swap Requests**: User-initiated shift changes

### Performance Optimizations
1. **Pagination**: Handle large datasets efficiently
2. **Caching**: Cache frequently accessed data
3. **Lazy Loading**: Load data on demand
4. **Virtual Scrolling**: Handle thousands of users efficiently

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: CSS Grid, Flexbox, CSS Custom Properties, ES6+

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliant color combinations
- **Focus Management**: Clear focus indicators
- **Responsive Text**: Scalable text sizes

## Security

- **Row Level Security**: Database-level access control
- **User Authentication**: Required for all operations
- **Team Access Control**: Users can only see their team data
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Protection**: Parameterized queries

## Troubleshooting

### Common Issues
1. **No Data Loading**: Check filter selections and click Apply
2. **Missing Colors**: Verify custom_shift_enums table has color values
3. **Permission Errors**: Ensure user has access to selected teams
4. **Performance Issues**: Consider reducing date range or team selection

### Debug Information
- Browser console shows detailed error messages
- Network tab displays API call details
- Database logs show query execution details
- User permissions are logged for access control issues
