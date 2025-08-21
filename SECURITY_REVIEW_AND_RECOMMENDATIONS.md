# Security Review and Recommendations for Alignzo Lite

## Executive Summary

This document provides a comprehensive security review of the Alignzo Lite web application, identifying critical security vulnerabilities and providing phased recommendations for remediation. The application is currently deployed on Vercel with Supabase as the database backend.

## Critical Security Issues Identified

### 🔴 **CRITICAL - Immediate Action Required**

1. **Exposed Environment Variables in Documentation**
   - Firebase API keys and Supabase credentials are hardcoded in `DEPLOYMENT.md`
   - These credentials are publicly visible in the repository

2. **Inadequate Row Level Security (RLS)**
   - Most RLS policies use `USING (true)` which allows unrestricted access
   - No proper user-based data isolation

3. **Client-Side Authentication**
   - Admin authentication relies on localStorage which is vulnerable to XSS
   - No server-side session validation

4. **Missing Input Validation**
   - No sanitization of user inputs in API routes
   - Potential for SQL injection and XSS attacks

### 🟡 **HIGH - Address in Phase 1**

1. **No Rate Limiting**
   - API endpoints lack rate limiting protection
   - Vulnerable to brute force attacks

2. **Missing CSRF Protection**
   - No CSRF tokens implemented
   - Vulnerable to cross-site request forgery

3. **Insecure Password Storage**
   - Admin passwords stored in plain text environment variables
   - No password hashing or salting

### 🟠 **MEDIUM - Address in Phase 2**

1. **No Request Validation Middleware**
   - Missing centralized input validation
   - Inconsistent error handling

2. **Inadequate Logging**
   - No security event logging
   - No audit trail for sensitive operations

3. **Missing Security Headers**
   - No Content Security Policy (CSP)
   - Missing other security headers

## Phased Security Implementation Plan

---

## **PHASE 1: Critical Security Fixes (Week 1-2)**

### 1.1 Environment Variables Security

**Current Issue:**
```env
# EXPOSED IN DEPLOYMENT.md
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAchetEFS86mLMIWI9z4G1BYud3ZZDQsSs
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Immediate Actions:**
1. **Remove exposed credentials from documentation**
2. **Rotate all exposed API keys immediately**
3. **Use environment-specific configurations**

**Implementation:**
```typescript
// lib/config.ts
export const config = {
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }
};
```

### 1.2 Implement Proper Row Level Security

**Current Issue:**
```sql
-- INSECURE: Allows all access
CREATE POLICY "Allow public read access" ON uploaded_tickets FOR SELECT USING (true);
```

**Fix Implementation:**
```sql
-- SECURE: User-based access control
CREATE POLICY "Users can view their own data" ON uploaded_tickets 
FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own data" ON uploaded_tickets 
FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own data" ON uploaded_tickets 
FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own data" ON uploaded_tickets 
FOR DELETE USING (auth.jwt() ->> 'email' = user_email);
```

### 1.3 Implement Server-Side Authentication

**Current Issue:**
```typescript
// INSECURE: Client-side admin session
localStorage.setItem('admin_session', JSON.stringify(session));
```

**Fix Implementation:**
```typescript
// lib/auth-server.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export async function validateAdminSession(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check if user is admin
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', session.user.email)
    .eq('is_admin', true)
    .single();

  if (!user) {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, session };
}
```

### 1.4 Add Input Validation

**Implementation:**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const userSchema = z.object({
  full_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone_number: z.string().optional(),
  access_dashboard: z.boolean(),
  access_work_report: z.boolean(),
  // ... other fields
});

export const jiraIntegrationSchema = z.object({
  user_email: z.string().email(),
  base_url: z.string().url(),
  user_email_integration: z.string().email(),
  api_token: z.string().min(1),
});

// API route with validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = jiraIntegrationSchema.parse(body);
    
    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

---

## **PHASE 2: Enhanced Security (Week 3-4)**

### 2.1 Implement Rate Limiting

**Implementation:**
```typescript
// lib/rate-limit.ts
import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export function applyRateLimit(req: NextApiRequest, res: NextApiResponse) {
  return new Promise((resolve, reject) => {
    limiter(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}
```

### 2.2 Add CSRF Protection

**Implementation:**
```typescript
// lib/csrf.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { csrf } from 'next-csrf';

const { csrf: csrfMiddleware } = csrf({
  secret: process.env.CSRF_SECRET || 'your-secret-key',
});

export function withCSRF(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    await csrfMiddleware(req, res);
    return handler(req, res);
  };
}
```

### 2.3 Implement Secure Password Storage

**Implementation:**
```typescript
// lib/password.ts
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Update admin authentication
export async function verifyAdminCredentials(email: string, password: string) {
  const hashedPassword = process.env.ADMIN_PASSWORD_HASH;
  const isValid = await verifyPassword(password, hashedPassword!);
  
  if (isValid && email === process.env.ADMIN_EMAIL) {
    return true;
  }
  return false;
}
```

### 2.4 Add Security Headers

**Implementation:**
```typescript
// next.config.js
const nextConfig = {
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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};
```

---

## **PHASE 3: Advanced Security (Week 5-6)**

### 3.1 Implement Request Validation Middleware

**Implementation:**
```typescript
// middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export function withValidation(schema: z.ZodSchema) {
  return function(handler: Function) {
    return async (request: NextRequest) => {
      try {
        const body = await request.json();
        const validatedData = schema.parse(body);
        
        // Add validated data to request
        (request as any).validatedData = validatedData;
        
        return handler(request);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          );
        }
        throw error;
      }
    };
  };
}
```

### 3.2 Add Comprehensive Logging

**Implementation:**
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'alignzo-lite' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export function logSecurityEvent(event: string, details: any) {
  logger.info('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
}

export function logUserAction(userEmail: string, action: string, details: any) {
  logger.info('User Action', {
    userEmail,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
}
```

