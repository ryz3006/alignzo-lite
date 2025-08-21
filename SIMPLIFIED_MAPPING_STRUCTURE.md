# Simplified Mapping Structure

## Overview

To reduce confusion and improve maintainability, we've simplified the mapping system by consolidating user mappings into a single, centralized location.

## What Changed

### ✅ **Kept (Essential)**

1. **Master Mappings** (`/alignzo/master-mappings`)
   - **Purpose**: Global user mappings for all ticket sources
   - **Scope**: Applies across JIRA, Remedy, ServiceNow, and any other sources
   - **Function**: Maps external assignee values to internal user emails
   - **Example**: `john.doe@company.com` → `john.doe@alignzo.com`

2. **JIRA Project Mappings** (in `/alignzo/integrations`)
   - **Purpose**: Maps dashboard projects to JIRA projects
   - **Scope**: Project-to-project relationships
   - **Function**: Enables filtered analytics across multiple JIRA projects
   - **Example**: Dashboard Project "Mobile App" → JIRA Projects ["MOBILE", "APP-DEV"]

### ❌ **Removed (Redundant)**

1. **Upload Tickets User Mappings**
   - **Reason**: Redundant with Master Mappings
   - **Impact**: All user mappings now handled centrally

2. **JIRA User Mappings**
   - **Reason**: Redundant with Master Mappings
   - **Impact**: All user mappings now handled centrally

## Benefits of This Approach

### 1. **Reduced Confusion**
- Single place to manage all user mappings
- Clear separation of concerns
- No duplicate mapping configurations

### 2. **Improved Maintenance**
- When a user's email changes, update once in Master Mappings
- Consistent user identification across all sources
- Easier to audit and manage

### 3. **Better Scalability**
- Adding new ticket sources doesn't require new mapping configurations
- Master mappings automatically apply to new sources
- Reduced administrative overhead

### 4. **Enhanced Analytics**
- Unified user identification across all platforms
- Consistent reporting regardless of ticket source
- Better cross-platform insights

## How It Works

### Mapping Hierarchy (Simplified)
```
1. Master Mappings (Global) ← PRIMARY
   - Checked first for all ticket sources
   - Applies to JIRA, Remedy, ServiceNow, etc.

2. Project Mappings (JIRA Only)
   - Maps dashboard projects to JIRA projects
   - Used for filtered analytics
```

### Example Workflow
1. **Upload CSV tickets**: Master Mappings automatically apply
2. **JIRA integration**: Master Mappings + Project Mappings work together
3. **Analytics**: Consistent user identification across all sources

## Migration Guide

### For Existing Users
1. **Review existing mappings** in Upload Tickets and JIRA Integrations
2. **Consolidate to Master Mappings** using the Master Mappings tab
3. **Remove duplicate mappings** from other locations
4. **Test functionality** to ensure everything works as expected

### For New Users
1. **Set up Master Mappings** first for all common user mappings
2. **Configure JIRA Project Mappings** if using JIRA integration
3. **Upload tickets** - mappings will be applied automatically

## Technical Implementation

### Database Tables
- **`ticket_master_mappings`**: Centralized user mappings
- **`jira_project_mappings`**: Project-to-project mappings
- **Removed**: `ticket_upload_user_mappings`, `jira_user_mappings` (functionality moved to master mappings)

### Code Changes
- **Upload Tickets**: Removed project-specific user mapping UI
- **JIRA Integrations**: Removed user mapping UI, kept project mappings
- **Analytics**: Uses Master Mappings for consistent user identification

## Best Practices

### 1. **Use Master Mappings for Common Cases**
- Standard email format differences
- User name variations
- Cross-platform consistency

### 2. **Use Project Mappings for JIRA-Specific Needs**
- Multiple JIRA projects per dashboard project
- Project-specific filtering requirements

### 3. **Regular Maintenance**
- Review Master Mappings quarterly
- Update when team members change
- Clean up inactive mappings

## Troubleshooting

### Common Issues
1. **User not mapped**: Check Master Mappings first
2. **Project filtering not working**: Verify JIRA Project Mappings
3. **Analytics inconsistencies**: Ensure Master Mappings are up to date

### Support
- All user mapping issues should be resolved through Master Mappings
- Project mapping issues are handled in JIRA Integrations
- Analytics issues may require checking both mapping types
