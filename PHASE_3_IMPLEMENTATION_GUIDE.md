# Phase 3 Implementation Guide

## 🚀 Quick Start Guide

Follow these steps to implement Phase 3 security features in your production environment.

## 📋 Prerequisites

- ✅ Phase 1 and Phase 2 security features implemented
- ✅ Supabase project access
- ✅ Vercel deployment access
- ✅ Environment variables configured

## 🔧 Step 1: Apply Database Schema

### 1.1 Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query

### 1.2 Apply the Schema
1. Copy the entire content from `database/phase3_schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the schema

### 1.3 Verify Schema Creation
```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_trail', 'security_alerts', 'api_keys', 'api_key_usage');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('audit_trail', 'security_alerts', 'api_keys', 'api_key_usage');
```

## 🔧 Step 2: Configure Environment Variables

### 2.1 Local Development (.env.local)
```env
# Phase 3 Security Features
MONITORING_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@example.com,security@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
WEBHOOK_ENDPOINTS=https://your-webhook-endpoint.com/security-alerts
AUDIT_RETENTION_DAYS=90
API_KEY_RETENTION_DAYS=30

# Monitoring Configuration
ALERT_COOLDOWN_MINUTES=5
MAX_ALERTS_PER_HOUR=100
AUTO_ACKNOWLEDGE_LOW_SEVERITY=true

# Audit Configuration
AUDIT_LOG_TO_DATABASE=true
AUDIT_LOG_TO_FILE=true
AUDIT_INCLUDE_OLD_VALUES=true
AUDIT_INCLUDE_NEW_VALUES=true
```

### 2.2 Vercel Environment Variables
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all the variables from Step 2.1
4. Deploy to apply changes

## 🔧 Step 3: Test API Key Management

### 3.1 Generate Test API Key
```javascript
// Test script to generate API key
const { apiKeyManager } = require('./lib/api-key-management');

async function testAPIKey() {
  const { apiKey, apiKeyRecord } = await apiKeyManager.generateAPIKey(
    'test@example.com',
    'Test API Key',
    ['READ_USERS', 'READ_PROJECTS'],
    'admin@example.com'
  );
  
  console.log('Generated API Key:', apiKey);
  console.log('API Key Record:', apiKeyRecord);
}

testAPIKey();
```

### 3.2 Test API Key Validation
```javascript
// Test API key validation
const validation = await apiKeyManager.validateAPIKey(
  'your-api-key-here',
  ['READ_USERS']
);

console.log('Validation Result:', validation);
```

## 🔧 Step 4: Configure Monitoring Rules

### 4.1 Default Rules (Already Applied)
The following monitoring rules are automatically created:
- Rate limit violations (5+ in 15 minutes)
- Failed login attempts (3+ in 10 minutes)
- Suspicious data access (50+ in 5 minutes)
- Access denied patterns (10+ in 10 minutes)

### 4.2 Custom Rules (Optional)
```sql
-- Add custom monitoring rule
INSERT INTO monitoring_rules (name, description, type, severity, conditions, actions) 
VALUES (
  'Custom Rule',
  'Custom monitoring rule description',
  'CUSTOM_EVENT',
  'MEDIUM',
  '{"eventType": "custom_event", "threshold": 10, "timeWindow": 30}',
  '[{"type": "email", "config": {"recipients": ["admin@example.com"]}}]'
);
```

## 🔧 Step 5: Set Up Alert Notifications

### 5.1 Email Notifications
1. Configure your email service (SendGrid, AWS SES, etc.)
2. Update `ALERT_EMAIL_RECIPIENTS` with your email addresses
3. Test email notifications

### 5.2 Slack Notifications
1. Create a Slack app and webhook
2. Update `SLACK_WEBHOOK_URL` with your webhook URL
3. Test Slack notifications

### 5.3 Webhook Notifications
1. Set up your webhook endpoint
2. Update `WEBHOOK_ENDPOINTS` with your endpoint URL
3. Test webhook notifications

## 🔧 Step 6: Test Audit Trail

### 6.1 Test Data Access Logging
```javascript
// Test audit trail logging
const { auditTrail } = require('./lib/audit-trail');

