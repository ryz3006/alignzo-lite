# Google Drive Integration Setup Guide

This guide will help you set up Google Drive integration for your Alignzo application.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to your Supabase database
3. Your application deployed and accessible via HTTPS

## Step 1: Google Cloud Platform Setup

### 1.1 Create a New Project or Select Existing One
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Make sure billing is enabled for the project

### 1.2 Enable Google Drive API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API" and click "Enable"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Fill in the required information:
   - App name: "Alignzo Drive Integration"
   - User support email: Your email
   - Developer contact information: Your email
4. Add the following scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
5. Add test users if needed
6. Save and continue

### 1.4 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - `https://your-domain.com/api/google-drive/auth/callback`
   - `http://localhost:3000/api/google-drive/auth/callback` (for development)
5. Click "Create"
6. **Save the Client ID and Client Secret** - you'll need these for the next step

## Step 2: Database Setup

### 2.1 Run the Database Setup Script
```bash
npm run setup-google-drive
```

This will create the necessary tables in your Supabase database:
- `google_drive_config` - Stores OAuth credentials (hashed)
- `google_drive_tokens` - Stores access and refresh tokens

## Step 3: Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Google Drive Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
# For development: NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration (if not already set)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## Step 4: Configure the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/alignzo/google-drive` in your application
3. You'll see a configuration form
4. Enter your Google OAuth Client ID and Client Secret
5. Click "Save Configuration"

## Step 5: Authentication Flow

### 5.1 First-Time Setup
1. After saving the configuration, you'll be redirected to Google's OAuth consent screen
2. Grant the necessary permissions to your application
3. You'll be redirected back to your application with access granted

### 5.2 Token Management
- Access tokens are automatically refreshed when they expire
- Tokens are stored securely in your Supabase database
- The integration handles token refresh automatically

## Step 6: Using the Google Drive Integration

### 6.1 File Management Features
- **Browse Files**: Navigate through your Google Drive folders
- **Upload Files**: Drag and drop or select files to upload
- **Create Folders**: Create new folders in your Drive
- **Download Files**: Download files directly to your device
- **Delete Files**: Select and delete multiple files/folders
- **View in Drive**: Open files directly in Google Drive

### 6.2 Security Features
- OAuth credentials are hashed before storage
- Access tokens are encrypted and stored securely
- Row Level Security (RLS) policies protect sensitive data
- Only authenticated users can access the integration

## Troubleshooting

### Common Issues

1. **"Configuration not found" error**
   - Make sure you've run the database setup script
   - Check that your environment variables are set correctly

2. **"Invalid redirect URI" error**
   - Verify that your redirect URI matches exactly in Google Cloud Console
   - Include both production and development URLs

3. **"Access denied" error**
   - Check that you've added your email as a test user in OAuth consent screen
   - Verify that the Google Drive API is enabled

4. **"Token expired" error**
   - The application should automatically refresh tokens
   - If persistent, try re-authenticating

### Debug Steps

1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify database tables exist and have correct structure
4. Test OAuth flow manually using Google's OAuth Playground

## Security Considerations

1. **Credential Storage**: Client secrets are hashed using bcrypt before storage
2. **Token Security**: Access tokens are stored securely and automatically refreshed
3. **Access Control**: Only authenticated users can access the integration
4. **Data Privacy**: File content is not stored locally, only metadata

## API Endpoints

The integration provides the following API endpoints:

- `GET /api/google-drive/config` - Check configuration status
- `POST /api/google-drive/config` - Save OAuth credentials
- `GET /api/google-drive/files` - List files and folders
- `GET /api/google-drive/folder-path` - Get folder breadcrumb path
- `POST /api/google-drive/upload` - Upload files
- `POST /api/google-drive/create-folder` - Create new folder
- `GET /api/google-drive/download` - Download files
- `DELETE /api/google-drive/delete` - Delete files/folders
- `GET /api/google-drive/auth` - Get OAuth URL
- `GET /api/google-drive/auth/callback` - Handle OAuth callback

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the browser console and server logs
3. Verify your Google Cloud Console configuration
4. Ensure all environment variables are set correctly

## Additional Configuration

### Custom Scopes
If you need additional permissions, you can modify the scopes in `lib/google-drive.ts`:

```typescript
const scopes = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  // Add additional scopes here
];
```

### File Size Limits
The integration supports files up to 5GB. For larger files, consider using Google Drive's resumable upload API.

### Rate Limiting
Google Drive API has rate limits. The integration includes basic error handling for rate limit errors.
