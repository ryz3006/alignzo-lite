# Alignzo Lite - Work Log Tracking & Reporting Application

A professional work log tracking and reporting web application built with Next.js, Firebase Authentication, and Supabase. Designed for deployment on platforms like Vercel or Netlify.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with ❤️ by @ryz3006](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/ryz3006)

## Features

### Admin Portal (`/admin`)
- **Configuration Setup**: Automatic detection and setup guidance for environment variables and database
- **User Management**: Full CRUD operations for managing application users
- **Team Management**: Create teams and assign users with member management
- **Project Management**: Create projects with dynamic custom categories
- **Work Reports**: View and manage all work logs with export functionality

### User Portal (`/` or `/alignzo`)
- **Google Authentication**: Secure login with Google OAuth
- **Access Control**: Only pre-registered users can access the system
- **Live Timer**: Start, pause, resume, and stop work timers with project categorization
- **Dashboard**: KPI tiles showing hours logged (today, week, month, total)
- **Work Reports**: Personal work log management with CRUD operations
- **Analytics**: Team and project performance insights with interactive charts

### Core Features
- **Dynamic Project Categories**: Admin-defined custom categories per project
- **Persistent Timers**: Timers continue running even if browser is closed
- **Real-time Updates**: Live timer synchronization across devices
- **Export Functionality**: CSV export for reports and analytics
- **Responsive Design**: Modern UI built with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication (Google + Email/Password)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd alignzo-lite
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Admin Credentials
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Add Google provider
   - Enable Email/Password authentication for admin login
4. Create a web app and copy the configuration
5. Add your domain to authorized domains

### 5. Supabase Setup

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings → API to get your URL and anon key
4. Go to SQL Editor and run the database schema from `database/schema.sql`

### 6. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Netlify Deployment

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy

## Database Schema

The application uses the following main tables:

- **users**: Application users with full name and email
- **teams**: Team definitions
- **team_members**: Junction table for team assignments
- **projects**: Project definitions with name, product, and country
- **project_categories**: Dynamic categories for each project
- **work_logs**: Completed work log entries
- **timers**: Active timer sessions

## Usage Guide

### Admin Setup

1. Visit `/admin` to access the admin portal
2. Follow the setup instructions if configuration is incomplete
3. Use the admin login with your configured email/password
4. Create users, teams, and projects
5. Configure dynamic categories for projects

### User Access

1. Users visit the main page (`/`)
2. Click "Sign in with Google"
3. If their email is registered, they gain access
4. If not, they see an access denied message

### Timer Usage

1. Click the "+" icon in the header to start a timer
2. Select project, enter ticket ID and task details
3. Choose from dynamic categories if configured
4. Use the bell icon to manage active timers
5. Pause, resume, or stop timers as needed

## JIRA Integration

### JIRA User Mapping Feature

The JIRA User Mapping feature allows users to map their team members' email addresses to JIRA assignee and reporter names. This enables enhanced analytics that correlate JIRA work with internal team members.

#### Features
- **User Mapping**: Map internal team member emails to JIRA assignee/reporter names
- **Project-Specific Mapping**: Optional project-specific mappings for different JIRA projects
- **JIRA User Suggestions**: Dropdown suggestions from actual JIRA users
- **Enhanced Analytics**: New JIRA Assignee/Reporter analytics tab

### JIRA Project Mapping Feature

The JIRA Project Mapping feature allows users to map their dashboard projects to multiple JIRA projects. This enables comprehensive analytics across multiple JIRA projects that belong to the same internal project.

#### Features
- **Project Mapping**: Map single dashboard projects to multiple JIRA projects
- **JIRA Project Suggestions**: Dropdown suggestions from actual JIRA projects
- **Filtered Analytics**: Analytics respect project mappings when filtering by projects
- **Comprehensive Coverage**: One dashboard project can include work from multiple JIRA projects

#### Setup Instructions

1. **User Mapping Database Setup**: You have two options to create the `jira_user_mappings` table:

   **Option A: Run the migration script (requires environment variables):**
   ```bash
   npm run setup-jira-mapping
   ```
   
   **Option B: Manual SQL execution (recommended for quick setup):**
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `database/jira_user_mapping.sql`
   - Execute the SQL script

2. **Project Mapping Database Setup**: You have two options to create the `jira_project_mappings` table:

   **Option A: Run the migration script (requires environment variables):**
   ```bash
   npm run setup-jira-project-mapping
   ```
   
   **Option B: Manual SQL execution (recommended for quick setup):**
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `database/jira_project_mapping.sql`
   - Execute the SQL script

3. **JIRA Integration**: 
   - Go to `/alignzo/integrations` page
   - Configure your JIRA connection
   - Verify the connection
   - Use the "User Mapping" button to create user mappings
   - Use the "Project Mapping" button to create project mappings

#### API Endpoints

- `GET /api/integrations/jira/user-mapping` - Get user mappings
- `POST /api/integrations/jira/user-mapping` - Create/update user mapping
- `DELETE /api/integrations/jira/user-mapping` - Delete user mapping
- `GET /api/integrations/jira/users` - Get JIRA users for suggestions
- `GET /api/integrations/jira/project-mapping` - Get project mappings
- `POST /api/integrations/jira/project-mapping` - Create/update project mapping
- `DELETE /api/integrations/jira/project-mapping` - Delete project mapping
- `GET /api/integrations/jira/projects` - Get JIRA projects for suggestions

## API Endpoints

The application uses Supabase's auto-generated REST API:

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- Similar endpoints for teams, projects, work_logs, and timers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**ryz3006** - [GitHub Profile](https://github.com/ryz3006)

Made with ❤️ for the developer community.

## Support

For support and questions, please open an issue in the [GitHub repository](https://github.com/ryz3006/alignzo-lite).

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework used
- [Firebase](https://firebase.google.com/) - Authentication and hosting
- [Supabase](https://supabase.com/) - Database and backend services
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide React](https://lucide.dev/) - Beautiful icons
