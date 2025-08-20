# Ticket Upload Functionality

This document describes the ticket upload functionality that allows users to upload ticket dumps from external systems like Remedy, ServiceNow, etc.

## Overview

The ticket upload feature enables users to:
1. Configure source mappings between external ticket systems and internal projects
2. Map external assignee names to internal user emails
3. Upload CSV files with ticket data
4. Track upload progress and history
5. Use uploaded ticket data in analytics and reports

## Database Schema

### Tables Created

1. **ticket_sources** - Supported ticket system sources (Remedy, ServiceNow, etc.)
2. **ticket_upload_mappings** - Maps source organization fields to dashboard projects
3. **ticket_upload_user_mappings** - Maps source assignee fields to dashboard users
4. **uploaded_tickets** - Stores uploaded ticket data from external systems
5. **upload_sessions** - Tracks upload progress and status

### Key Relationships

- `ticket_upload_mappings` links external sources to internal projects
- `ticket_upload_user_mappings` links external assignees to internal users
- `uploaded_tickets` references mappings to associate tickets with projects and users

## Setup Instructions

### 1. Database Setup

Run the database setup script:

```bash
node scripts/create-ticket-upload-tables.js
```

This will create all necessary tables with proper indexes, constraints, and RLS policies.

### 2. Access the Upload Page

Navigate to `/alignzo/upload-tickets` in your application.

## Usage Guide

### Step 1: Add Source Mapping

1. Click "Add a new source" button
2. Select the ticket source (e.g., "Remedy")
3. Choose the project to map to
4. Enter the organization field value that appears in your CSV file
5. Optionally add user mappings to map external assignees to internal users
6. Click "Create Mapping"

### Step 2: Upload Ticket Data

1. Click "Upload File" button
2. Select the ticket source
3. Choose a CSV file (max 1MB)
4. Click "Upload"

### Step 3: Monitor Progress

- View upload progress in real-time
- Check upload history for completed/failed uploads
- Review error messages if uploads fail

## CSV File Requirements

### Required Headers

The CSV file must contain exactly these headers (case-sensitive):

```
Incident ID,Priority,Region,Assigned_Support_Organization,Assigned_GROUP,Vertical,Sub_Vertical,Owner_Support_Organization,Owner_GROUP,Owner,Reported_source,User Name,Site_Group,Operational Category Tier 1,Operational Category Tier 2,Operational Category Tier 3,Product_Name,Product Categorization Tier 1,Product Categorization Tier 2,Product Categorization Tier 3,Incident Type,Summary,Assignee,Reported_Date1,Responded_Date,Last_Resolved_Date,Closed_Date,Status,Status_Reason_Hidden,Pending_Reason,Group_Transfers,Total_Transfers,Department,VIP,Company,Vendor_Ticket_Number,Reported_to_Vendor,Resolution,Resolver Group,Reopen Count,Re Opened Date,Service Desk 1st Assigned Date,Service Desk 1st Assigned Group,Submitter,Owner_Login_ID,Impact,Submit Date,Report Date,VIL_Function,IT_Partner,MTTR,MTTI
```

### File Requirements

- **Format**: CSV only
- **Size**: Maximum 1MB
- **Encoding**: UTF-8 recommended
- **Headers**: Must match exactly (case-sensitive)
- **Date Format**: Remedy uses `MM/DD/YYYY, HH:MM:SS AM/PM` format (e.g., `08/18/2025, 07:11:50 PM`)

### Sample File

Download the sample file from the upload page to see the expected format.

## Mapping Configuration

### Organization Mapping

- **Field**: `Assigned_Support_Organization`
- **Purpose**: Maps external organization names to internal projects
- **Example**: "IT Support Team A" → "Project Alpha"

### User Mapping

- **Field**: `Assignee`
- **Purpose**: Maps external assignee names to internal user emails
- **Example**: "john.doe@company.com" → "john.doe@internal.com"

## Data Processing

### Upload Process

1. **Validation**: Check file size, format, and headers
2. **Session Creation**: Create upload session for tracking
3. **Batch Processing**: Process tickets in batches of 50
4. **Mapping Lookup**: Find matching organization and user mappings
5. **Data Insertion**: Insert valid tickets into database
6. **Progress Tracking**: Update session with progress
7. **Completion**: Mark session as completed

### Data Transformation

- **Date fields**: Converted from Remedy format (`MM/DD/YYYY, HH:MM:SS AM/PM`) to ISO format
- Boolean fields are converted from "Yes"/"No" to true/false
- Numeric fields are parsed appropriately
- Empty values are handled gracefully

## Error Handling

### Common Errors

1. **File Size Exceeded**: File larger than 1MB
2. **Invalid Format**: Non-CSV file
3. **Missing Headers**: Required headers not found
4. **No Mapping Found**: Organization value doesn't match any mapping
5. **Database Errors**: Insertion failures

### Error Recovery

- Failed uploads are marked with error messages
- Partial uploads are tracked in session history
- Users can retry uploads after fixing issues

## Integration with Analytics

Uploaded ticket data can be used in:

1. **Project Analytics**: Filter by mapped projects
2. **User Analytics**: Filter by mapped users
3. **Time-based Reports**: Use ticket dates for filtering
4. **Status Reports**: Analyze ticket statuses and resolutions

## Security Considerations

- File size limits prevent abuse
- RLS policies control data access
- User authentication required
- Input validation on all fields

## Troubleshooting

### Upload Fails

1. Check file size (must be < 1MB)
2. Verify CSV format and headers
3. Ensure organization mapping exists
4. Check browser console for errors

### No Data Appears

1. Verify source mapping is configured
2. Check organization field values match
3. Review upload session status
4. Check database for inserted records

### Performance Issues

1. Reduce file size
2. Check database performance
3. Monitor upload session progress
4. Consider splitting large files

## Future Enhancements

- Support for additional file formats
- Bulk mapping configuration
- Advanced data validation rules
- Integration with more ticket systems
- Automated mapping suggestions
- Data deduplication features
