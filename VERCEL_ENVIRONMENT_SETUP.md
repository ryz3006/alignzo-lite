# Vercel Environment Variables Configuration Guide

## Overview
This guide explains how to configure environment variables in Vercel for your Alignzo Lite application, distinguishing between regular environment variables and secrets.

---

## 🔐 **Environment Variables vs Secrets**

### **NEXT_PUBLIC_ Prefix Explanation**

In Next.js, environment variables are handled differently based on where they're used:

#### **Server-Side Variables (No Prefix)**
- **Accessible in:** API routes, server components, server-side code
- **Examples:** `MONITORING_ENABLED`, `AUDIT_RETENTION_DAYS`, `LOG_LEVEL`
- **Security:** Safe for sensitive data (not exposed to browser)

#### **Client-Side Variables (NEXT_PUBLIC_ Prefix)**
- **Accessible in:** Browser, React components, client-side JavaScript
- **Examples:** `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ENVIRONMENT`
- **Security:** **NEVER** put sensitive data here (exposed to browser)

#### **Important Security Note:**
```bash
# ❌ WRONG - This will be exposed in the browser!
NEXT_PUBLIC_API_KEY=your-secret-key

# ✅ CORRECT - Server-side only
API_KEY=your-secret-key

# ✅ CORRECT - Safe for client-side
NEXT_PUBLIC_APP_NAME=Alignzo Lite
```

### **Regular Environment Variables**
Use for non-sensitive configuration values that can be viewed in Vercel dashboard:

**Server-side variables (no prefix):**
- Feature flags
- Configuration options
- Alert thresholds
- Retention periods
- Database settings (server-side only)

**Client-side variables (NEXT_PUBLIC_ prefix):**
- App name, version
- Environment indicators
- Public feature flags
- Non-sensitive UI configurations

### **Secrets (Sensitive Data)**
Use for sensitive information that should be encrypted and hidden:

- API keys and tokens
- Database credentials
- SMTP passwords
- Webhook URLs
- Authentication secrets

---

## 📋 **Complete Variable Configuration**

### **🌍 Regular Environment Variables**

Configure these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# === CORE CONFIGURATION ===
NODE_ENV=production
MONITORING_ENABLED=true
LOG_LEVEL=warn

# === CLIENT-SIDE VARIABLES (NEXT_PUBLIC_) ===
# These are accessible in the browser - use carefully!
NEXT_PUBLIC_APP_NAME=Alignzo Lite
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_FEATURE_FLAGS={"auditTrail":true,"monitoring":true}

# === RETENTION POLICIES ===
AUDIT_RETENTION_DAYS=30
ALERT_RETENTION_DAYS=30
API_KEY_RETENTION_DAYS=90
ARCHIVAL_CLEANUP_INTERVAL=24

# === FEATURE FLAGS ===
ARCHIVAL_ENABLED=true
FILE_LOGGING_ENABLED=false
DATABASE_LOGGING_ENABLED=true
ALERT_EMAIL_ENABLED=true

# === RATE LIMITING ===
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW=15
AUTH_RATE_LIMIT_MAX=5
JIRA_RATE_LIMIT_WINDOW=1
JIRA_RATE_LIMIT_MAX=20

# === ALERT THRESHOLDS ===
FAILED_LOGIN_THRESHOLD=5
FAILED_LOGIN_WINDOW=300
RATE_LIMIT_THRESHOLD=10
RATE_LIMIT_WINDOW=300
API_ERROR_THRESHOLD=20
API_ERROR_WINDOW=900
DB_ERROR_THRESHOLD=5
DB_ERROR_WINDOW=300
UNUSUAL_ACTIVITY_THRESHOLD=50
UNUSUAL_ACTIVITY_WINDOW=1800

# === SMTP CONFIGURATION (Non-sensitive) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true

# === EMAIL SETTINGS ===
EMAIL_SUBJECT_PREFIX=[ALIGNZO-ALERT]
CRITICAL_ALERT_PREFIX=[CRITICAL]
HIGH_ALERT_PREFIX=[HIGH]
MEDIUM_ALERT_PREFIX=[MEDIUM]

