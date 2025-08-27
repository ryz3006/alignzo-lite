# Google Drive Admin Integration

## Overview

This implementation provides a complete Google Drive integration with proper separation between user and admin functionality:

- **User Experience**: Users see a "contact admin" message when Google Drive is not configured
- **Admin Experience**: Admins have a dedicated page to manage Google Drive OAuth credentials

## Features Implemented

### 1. User Google Drive Page (`/alignzo/google-drive`)
- **When Not Configured**: Shows a professional message asking users to contact admin
- **When Configured**: Full file manager functionality (upload, download, create folders, delete files)
- **Security**: Users cannot configure credentials directly

### 2. Admin Google Drive Configuration Page (`/admin/google-drive`)
- **Configuration Management**: Add/update Google OAuth 2.0 credentials
- **Security Features**: 
  - Client secrets are hashed before storage
  - Show/hide password functionality
  - Secure credential display (masked)
- **Testing**: Built-in configuration testing
- **Reset Functionality**: Ability to reset/delete configuration
- **Setup Instructions**: Detailed Google Cloud Console setup guide

### 3. API Endpoints
- `GET /api/google-drive/config` - Check configuration status
- `POST /api/google-drive/config` - Save configuration (admin only)
- `DELETE /api/google-drive/config` - Reset configuration (admin only)
- All other Google Drive API endpoints for file operations

## File Structure

```
app/
├── alignzo/
│   └── google-drive/
│       └── page.tsx                    # User Google Drive page
├── admin/
│   └── google-drive/
│       └── page.tsx                    # Admin configuration page
└── api/
    └── google-drive/
        ├── config/
        │   └── route.ts                # Configuration management API
        ├── auth/
        │   ├── route.ts                # OAuth initiation
        │   └── callback/
        │       └── route.ts            # OAuth callback handling
        ├── files/
        │   └── route.ts                # File listing
        ├── upload/
        │   └── route.ts                # File upload
        ├── download/
        │   └── route.ts                # File download
        ├── create-folder/
        │   └── route.ts                # Folder creation
        ├── delete/
        │   └── route.ts                # File/folder deletion
        └── folder-path/
            └── route.ts                # Breadcrumb navigation
```

## Database Tables

### `google_drive_config`
```sql
CREATE TABLE google_drive_config (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,  -- Hashed with bcrypt
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `google_drive_tokens`
```sql
CREATE TABLE google_drive_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Features

1. **Credential Hashing**: Client secrets are hashed using bcrypt before storage
2. **Row Level Security**: Database tables have RLS policies
3. **Environment Variables**: Sensitive data stored in environment variables
4. **Lazy Initialization**: Supabase clients created only when needed
5. **Admin-Only Access**: Configuration management restricted to admin users

## Setup Instructions

### For Administrators

1. **Google Cloud Console Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable Google Drive API
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials

2. **Authorized Redirect URIs**:
   Add this redirect URI to your OAuth 2.0 credentials:
   ```
   https://your-domain.com/api/google-drive/auth/callback
   ```

3. **Admin Configuration**:
   - Navigate to `/admin/google-drive`
   - Enter Client ID and Client Secret
   - Test the configuration
   - Save the configuration

### For Users

1. **Access**: Navigate to `/alignzo/google-drive`
2. **Authentication**: Click "Connect Google Drive" to authenticate
3. **File Management**: Use the interface to manage files and folders

## Environment Variables Required

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## API Usage

### Check Configuration Status
```javascript
const response = await fetch('/api/google-drive/config');
const data = await response.json();
// data.configured = true/false
```

### Save Configuration (Admin Only)
```javascript
const response = await fetch('/api/google-drive/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret'
  })
});
```

### List Files
```javascript
const response = await fetch('/api/google-drive/files?folderId=root');
const data = await response.json();
// data.folders, data.files
```

## Error Handling

- **Configuration Not Found**: Users see admin contact message
- **OAuth Errors**: Proper error messages and redirects
- **API Errors**: Toast notifications for user feedback
- **Network Errors**: Graceful fallbacks and retry mechanisms

## Testing

1. **Configuration Test**: Admin can test OAuth URL generation
2. **File Operations**: Test upload, download, create, delete operations
3. **Error Scenarios**: Test with invalid credentials, network issues

## Deployment Notes

1. **Environment Variables**: Ensure all required environment variables are set
2. **Database Setup**: Run the database setup script or manual SQL
3. **Google Cloud**: Configure OAuth consent screen and credentials
4. **Domain Verification**: Add your domain to Google Cloud authorized origins

## Security Considerations

1. **Credential Storage**: Client secrets are hashed, never stored in plain text
2. **Access Control**: Only admins can modify configuration
3. **Token Management**: OAuth tokens are stored securely and refreshed automatically
4. **API Security**: All endpoints use proper authentication and authorization
5. **Error Handling**: No sensitive information leaked in error messages

## Future Enhancements

1. **Multiple Google Accounts**: Support for multiple Google Drive accounts
2. **Advanced Permissions**: Granular file/folder permissions
3. **Audit Logging**: Track file operations for compliance
4. **Backup Integration**: Automated backup to Google Drive
5. **Collaboration Features**: Real-time collaboration on documents