await auditTrail.logDataAccess(
  'user@example.com',
  'READ',
  'users',
  'user-id-123',
  undefined,
  { name: 'John Doe', email: 'john@example.com' }
);
```

### 6.2 View Audit Trail
```sql
-- View recent audit trail entries
SELECT * FROM audit_trail 
ORDER BY created_at DESC 
LIMIT 10;

-- View audit trail by user
SELECT * FROM audit_trail 
WHERE user_email = 'user@example.com' 
ORDER BY created_at DESC;
```

## 🔧 Step 7: Test Validation Middleware

### 7.1 Apply to Existing API Routes
```typescript
// Example: Apply validation middleware to existing route
import { withValidation, commonSchemas } from '@/lib/validation-middleware';

export const POST = withValidation({
  body: commonSchemas.pagination,
  requireAuth: true
})(async (request, validatedData) => {
  // Your existing route logic here
  const { page, limit } = validatedData.body;
  
  // Process request with validated data
  return NextResponse.json({ success: true });
});
```

## 🔧 Step 8: Monitor and Verify

### 8.1 Check Security Dashboard
```sql
-- View security dashboard data
SELECT * FROM security_dashboard;

-- View user activity summary
SELECT * FROM user_activity_summary;
```

### 8.2 Monitor Logs
```bash
# Check audit logs
tail -f logs/audit/audit-$(date +%Y-%m-%d).log

# Check application logs
tail -f logs/app.log
```

### 8.3 Verify RLS Policies
```sql
-- Test RLS policies
-- This should only return user's own data
SELECT * FROM audit_trail WHERE user_email = auth.jwt() ->> 'email';
```

## 🧪 Testing Checklist

### ✅ Database Schema
- [ ] All tables created successfully
- [ ] RLS policies applied
- [ ] Indexes created
- [ ] Functions and views created

### ✅ Environment Variables
- [ ] All variables set in .env.local
- [ ] All variables set in Vercel
- [ ] Application deployed successfully

### ✅ API Key Management
- [ ] API key generation works
- [ ] API key validation works
- [ ] Usage tracking works
- [ ] Permissions work correctly

### ✅ Monitoring System
- [ ] Monitoring rules active
- [ ] Alerts generated for test events
- [ ] Email notifications working
- [ ] Slack notifications working (if configured)

### ✅ Audit Trail
- [ ] Data access logged
- [ ] User actions logged
- [ ] Security events logged
- [ ] Audit trail queryable

### ✅ Validation Middleware
- [ ] Input validation working
- [ ] Error messages clear
- [ ] Performance monitoring active
- [ ] No breaking changes to existing functionality

## 🚨 Troubleshooting

### Common Issues:

1. **Database Schema Errors**
   - Check Supabase permissions
   - Verify SQL syntax
   - Check for existing tables

2. **Environment Variable Issues**
   - Restart development server
   - Redeploy to Vercel
   - Check variable names

3. **API Key Issues**
   - Verify bcrypt installation
   - Check database connection
   - Validate permissions

4. **Monitoring Not Working**
   - Check monitoring configuration
   - Verify alert rules
   - Test notification channels

5. **Audit Trail Issues**
   - Check file permissions for logs directory
   - Verify database connection
   - Check RLS policies

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Phase 3 completion summary
3. Verify all prerequisites are met
4. Test each component individually

## 🎉 Success Criteria

Phase 3 is successfully implemented when:
- ✅ All database tables exist and are accessible
- ✅ API key generation and validation work
- ✅ Monitoring alerts are generated
- ✅ Audit trail logs all activities
- ✅ Validation middleware works on API routes
- ✅ All tests pass in `scripts/test-phase3-security.js`

---

**Your application now has enterprise-grade security with advanced monitoring, auditing, and API management capabilities!**
