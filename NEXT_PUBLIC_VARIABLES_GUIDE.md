# NEXT_PUBLIC_ Variables Guide

## 🚨 **Critical Security Information**

### **When to use NEXT_PUBLIC_ prefix:**

✅ **SAFE for NEXT_PUBLIC_ (Client-side accessible):**
```bash
NEXT_PUBLIC_APP_NAME=Alignzo Lite
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_FEATURE_FLAGS={"auditTrail":true}
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_ANALYTICS_ID=UA-123456789
```

❌ **NEVER use NEXT_PUBLIC_ for (Server-side only):**
```bash
# ❌ WRONG - These will be exposed in the browser!
NEXT_PUBLIC_API_KEY=your-secret-key
NEXT_PUBLIC_DATABASE_PASSWORD=secret123
NEXT_PUBLIC_ADMIN_EMAIL=admin@company.com
NEXT_PUBLIC_SMTP_PASSWORD=email-password

# ✅ CORRECT - Server-side only
API_KEY=your-secret-key
DATABASE_PASSWORD=secret123
ADMIN_EMAIL=admin@company.com
SMTP_PASSWORD=email-password
```

## 📋 **Variable Categories**

### **Server-Side Variables (No Prefix)**
- Database connections
- API keys and secrets
- Authentication credentials
- Monitoring configuration
- Alert settings
- Rate limiting config

### **Client-Side Variables (NEXT_PUBLIC_ Prefix)**
- App name and version
- Environment indicators
- Public API endpoints
- Feature flags (non-sensitive)
- Analytics IDs
- Public configuration

## 🔍 **How to Check**

### **In Your Code:**
```javascript
// Server-side (API routes, server components)
const apiKey = process.env.API_KEY;           // ✅ Safe
const monitoringEnabled = process.env.MONITORING_ENABLED; // ✅ Safe

// Client-side (React components, browser)
const appName = process.env.NEXT_PUBLIC_APP_NAME; // ✅ Safe
const apiKey = process.env.NEXT_PUBLIC_API_KEY;   // ❌ DANGEROUS!
```

### **In Vercel Dashboard:**
- **Environment Variables**: Server-side only
- **Secrets**: Sensitive server-side data
- **Both can be referenced with NEXT_PUBLIC_ prefix for client-side**

## ⚠️ **Security Checklist**

Before deploying, verify:

- [ ] No secrets have `NEXT_PUBLIC_` prefix
- [ ] All sensitive data uses server-side variables
- [ ] Client-side variables only contain public information
- [ ] API keys and passwords are in secrets or server-side variables
- [ ] Database credentials are server-side only

## 🛠️ **Common Patterns**

### **Feature Flags:**
```bash
# Server-side feature flags
MONITORING_ENABLED=true
AUDIT_TRAIL_ENABLED=true

# Client-side feature flags (non-sensitive)
NEXT_PUBLIC_FEATURE_FLAGS={"darkMode":true,"notifications":true}
```

### **API Configuration:**
```bash
# Server-side API config
API_BASE_URL=https://api.example.com
API_KEY=secret-key-here

# Client-side API config (public endpoints only)
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_PUBLIC_ENDPOINTS=["/health","/status"]
```

## 🚀 **Quick Reference**

| Variable Type | Prefix | Accessible In | Security Level |
|---------------|--------|---------------|----------------|
| Server-side | None | API routes, server components | High (safe for secrets) |
| Client-side | NEXT_PUBLIC_ | Browser, React components | Low (never put secrets) |
| Secrets | None | Server-side only | Highest (encrypted) |

**Remember:** When in doubt, use server-side variables (no prefix) for security!
