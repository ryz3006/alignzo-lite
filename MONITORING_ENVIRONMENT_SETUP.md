# Monitoring Environment Configuration Guide

## Overview
This guide provides step-by-step instructions for configuring environment variables for the comprehensive monitoring and security system implemented in your application.

## Environment Variables Categories

### 📝 **Important: NEXT_PUBLIC_ Prefix**

In Next.js, environment variables work differently:

- **No prefix** (e.g., `MONITORING_ENABLED`): Server-side only, safe for secrets
- **NEXT_PUBLIC_ prefix** (e.g., `NEXT_PUBLIC_APP_NAME`): Client-side accessible, **never put secrets here**

**Security Rule:** Only use `NEXT_PUBLIC_` for data that's safe to expose in the browser!

### 🔧 **Core Monitoring Configuration**

#### Server-Side Variables (No Prefix)
```bash
# Enable/disable monitoring system
MONITORING_ENABLED=true

# Audit trail retention (in days)
AUDIT_RETENTION_DAYS=7

# Archival system settings
ARCHIVAL_ENABLED=true
ARCHIVAL_CLEANUP_INTERVAL=24  # hours

# Alert retention settings
ALERT_RETENTION_DAYS=30
```

#### Client-Side Variables (NEXT_PUBLIC_ Prefix)
```bash
# App information (safe for browser)
NEXT_PUBLIC_APP_NAME=Alignzo Lite
NEXT_PUBLIC_ENVIRONMENT=production

# Feature flags (non-sensitive)
NEXT_PUBLIC_FEATURE_FLAGS={"auditTrail":true,"monitoring":true}
```

#### Optional Core Variables
```bash
# Log levels (error, warn, info, debug)
LOG_LEVEL=info

# Enable file-based logging
FILE_LOGGING_ENABLED=true

# Enable database logging
DATABASE_LOGGING_ENABLED=true
```

### 📧 **Email Alert Configuration**

#### SMTP Settings
```bash
# Email alert settings
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@yourcompany.com,security@yourcompany.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourcompany.com
```

#### Email Templates
```bash
# Subject prefixes for different alert types
EMAIL_SUBJECT_PREFIX=[ALIGNZO-ALERT]
CRITICAL_ALERT_PREFIX=[CRITICAL]
HIGH_ALERT_PREFIX=[HIGH]
MEDIUM_ALERT_PREFIX=[MEDIUM]
```

### 🔔 **Slack Integration**

#### Slack Webhook Configuration
```bash
# Slack webhook URL for alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Slack channel settings
SLACK_CHANNEL=#security-alerts
SLACK_USERNAME=Alignzo Security Bot
SLACK_EMOJI=:warning:

# Alert level filtering for Slack
SLACK_MIN_ALERT_LEVEL=HIGH  # Only HIGH and CRITICAL alerts to Slack
```

### 🌐 **Webhook Configuration**

#### Custom Webhook Settings
```bash
# Custom webhook for external systems
SECURITY_WEBHOOK_URL=https://your-siem.company.com/webhook/security
WEBHOOK_TIMEOUT=10000  # milliseconds
WEBHOOK_RETRY_ATTEMPTS=3
```

### 📊 **Rate Limiting Configuration**

#### API Rate Limits
```bash
# General API rate limiting
API_RATE_LIMIT_WINDOW=15  # minutes
API_RATE_LIMIT_MAX=100    # requests per window

# Auth rate limiting
AUTH_RATE_LIMIT_WINDOW=15  # minutes
AUTH_RATE_LIMIT_MAX=5      # requests per window

# JIRA API rate limiting
JIRA_RATE_LIMIT_WINDOW=1   # minutes
JIRA_RATE_LIMIT_MAX=20     # requests per window
```

### 🔐 **API Key Management**

#### API Key Settings
```bash
# API key configuration
API_KEY_RETENTION_DAYS=90
API_KEY_AUTO_CLEANUP=true
API_KEY_LENGTH=32
```

### 🎯 **Monitoring Rules Configuration**

#### Alert Thresholds
```bash
# Failed login threshold
FAILED_LOGIN_THRESHOLD=5
FAILED_LOGIN_WINDOW=300    # seconds (5 minutes)

# Rate limit threshold
RATE_LIMIT_THRESHOLD=10
RATE_LIMIT_WINDOW=300      # seconds

# API error threshold
API_ERROR_THRESHOLD=20
API_ERROR_WINDOW=900       # seconds (15 minutes)

# Database error threshold
DB_ERROR_THRESHOLD=5
DB_ERROR_WINDOW=300        # seconds

# Unusual activity threshold
UNUSUAL_ACTIVITY_THRESHOLD=50
UNUSUAL_ACTIVITY_WINDOW=1800  # seconds (30 minutes)
```

---

## 📋 **Step-by-Step Configuration**

### Step 1: Create Environment File
Create a `.env.local` file in your project root:

```bash
# Navigate to your project directory
cd /path/to/alignzo-lite

# Create environment file
touch .env.local
```

### Step 2: Basic Monitoring Setup
Add the following basic configuration to `.env.local`:

