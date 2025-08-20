# JIRA Integration Guide

This document explains how to set up and use the JIRA integration in Alignzo Lite.

## Overview

The JIRA integration allows users to connect their JIRA instance to Alignzo Lite, enabling seamless workflow management and time tracking integration.

## Features

- **Secure Credential Storage**: JIRA credentials are stored securely in the database
- **API Verification**: Automatic verification of JIRA API credentials before saving
- **User-Specific Integration**: Each user can have their own JIRA integration settings
- **Update Capability**: Users can update their integration settings at any time

## Setup Instructions

### 1. Generate JIRA API Token

1. Log in to your Atlassian account at https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give your token a label (e.g., "Alignzo Lite Integration")
4. Copy the generated token (you won't be able to see it again)

### 2. Configure Integration in Alignzo Lite

1. Navigate to the **Integrations** page in Alignzo Lite
2. Click the **Integrate** button on the JIRA tile
3. Fill in the required information:
   - **JIRA URL (Base URL)**: Your JIRA instance URL (e.g., `https://your-domain.atlassian.net`)
   - **User Email Address**: The email address associated with your JIRA account
   - **API Token**: The API token you generated in step 1

### 3. Verify Connection

1. Click the **Verify Connection** button to test your credentials
2. If successful, you'll see a green success message
3. Click **Save Integration** to store your settings

## API Endpoints

### GET /api/integrations/jira
Retrieves the current user's JIRA integration settings.

**Query Parameters:**
- `userEmail` (required): The user's email address

**Response:**
```json
{
  "integration": {
    "id": "uuid",
    "user_email": "user@example.com",
    "integration_type": "jira",
    "base_url": "https://domain.atlassian.net",
    "user_email_integration": "user@example.com",
    "api_token": "encrypted_token",
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/integrations/jira
Creates or updates a user's JIRA integration settings.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "base_url": "https://domain.atlassian.net",
  "user_email_integration": "user@example.com",
  "api_token": "api_token_here",
  "is_verified": true
}
```

**Response:**
```json
{
  "message": "Integration saved successfully",
  "integration": {
    "id": "uuid",
    "user_email": "user@example.com",
    "integration_type": "jira",
    "base_url": "https://domain.atlassian.net",
    "user_email_integration": "user@example.com",
    "api_token": "encrypted_token",
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/integrations/jira/verify
Verifies JIRA credentials by testing the API connection.

**Request Body:**
```json
{
  "base_url": "https://domain.atlassian.net",
  "user_email": "user@example.com",
  "api_token": "api_token_here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "JIRA connection verified successfully",
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "accountId": "account_id_here"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials. Please check your email and API token."
}
```

## Database Schema

The integration uses the `user_integrations` table:

```sql
CREATE TABLE user_integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    base_url VARCHAR(500),
    user_email_integration VARCHAR(255),
    api_token TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, integration_type)
);
```

## Security Considerations

1. **API Token Storage**: API tokens are stored encrypted in the database
2. **User Isolation**: Each user can only access their own integration settings
3. **Verification Required**: Integration settings are only saved after successful API verification
4. **HTTPS Only**: JIRA base URLs must use HTTPS for security

## Troubleshooting

### Common Issues

1. **Invalid Credentials**: Ensure your email and API token are correct
2. **Wrong Base URL**: Make sure the JIRA URL is in the format `https://your-domain.atlassian.net`
3. **API Token Permissions**: Ensure your API token has the necessary permissions
4. **Network Issues**: Check your internet connection and firewall settings

### Error Messages

- **"Invalid credentials"**: Check your email and API token
- **"Access denied"**: Your API token may not have sufficient permissions
- **"JIRA instance not found"**: Verify your base URL is correct
- **"Unable to connect"**: Check your network connection and firewall settings

## Future Enhancements

Potential future features for the JIRA integration:

1. **Issue Synchronization**: Automatically sync JIRA issues to Alignzo Lite
2. **Time Logging**: Log time directly to JIRA issues
3. **Status Updates**: Update JIRA issue status from Alignzo Lite
4. **Comment Integration**: Sync comments between systems
5. **Project Mapping**: Map Alignzo Lite projects to JIRA projects
6. **Webhook Support**: Real-time synchronization via webhooks

## Support

If you encounter any issues with the JIRA integration, please:

1. Check the troubleshooting section above
2. Verify your JIRA credentials and permissions
3. Contact the development team with detailed error messages
