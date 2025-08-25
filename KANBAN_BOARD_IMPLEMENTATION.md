# Kanban Board Implementation

## Overview

The Kanban Board is a comprehensive task management system integrated into the Alignzo Lite application. It provides a visual workflow management interface with drag-and-drop functionality, dynamic categorization, JIRA integration, and comprehensive task tracking.

## Features

### 🎯 **Core Functionality**
- **Visual Kanban Board**: Drag-and-drop interface with customizable columns
- **Dynamic Categories**: Project-level categories and subcategories with color coding
- **Task Management**: Create, edit, delete, and move tasks between columns
- **Scope Control**: Personal tasks (visible only to creator) vs. Project tasks (visible to all team members)

### 🔐 **Security & Access Control**
- **Row Level Security (RLS)**: Database-level access control
- **User Permissions**: Tasks are only visible to authorized users
- **Delete Protection**: Only task creators and admins can delete tasks
- **Project Access**: Users can only access projects they're assigned to

### 📊 **Task Features**
- **Priority Levels**: Low, Medium, High, Urgent with visual indicators
- **Time Tracking**: Estimated and actual hours
- **Due Dates**: Configurable deadlines with validation
- **Assignment**: Assign tasks to team members
- **Status Management**: Active, Completed, Archived states

### 🔗 **JIRA Integration**
- **Ticket Linking**: Link kanban tasks to JIRA tickets
- **Search Functionality**: Search JIRA tickets by key, summary, or description
- **Bidirectional Sync**: JIRA ticket information displayed in kanban tasks

### 📝 **Communication & Tracking**
- **Comments System**: Add comments to tasks
- **Timeline Tracking**: Complete audit trail of all task actions
- **Action History**: Track who did what and when
- **Real-time Updates**: Live updates across all users

### 🎨 **Customization**
- **Dynamic Columns**: Customizable kanban columns per project
- **Color Coding**: Visual distinction for categories, priorities, and statuses
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Consistent with application theme

## Database Schema

### Core Tables

#### `project_categories`
- Project-level categorization system
- Color coding and sort order
- Active/inactive status management

#### `project_subcategories`
- Hierarchical categorization under main categories
- Independent color coding and ordering

#### `kanban_columns`
- Customizable workflow columns
- Project-specific column configurations
- Default columns: To Do, In Progress, Review, Done

#### `kanban_tasks`
- Main task entity
- Links to categories, columns, and projects
- Scope control (personal vs. project)
- JIRA integration fields

#### `task_assignments`
- Assignment history tracking
- Notes and assignment reasons
- Audit trail for reassignments

#### `task_timeline`
- Complete action history
- User activity tracking
- JSON details for complex actions

#### `task_comments`
- Task discussion system
- User attribution and timestamps
- Edit and delete capabilities

## API Endpoints

### Task Management
- `GET /api/kanban/tasks` - Fetch tasks with filters
- `POST /api/kanban/tasks` - Create new task
- `PUT /api/kanban/tasks/:id` - Update existing task
- `DELETE /api/kanban/tasks/:id` - Delete task
- `POST /api/kanban/tasks/:id/move` - Move task between columns

### Category Management
- `GET /api/kanban/categories` - Fetch project categories
- `POST /api/kanban/categories` - Create new category
- `PUT /api/kanban/categories/:id` - Update category
- `DELETE /api/kanban/categories/:id` - Delete category

### JIRA Integration
- `GET /api/kanban/jira/search` - Search JIRA tickets
- `POST /api/kanban/jira/link` - Link JIRA ticket to task

## Setup Instructions

### 1. Database Setup
Run the SQL schema file in your Supabase SQL Editor:
```sql
-- Run the complete schema
\i database/kanban_board_schema.sql
```

### 2. Dependencies Installation
```bash
npm install react-beautiful-dnd @types/react-beautiful-dnd
```

### 3. Environment Configuration
Ensure your Supabase environment variables are properly configured:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Access Control
The Kanban Board uses the existing `access_dashboard` permission. Users with this permission can access the kanban board.

