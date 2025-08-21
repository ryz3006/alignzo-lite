# Immediate Security Fixes - Step by Step Implementation

## 🚨 CRITICAL: These fixes must be implemented immediately

### Step 1: Remove Exposed Credentials (URGENT)

**Action Required: IMMEDIATE**

1. **Remove credentials from DEPLOYMENT.md:**
```bash
# Edit DEPLOYMENT.md and remove all hardcoded credentials
# Replace with placeholder values
```

2. **Rotate all exposed API keys:**
   - Go to Firebase Console → Project Settings → General → Web API Key → Regenerate
   - Go to Supabase Dashboard → Settings → API → Regenerate anon key
   - Update all environment variables in Vercel dashboard

3. **Update environment variables:**
```env
# .env.local (DO NOT COMMIT THIS FILE)
NEXT_PUBLIC_FIREBASE_API_KEY=your_new_firebase_api_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_supabase_anon_key
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_secure_password
```

### Step 2: Fix Row Level Security (RLS)

**Create a new SQL file: `database/fix_rls_policies.sql`**

```sql
-- Fix RLS Policies for All Tables
-- Run this in your Supabase SQL Editor

-- 1. Fix users table RLS
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Allow public insert" ON users;
DROP POLICY IF EXISTS "Allow public update" ON users;
DROP POLICY IF EXISTS "Allow public delete" ON users;

-- Only admins can manage users
CREATE POLICY "Admins can manage users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE email = auth.jwt() ->> 'email' 
    AND access_dashboard = true
  )
);

-- 2. Fix work_logs table RLS
DROP POLICY IF EXISTS "Allow public read access" ON work_logs;
DROP POLICY IF EXISTS "Allow public insert" ON work_logs;
DROP POLICY IF EXISTS "Allow public update" ON work_logs;
DROP POLICY IF EXISTS "Allow public delete" ON work_logs;

CREATE POLICY "Users can view their own work logs" ON work_logs
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own work logs" ON work_logs
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own work logs" ON work_logs
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own work logs" ON work_logs
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 3. Fix timers table RLS
DROP POLICY IF EXISTS "Allow public read access" ON timers;
DROP POLICY IF EXISTS "Allow public insert" ON timers;
DROP POLICY IF EXISTS "Allow public update" ON timers;
DROP POLICY IF EXISTS "Allow public delete" ON timers;

CREATE POLICY "Users can view their own timers" ON timers
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own timers" ON timers
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own timers" ON timers
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own timers" ON timers
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 4. Fix user_integrations table RLS
DROP POLICY IF EXISTS "Allow public read access" ON user_integrations;
DROP POLICY IF EXISTS "Allow public insert" ON user_integrations;
DROP POLICY IF EXISTS "Allow public update" ON user_integrations;
DROP POLICY IF EXISTS "Allow public delete" ON user_integrations;

CREATE POLICY "Users can view their own integrations" ON user_integrations
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create their own integrations" ON user_integrations
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own integrations" ON user_integrations
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own integrations" ON user_integrations
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

-- 5. Fix uploaded_tickets table RLS
DROP POLICY IF EXISTS "Allow public read access" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public insert" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public update" ON uploaded_tickets;
DROP POLICY IF EXISTS "Allow public delete" ON uploaded_tickets;

-- Users can only see tickets they uploaded
CREATE POLICY "Users can view their uploaded tickets" ON uploaded_tickets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM upload_sessions 
    WHERE upload_sessions.id = uploaded_tickets.source_id 
    AND upload_sessions.user_email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can insert tickets" ON uploaded_tickets
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM upload_sessions 
    WHERE upload_sessions.id = uploaded_tickets.source_id 
    AND upload_sessions.user_email = auth.jwt() ->> 'email'
  )
);

-- 6. Fix upload_sessions table RLS
DROP POLICY IF EXISTS "Allow public read access" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public insert" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public update" ON upload_sessions;
DROP POLICY IF EXISTS "Allow public delete" ON upload_sessions;

CREATE POLICY "Users can view their upload sessions" ON upload_sessions
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can create upload sessions" ON upload_sessions
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their upload sessions" ON upload_sessions
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their upload sessions" ON upload_sessions
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);
```

### Step 3: Add Input Validation

**Create `lib/validation.ts`:**