```bash
# === CORE MONITORING ===
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=7
ARCHIVAL_ENABLED=true
LOG_LEVEL=info

# === ALERT CONFIGURATION ===
ALERT_RETENTION_DAYS=30
FAILED_LOGIN_THRESHOLD=5
RATE_LIMIT_THRESHOLD=10
API_ERROR_THRESHOLD=20
```

### Step 3: Email Configuration (Optional)
If you want email alerts, add SMTP settings:

```bash
# === EMAIL ALERTS ===
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=your-email@company.com

# Gmail SMTP example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourcompany.com
```

**Note:** For Gmail, you'll need to:
1. Enable 2FA on your Google account
2. Generate an App Password
3. Use the App Password as `SMTP_PASS`

### Step 4: Slack Configuration (Optional)
For Slack notifications:

1. **Create Slack Webhook:**
   - Go to https://api.slack.com/incoming-webhooks
   - Create a new webhook for your workspace
   - Choose the channel (#security-alerts recommended)
   - Copy the webhook URL

2. **Add to environment:**
```bash
# === SLACK ALERTS ===
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#security-alerts
SLACK_MIN_ALERT_LEVEL=HIGH
```

### Step 5: Advanced Configuration
For production environments, add advanced settings:

```bash
# === ADVANCED MONITORING ===
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_ATTEMPTS=3
API_KEY_RETENTION_DAYS=90

# === RATE LIMITING ===
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
JIRA_RATE_LIMIT_MAX=20
```

---

## 🧪 **Testing Your Configuration**

### Test 1: Basic Monitoring
```bash
# Run the monitoring test
node scripts/test-monitoring-config.js
```

### Test 2: Email Alerts (if configured)
```bash
# Test email configuration
node scripts/test-email-alerts.js
```

### Test 3: Slack Alerts (if configured)
```bash
# Test Slack integration
node scripts/test-slack-alerts.js
```

---

## 🚀 **Environment-Specific Configurations**

### Development Environment
```bash
# Minimal configuration for development
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=3
LOG_LEVEL=debug
ALERT_EMAIL_ENABLED=false
SLACK_WEBHOOK_URL=""
```

### Staging Environment
```bash
# Staging configuration
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=7
LOG_LEVEL=info
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=dev-team@company.com
SLACK_MIN_ALERT_LEVEL=CRITICAL
```

### Production Environment
```bash
# Full production configuration
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=30
LOG_LEVEL=warn
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@company.com,security@company.com
SLACK_MIN_ALERT_LEVEL=HIGH
WEBHOOK_RETRY_ATTEMPTS=5
```

---

## ⚡ **Quick Start Templates**

### Minimal Setup (5 minutes)
```bash
# Copy this to .env.local for basic monitoring
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=7
LOG_LEVEL=info
```

### Email-Only Setup (10 minutes)
```bash
# Basic monitoring + email alerts
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=7
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=your-email@company.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
```

### Full Setup (15 minutes)
```bash
# Complete monitoring system
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=7
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
FAILED_LOGIN_THRESHOLD=5
RATE_LIMIT_THRESHOLD=10
```

---

## 🔍 **Verification Steps**

After configuration, verify your setup:

1. **Check Environment Loading:**
   ```bash
   node -e "console.log('Monitoring enabled:', process.env.MONITORING_ENABLED)"
   ```

2. **Test Database Connection:**
   ```bash
   node scripts/test-phase3-security.js
   ```

3. **Verify Alert Configuration:**
   ```bash
   node -e "
   console.log('Email alerts:', process.env.ALERT_EMAIL_ENABLED);
   console.log('Slack webhook:', !!process.env.SLACK_WEBHOOK_URL);
   console.log('Retention days:', process.env.AUDIT_RETENTION_DAYS);
   "
   ```

---

## 🛠️ **Troubleshooting**

### Common Issues

#### 1. Environment Variables Not Loading
- Ensure `.env.local` is in the project root
- Restart your development server
- Check for syntax errors in `.env.local`

#### 2. Email Alerts Not Working
- Verify SMTP credentials
- Check for 2FA requirements (Gmail)
- Test with a simple email client first

#### 3. Slack Alerts Failing
- Verify webhook URL is correct
- Check Slack app permissions
- Test webhook with curl:
  ```bash
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Test message"}' \
    YOUR_SLACK_WEBHOOK_URL
  ```

#### 4. Database Errors
- Ensure Phase 3 schema is applied to Supabase
- Check Supabase connection string
- Verify RLS policies are set correctly

---

## 📱 **Next Steps**

After completing the environment configuration:

1. **Apply Database Schema:**
   ```sql
   -- Run this in your Supabase SQL editor
   \i database/phase3_schema_fixed.sql
   ```

2. **Test All Features:**
   ```bash
   npm run test:security
   ```

3. **Deploy to Production:**
   - Configure Vercel environment variables (see next section)
   - Test in staging first
   - Monitor logs for any issues

4. **Set Up Monitoring Dashboard:**
   - Consider setting up a monitoring dashboard
   - Create regular audit reports
   - Set up automated health checks

---

This completes the monitoring environment configuration. The system is now ready to provide comprehensive security monitoring and alerting for your application.
