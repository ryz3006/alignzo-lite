# JIRA User Mapping Feature

## Overview

The JIRA User Mapping feature allows users to map their team members' email addresses to JIRA assignee and reporter names. This enables enhanced analytics that correlate JIRA work with internal team members.

## Features

### 1. User Mapping Management
- **Add/Edit Mappings**: Map team member emails to JIRA assignee and reporter names
- **Project-Specific Mappings**: Option to specify JIRA project keys for project-specific mappings
- **Flexible Configuration**: Support for both assignee and reporter mappings
- **Bulk Management**: Easy management of multiple user mappings

### 2. Enhanced Analytics Tab
- **JIRA Assignee/Reporter Analytics**: New dedicated analytics tab
- **User Performance Metrics**: Track assigned and reported issues per team member
- **Status Distribution**: Monitor issue status distribution across mapped users
- **Story Point Tracking**: Aggregate story points for mapped users
- **Issue Type Analysis**: Analyze issue types and priorities per user

## Database Schema

### Table: `jira_user_mappings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_email` | VARCHAR(255) | Team member's email address |
| `jira_assignee_name` | VARCHAR(255) | JIRA assignee display name |
| `jira_reporter_name` | VARCHAR(255) | JIRA reporter display name (optional) |
| `jira_project_key` | VARCHAR(50) | JIRA project key (optional) |
| `integration_user_email` | VARCHAR(255) | User who owns the JIRA integration |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## API Endpoints

### GET `/api/integrations/jira/user-mapping`
Retrieve user mappings for a specific integration user.

**Query Parameters:**
- `integrationUserEmail` (required): Email of the integration owner
- `projectKey` (optional): Filter by specific JIRA project

**Response:**
```json
{
  "mappings": [
    {
      "id": "uuid",
      "user_email": "user@company.com",
      "jira_assignee_name": "John Doe",
      "jira_reporter_name": "John Doe",
      "jira_project_key": "PROJ",
      "integration_user_email": "admin@company.com"
    }
  ]
}
```

### POST `/api/integrations/jira/user-mapping`
Create or update a user mapping.

**Request Body:**
```json
{
  "userEmail": "user@company.com",
  "jiraAssigneeName": "John Doe",
  "jiraReporterName": "John Doe",
  "jiraProjectKey": "PROJ",
  "integrationUserEmail": "admin@company.com"
}
```

### DELETE `/api/integrations/jira/user-mapping`
Delete a user mapping.

**Query Parameters:**
- `id` (required): Mapping ID to delete

## Setup Instructions

### 1. Database Migration
Run the database migration script:

```bash
npm run setup-jira-mapping
```

### 2. Configure User Mappings
1. Navigate to **Integrations** → **JIRA**
2. Click **User Mapping** button
3. Add mappings for each team member:
   - Select team member email
   - Enter JIRA assignee name
   - Optionally enter JIRA reporter name
   - Optionally specify JIRA project key

### 3. Access Analytics
1. Navigate to **Analytics**
2. Select **JIRA Assignee/Reporter** tab
3. View metrics based on your user mappings

## Usage Examples

### Basic Mapping
Map a team member to their JIRA assignee name:
```
Email: john.doe@company.com
JIRA Assignee: John Doe
JIRA Reporter: John Doe
Project: (leave empty for all projects)
```

### Project-Specific Mapping
Map a team member to different JIRA names for different projects:
```
Email: jane.smith@company.com
JIRA Assignee: jane.smith
JIRA Reporter: jane.smith
Project: DEV

Email: jane.smith@company.com
JIRA Assignee: Jane Smith
JIRA Reporter: Jane Smith
Project: PROD
```

## Analytics Features

### Summary Cards
- **Mapped Users**: Count of configured user mappings
- **Total Assigned Issues**: Sum of all assigned issues
- **In Progress**: Count of in-progress issues
- **Story Points**: Total story points across mapped users

### Charts and Visualizations
- **User Performance Overview**: Bar chart showing assigned vs reported issues
- **Issue Type Distribution**: Pie chart of issue types across mapped users
- **Priority Distribution**: Pie chart of issue priorities across mapped users

### Detailed Tables
- **User Details**: Comprehensive breakdown per mapped user
- **Status Tracking**: Open, in-progress, and closed issue counts
- **Story Point Analysis**: Individual and aggregate story point metrics

## Benefits

1. **Team Visibility**: Track JIRA work for specific team members
2. **Performance Metrics**: Monitor individual and team productivity
3. **Project Insights**: Understand work distribution across projects
4. **Data Correlation**: Link JIRA data with internal team structure
5. **Enhanced Reporting**: Generate detailed reports for stakeholders

## Troubleshooting

### Common Issues

1. **No Mappings Found**
   - Ensure user mappings are configured in the Integrations page
   - Check that the JIRA integration is verified

2. **Data Not Loading**
   - Verify JIRA credentials are valid
   - Check that mapped JIRA names exist in your JIRA instance
   - Ensure proper permissions for the JIRA API user

3. **Mapping Conflicts**
   - Each user can have one mapping per project
   - Global mappings (no project key) take precedence
   - Check for duplicate mappings

### Support
For issues or questions, check the application logs or contact the development team.