```typescript
import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Full name too long'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
  access_dashboard: z.boolean().default(true),
  access_work_report: z.boolean().default(false),
  access_analytics: z.boolean().default(false),
  access_analytics_workload: z.boolean().default(false),
  access_analytics_project_health: z.boolean().default(false),
  access_analytics_tickets: z.boolean().default(false),
  access_analytics_operational: z.boolean().default(false),
  access_analytics_team_insights: z.boolean().default(false),
  access_analytics_remedy: z.boolean().default(false),
  access_upload_tickets: z.boolean().default(false),
  access_master_mappings: z.boolean().default(false),
  access_integrations: z.boolean().default(false),
});

export const userUpdateSchema = userSchema.partial();

// JIRA integration validation
export const jiraIntegrationSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  base_url: z.string().url('Invalid URL'),
  user_email_integration: z.string().email('Invalid integration email'),
  api_token: z.string().min(1, 'API token is required'),
  is_verified: z.boolean().default(false),
});

// Work log validation
export const workLogSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  project_id: z.string().uuid('Invalid project ID'),
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  task_detail: z.string().min(1, 'Task detail is required'),
  dynamic_category_selections: z.record(z.string()),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time'),
  total_pause_duration_seconds: z.number().min(0),
  logged_duration_seconds: z.number().min(0),
});

// Timer validation
export const timerSchema = z.object({
  user_email: z.string().email('Invalid email address'),
  project_id: z.string().uuid('Invalid project ID'),
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  task_detail: z.string().min(1, 'Task detail is required'),
  dynamic_category_selections: z.record(z.string()),
  start_time: z.string().datetime('Invalid start time'),
  is_running: z.boolean(),
  is_paused: z.boolean(),
  pause_start_time: z.string().datetime().optional(),
  total_pause_duration_seconds: z.number().min(0),
});

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
```

### Step 4: Update API Routes with Validation

**Update `app/api/admin/auth/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const adminAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { email, password } = adminAuthSchema.parse(body);

    // Get admin credentials from server-side environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Return success with admin session data
    return NextResponse.json({
      success: true,
      admin: {
        email: adminEmail,
        isAdmin: true
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Admin auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Update `app/api/integrations/jira/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { jiraIntegrationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailSchema = z.string().email();
    emailSchema.parse(userEmail);

    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_email', userEmail)
      .eq('integration_type', 'jira')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      integration: integration || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    console.error('Error fetching JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = jiraIntegrationSchema.parse(body);

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_email', validatedData.user_email)
      .eq('integration_type', 'jira')
      .single();

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data: integration, error } = await supabase
        .from('user_integrations')
        .update({
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingIntegration.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        );
      }

      result = integration;
    } else {
      // Create new integration
      const { data: integration, error } = await supabase
        .from('user_integrations')
        .insert({
          user_email: validatedData.user_email,
          integration_type: 'jira',
          base_url: validatedData.base_url,
          user_email_integration: validatedData.user_email_integration,
          api_token: validatedData.api_token,
          is_verified: validatedData.is_verified
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create integration' },
          { status: 500 }
        );
      }

      result = integration;
    }

    return NextResponse.json({
      message: 'Integration saved successfully',
      integration: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error saving JIRA integration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 5: Add Security Headers

**Update `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use SSR for Vercel deployment
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
  
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.firebase.com;",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
```

### Step 6: Install Required Dependencies

**Update `package.json`:**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.5",
    "date-fns": "^2.30.0",
    "dotenv": "^17.2.1",
    "firebase": "^9.22.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.1",
    "lucide-react": "^0.294.0",
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "react-firebase-hooks": "^5.1.1",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.8.0",
    "xlsx": "^0.18.5",
    "zod": "^3.22.4"
  }
}
```

**Install dependencies:**
```bash
npm install zod
```

### Step 7: Update .gitignore

**Ensure `.gitignore` includes:**
```gitignore
# local env files
.env*.local
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# runtime data
pids
*.pid
*.seed
*.pid.lock
```

### Step 8: Test the Fixes

**Create a test script `scripts/test-security.js`:**

```javascript
const { execSync } = require('child_process');

console.log('🔒 Testing Security Fixes...\n');

// Test 1: Check for exposed credentials
console.log('1. Checking for exposed credentials...');
try {
  const grepResult = execSync('grep -r "AIzaSy" . --exclude-dir=node_modules --exclude-dir=.git', { encoding: 'utf8' });
  console.log('❌ Found exposed Firebase API keys!');
  console.log(grepResult);
} catch (error) {
  console.log('✅ No exposed Firebase API keys found');
}

// Test 2: Check for environment files
console.log('\n2. Checking for committed environment files...');
try {
  const envFiles = execSync('find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
  console.log('❌ Found environment files that should not be committed:');
  console.log(envFiles);
} catch (error) {
  console.log('✅ No environment files found');
}

// Test 3: Check for validation imports
console.log('\n3. Checking for validation implementation...');
try {
  const validationCheck = execSync('grep -r "zod" app/api --include="*.ts"', { encoding: 'utf8' });
  console.log('✅ Validation library found in API routes');
} catch (error) {
  console.log('❌ Validation not implemented in API routes');
}

console.log('\n🔒 Security test completed!');
```

**Run the test:**
```bash
node scripts/test-security.js
```

## Summary of Immediate Actions

1. ✅ **Remove exposed credentials from documentation**
2. ✅ **Rotate all API keys**
3. ✅ **Implement proper RLS policies**
4. ✅ **Add input validation to API routes**
5. ✅ **Add security headers**
6. ✅ **Update dependencies**

## Next Steps

After implementing these immediate fixes:

1. **Deploy to staging environment**
2. **Test all functionality**
3. **Monitor for any issues**
4. **Proceed with Phase 2 security improvements**

## Verification Checklist

- [ ] No credentials in documentation
- [ ] All API keys rotated
- [ ] RLS policies implemented
- [ ] Input validation working
- [ ] Security headers applied
- [ ] Dependencies updated
- [ ] Tests passing
- [ ] Application functionality verified
