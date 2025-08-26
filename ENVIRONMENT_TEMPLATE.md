# Environment Variables Template

Copy this template to `.env.local` and fill in your actual values:

```env
# =============================================================================
# ADMIN CREDENTIALS (Server-side - Recommended)
# =============================================================================
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password

# Alternative: Client-side (if server-side doesn't work)
# NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@example.com
# NEXT_PUBLIC_ADMIN_PASSWORD=your-admin-password

# =============================================================================
# FIREBASE CONFIGURATION (Client-side)
# =============================================================================
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# =============================================================================
# SUPABASE CONFIGURATION (Server-side)
# =============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Client-side Supabase (if needed)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# =============================================================================
# REDIS CONFIGURATION (Server-side - Optional for caching)
# =============================================================================
STORAGE_REDIS_URL=redis://username:password@host:port
STORAGE_URL=redis://username:password@host:port

# =============================================================================
# OPTIONAL CONFIGURATION
# =============================================================================
NODE_ENV=development
LOG_LEVEL=info
MONITORING_ENABLED=false

# =============================================================================
# SECURITY & MONITORING (Optional)
# =============================================================================
NEXTAUTH_SECRET=your-nextauth-secret
AUDIT_RETENTION_DAYS=30
ALERT_EMAIL_ENABLED=false
SLACK_WEBHOOK_URL=your-slack-webhook-url

# =============================================================================
# RATE LIMITING (Optional)
# =============================================================================
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW=15
AUTH_RATE_LIMIT_MAX=5
```

## Quick Setup Instructions

1. **Copy the template above**
2. **Create a new file called `.env.local`** in your project root
3. **Paste the template** into `.env.local`
4. **Replace all placeholder values** with your actual configuration
5. **Save the file** and restart your development server

## Important Notes

- **Server-side variables** (no `NEXT_PUBLIC_` prefix) are safe for secrets
- **Client-side variables** (with `NEXT_PUBLIC_` prefix) are exposed to the browser
- **Redis variables** are optional but recommended for better performance
- **Never commit `.env.local`** to version control (it's already in `.gitignore`)

## Redis Setup

For Redis configuration, you can use:
- **Local Redis**: `redis://localhost:6379`
- **Vercel Redis**: `redis://default:password@redis-12345.upstash.io:12345`
- **Redis Cloud**: `redis://username:password@redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com:12345`

See [Redis Environment Setup](./REDIS_ENVIRONMENT_SETUP.md) for detailed configuration instructions.