# === SLACK SETTINGS (Non-sensitive) ===
SLACK_CHANNEL=#security-alerts
SLACK_USERNAME=Alignzo Security Bot
SLACK_EMOJI=:warning:
SLACK_MIN_ALERT_LEVEL=HIGH

# === WEBHOOK SETTINGS ===
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_ATTEMPTS=3

# === API KEY MANAGEMENT ===
API_KEY_AUTO_CLEANUP=true
API_KEY_LENGTH=32
```

### **🔒 Secrets (Encrypted Storage)**

Configure these as encrypted secrets in Vercel:

```bash
# === DATABASE SECRETS ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://user:pass@host:port/db

# === AUTHENTICATION SECRETS ===
NEXTAUTH_SECRET=your-next-auth-secret
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id

# === ADMIN CREDENTIALS ===
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password

# === EMAIL SECRETS ===
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourcompany.com
ALERT_EMAIL_RECIPIENTS=admin@company.com,security@company.com

# === INTEGRATION SECRETS ===
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SECURITY_WEBHOOK_URL=https://your-siem.company.com/webhook/security

# === ENCRYPTION KEYS ===
CSRF_SECRET=your-csrf-secret-key
API_ENCRYPTION_KEY=your-api-encryption-key
```

---

## 🚀 **Step-by-Step Vercel Configuration**

### **Step 1: Access Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com)
2. Log in to your account
3. Select your `alignzo-lite` project
4. Navigate to **Settings** → **Environment Variables**

### **Step 2: Configure Regular Environment Variables**

For each variable in the "Regular Environment Variables" section:

1. Click **"Add New"**
2. **Name:** Enter the variable name (e.g., `MONITORING_ENABLED`)
3. **Value:** Enter the value (e.g., `true`)
4. **Environments:** Select environments (Production, Preview, Development)
5. Click **"Save"**

**Example for `MONITORING_ENABLED`:**
```
Name: MONITORING_ENABLED
Value: true
Environments: ☑ Production ☑ Preview ☑ Development
```

### **Step 3: Configure Secrets**

For sensitive variables, create them as secrets first:

1. Go to **Account Settings** → **Secrets**
2. Click **"Create Secret"**
3. **Name:** Enter secret name (e.g., `supabase-url`)
4. **Value:** Enter the sensitive value
5. Click **"Save"**

Then reference the secret in your environment variables:

1. In **Project Settings** → **Environment Variables**
2. Click **"Add New"**
3. **Name:** `SUPABASE_URL`
4. **Value:** Select the secret from dropdown
5. **Environments:** Select appropriate environments

### **Step 4: Environment-Specific Configuration**

#### **Production Environment**
```bash
# Server-side variables (no prefix)
LOG_LEVEL=warn
AUDIT_RETENTION_DAYS=30
ALERT_EMAIL_ENABLED=true
SLACK_MIN_ALERT_LEVEL=HIGH
FAILED_LOGIN_THRESHOLD=3
RATE_LIMIT_THRESHOLD=5

# Client-side variables (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_APP_NAME=Alignzo Lite
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_FEATURE_FLAGS={"auditTrail":true,"monitoring":true}
```

#### **Preview Environment**
```bash
# Moderate settings for staging/preview
LOG_LEVEL=info
AUDIT_RETENTION_DAYS=7
ALERT_EMAIL_ENABLED=true
SLACK_MIN_ALERT_LEVEL=CRITICAL
FAILED_LOGIN_THRESHOLD=5
```

#### **Development Environment**
```bash
# Relaxed settings for development
LOG_LEVEL=debug
AUDIT_RETENTION_DAYS=3
ALERT_EMAIL_ENABLED=false
SLACK_WEBHOOK_URL=""
FAILED_LOGIN_THRESHOLD=10
```

---

## 📝 **Required Secrets List**

### **Critical Secrets (Must Configure)**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password | `$2b$10$xyz...` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | `random-32-char-string` |

### **Email Secrets (If Email Alerts Enabled)**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password/app password | `app-specific-password` |
| `ALERT_EMAIL_RECIPIENTS` | Alert recipient emails | `admin@company.com,security@company.com` |

### **Integration Secrets (If Enabled)**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL | `https://hooks.slack.com/services/...` |
| `SECURITY_WEBHOOK_URL` | Custom webhook URL | `https://your-siem.company.com/webhook` |