## Usage Guide

### Creating Tasks

1. **Navigate to Kanban Board**: Click "Kanban Board" in the sidebar
2. **Select Project**: Choose the project from the dropdown
3. **Create Task**: Click "New Task" button
4. **Fill Details**:
   - Title and description
   - Select category and subcategory
   - Choose priority and estimated hours
   - Set due date and assignee
   - Link JIRA ticket (optional)
   - Choose scope (personal or project)

### Managing Categories

1. **Access Categories**: Click "Categories" button in the kanban board
2. **Create Category**: Click "New Category"
3. **Configure**:
   - Name and description
   - Color selection from palette
   - Sort order
4. **Subcategories**: Create subcategories under existing categories

### Moving Tasks

1. **Drag and Drop**: Click and drag tasks between columns
2. **Visual Feedback**: Columns highlight when dragging over them
3. **Automatic Updates**: Task position and timeline are updated automatically

### Linking JIRA Tickets

1. **Open JIRA Modal**: Click "JIRA Tickets" button
2. **Search**: Enter search terms or ticket keys
3. **Select**: Click on desired ticket
4. **Link**: Confirm selection to link ticket to task

### Task Details and Comments

1. **View Details**: Click on any task card
2. **Add Comments**: Use the comment section
3. **View Timeline**: Check the timeline tab for action history
4. **Edit Task**: Use the edit button for modifications

## Security Features

### Row Level Security (RLS)
All tables implement RLS policies ensuring:
- Users can only see tasks they created, are assigned to, or have project access to
- Personal tasks are completely private
- Project tasks respect team membership
- Admin users have appropriate access levels

### Access Control
- **Task Creation**: Users can create tasks for themselves or projects they access
- **Task Editing**: Users can edit tasks they created, are assigned to, or have project access to
- **Task Deletion**: Only creators and admins can delete tasks
- **Category Management**: Project-level access required

### Data Validation
- **Input Validation**: All form inputs are validated
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## Performance Considerations

### Database Optimization
- **Indexes**: Comprehensive indexing on frequently queried fields
- **Efficient Queries**: Optimized JOIN operations
- **Pagination**: Support for large task lists

### Frontend Performance
- **Lazy Loading**: Components load on demand
- **State Management**: Efficient React state updates
- **Drag and Drop**: Smooth interactions with react-beautiful-dnd

## Integration Points

### Existing Systems
- **User Authentication**: Firebase authentication integration
- **Project Management**: Existing project structure
- **Team Management**: Current team assignment system
- **JIRA Integration**: Existing JIRA API connections

### Future Enhancements
- **Slack Notifications**: Task assignment and deadline notifications
- **Email Integration**: Automated email updates
- **Time Tracking**: Integration with existing timer system
- **Reporting**: Advanced analytics and reporting

## Troubleshooting

### Common Issues

#### Tasks Not Loading
- Check user permissions and project access
- Verify database connection
- Check browser console for errors

#### Drag and Drop Not Working
- Ensure react-beautiful-dnd is properly installed
- Check for JavaScript errors
- Verify touch device compatibility

#### JIRA Integration Issues
- Verify JIRA API credentials
- Check network connectivity
- Validate JIRA project access

### Debug Mode
Enable debug logging by setting:
```env
NEXT_PUBLIC_DEBUG=true
```

## Contributing

### Development Guidelines
1. **TypeScript**: All new code must be typed
2. **Testing**: Add tests for new functionality
3. **Documentation**: Update this README for new features
4. **Code Style**: Follow existing code patterns

### Adding New Features
1. **Database**: Update schema and RLS policies
2. **API**: Add new endpoints with proper error handling
3. **Frontend**: Create components with TypeScript interfaces
4. **Security**: Implement appropriate access controls

## Support

For technical support or feature requests:
1. Check existing documentation
2. Review database logs
3. Check browser console for errors
4. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: Alignzo Lite v2.0+