### 3.3 Implement Audit Trail

**Database Schema:**
```sql
-- Create audit trail table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_email, action, table_name, record_id, new_values)
        VALUES (current_setting('app.current_user_email'), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_email, action, table_name, record_id, old_values, new_values)
        VALUES (current_setting('app.current_user_email'), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_email, action, table_name, record_id, old_values)
        VALUES (current_setting('app.current_user_email'), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## **PHASE 4: Production Hardening (Week 7-8)**

### 4.1 Implement API Key Management

**Implementation:**
```typescript
// lib/api-keys.ts
import crypto from 'crypto';

export function generateAPIKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashAPIKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Database table for API keys
CREATE TABLE api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 Add Database Encryption

**Implementation:**
```sql
-- Enable encryption for sensitive columns
ALTER TABLE users ALTER COLUMN phone_number SET ENCRYPTED;
ALTER TABLE user_integrations ALTER COLUMN api_token SET ENCRYPTED;

-- Create encrypted columns for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

### 4.3 Implement Session Management

**Implementation:**
```typescript
// lib/session.ts
import { createClient } from '@supabase/supabase-js';

export class SessionManager {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  async createSession(userEmail: string, permissions: string[]) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.supabase
      .from('sessions')
      .insert({
        token: sessionToken,
        user_email: userEmail,
        permissions: permissions,
        expires_at: expiresAt,
        created_at: new Date(),
      });

    return sessionToken;
  }

  async validateSession(token: string) {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date())
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}
```

---

## **Security Checklist**

### Phase 1 Checklist
- [ ] Remove exposed credentials from documentation
- [ ] Rotate all API keys
- [ ] Implement proper RLS policies
- [ ] Add server-side authentication
- [ ] Implement input validation
- [ ] Add request sanitization

### Phase 2 Checklist
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Implement secure password storage
- [ ] Add security headers
- [ ] Implement proper error handling

### Phase 3 Checklist
- [ ] Add comprehensive logging
- [ ] Implement audit trail
- [ ] Add request validation middleware
- [ ] Implement monitoring and alerting

### Phase 4 Checklist
- [ ] Implement API key management
- [ ] Add database encryption
- [ ] Implement session management
- [ ] Add penetration testing
- [ ] Implement backup and recovery

---

## **Dependencies to Add**

```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "bcryptjs": "^2.4.3",
    "express-rate-limit": "^7.1.5",
    "next-csrf": "^1.0.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/express-rate-limit": "^6.0.0"
  }
}
```

---

## **Monitoring and Maintenance**

### Security Monitoring
1. **Log Analysis**: Monitor logs for suspicious activities
2. **Rate Limit Monitoring**: Track API usage patterns
3. **Failed Authentication Monitoring**: Alert on multiple failed login attempts
4. **Database Access Monitoring**: Monitor unusual database queries

### Regular Security Tasks
1. **Monthly**: Review and rotate API keys
2. **Quarterly**: Conduct security audits
3. **Annually**: Perform penetration testing
4. **Ongoing**: Monitor security advisories for dependencies

---

## **Conclusion**

This security review identifies critical vulnerabilities that must be addressed immediately, particularly the exposed credentials and inadequate access controls. The phased approach ensures systematic improvement while maintaining application functionality.

**Priority Actions:**
1. **Immediate**: Remove exposed credentials and rotate keys
2. **Week 1**: Implement proper RLS and server-side authentication
3. **Week 2**: Add input validation and rate limiting
4. **Ongoing**: Continue with phased improvements

The application has a solid foundation but requires significant security enhancements to be production-ready for handling sensitive business data.