---

## 🛠️ **Configuration Templates**

### **Minimal Production Setup**
```bash
# Server-side variables (no prefix)
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=30
LOG_LEVEL=warn

# Client-side variables (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_APP_NAME=Alignzo Lite
NEXT_PUBLIC_ENVIRONMENT=production

# Secrets
SUPABASE_URL=secret:supabase-url
SUPABASE_ANON_KEY=secret:supabase-anon-key
ADMIN_PASSWORD_HASH=secret:admin-password-hash
```

### **Full Production Setup**
```bash
# Regular Variables
MONITORING_ENABLED=true
AUDIT_RETENTION_DAYS=30
ALERT_RETENTION_DAYS=30
LOG_LEVEL=warn
ALERT_EMAIL_ENABLED=true
FAILED_LOGIN_THRESHOLD=3
RATE_LIMIT_THRESHOLD=5
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Secrets
SUPABASE_URL=secret:supabase-url
SUPABASE_ANON_KEY=secret:supabase-anon-key
ADMIN_PASSWORD_HASH=secret:admin-password-hash
SMTP_USER=secret:smtp-user
SMTP_PASS=secret:smtp-pass
ALERT_EMAIL_RECIPIENTS=secret:alert-emails
SLACK_WEBHOOK_URL=secret:slack-webhook
```

---

## 🧪 **Testing Your Configuration**

### **Step 1: Deploy and Test**
```bash
# Deploy with new environment variables
vercel --prod

# Test environment loading
curl https://your-app.vercel.app/api/health
```

### **Step 2: Verify Secrets**
Create a test endpoint to verify secrets are loaded:

```javascript
// app/api/test-env/route.ts (temporary - remove after testing)
export async function GET() {
  return Response.json({
    monitoring: !!process.env.MONITORING_ENABLED,
    supabase: !!process.env.SUPABASE_URL,
    adminHash: !!process.env.ADMIN_PASSWORD_HASH,
    emailEnabled: process.env.ALERT_EMAIL_ENABLED,
    // Don't expose actual secret values!
  });
}
```

### **Step 3: Test Email Alerts**
If email is configured, test with a manual alert:

```bash
# Trigger a test alert
curl -X POST https://your-app.vercel.app/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"level":"TEST","message":"Configuration test"}'
```

---

## ⚠️ **Security Best Practices**

### **Do's:**
- ✅ Use secrets for all sensitive data
- ✅ Use different values per environment
- ✅ Regularly rotate API keys and passwords
- ✅ Use environment-specific retention policies
- ✅ Monitor secret access in Vercel logs

### **Don'ts:**
- ❌ Never put secrets in regular environment variables
- ❌ Don't use the same secrets across all environments
- ❌ Don't commit `.env` files to git
- ❌ Don't expose secrets in API responses
- ❌ Don't use weak passwords for admin accounts

---

## 🔄 **Rotation Schedule**

### **Regular Rotation (Every 90 days):**
- Admin password hash
- SMTP passwords
- Webhook URLs
- CSRF secrets

### **Annual Rotation:**
- Supabase keys (if possible)
- NextAuth secrets
- Encryption keys

### **On Security Incident:**
- All API keys and tokens
- All webhook URLs
- Admin credentials
- Database credentials

---

## 📊 **Environment Variable Checklist**

### **Pre-Deployment Checklist:**
- [ ] All required secrets configured
- [ ] Environment-specific values set
- [ ] No sensitive data in regular variables
- [ ] Secrets properly encrypted in Vercel
- [ ] Test endpoints removed from production
- [ ] Alert thresholds appropriate for environment
- [ ] Retention policies configured
- [ ] Monitoring enabled

### **Post-Deployment Verification:**
- [ ] Application starts without errors
- [ ] Database connections working
- [ ] Authentication functioning
- [ ] Alerts being generated
- [ ] Logs being stored
- [ ] Email/Slack notifications working
- [ ] Rate limiting active
- [ ] Admin panel accessible

---

This completes the Vercel environment configuration. Your application will now have properly secured environment variables with appropriate separation between regular config and sensitive secrets.
