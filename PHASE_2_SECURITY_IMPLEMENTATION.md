# Phase 2 Security Implementation Guide

## 🎯 Phase 2 Overview

Phase 2 focuses on **HIGH** priority security improvements that build upon the critical fixes implemented in Phase 1. These enhancements will significantly improve the security posture of your application.

## ✅ Phase 1 Completion Status

All Phase 1 critical security fixes have been successfully implemented:

- ✅ **Exposed Credentials**: Removed from documentation, replaced with placeholders
- ✅ **Input Validation**: Implemented using Zod schemas in all API routes
- ✅ **Security Headers**: Added comprehensive security headers to `next.config.js`
- ✅ **RLS Policies**: Created secure RLS policy fixes in `database/fix_rls_policies.sql`
- ✅ **Dependencies**: Added `zod` for validation
- ✅ **Documentation**: Enhanced `.gitignore` and created security documentation

## 🚀 Phase 2 Implementation Plan

### Week 3-4: Enhanced Security Features

#### 2.1 Rate Limiting Implementation

**Objective**: Prevent brute force attacks and API abuse

**Implementation Steps**:

1. **Install Dependencies**:
   ```bash
   npm install express-rate-limit
   npm install --save-dev @types/express-rate-limit
   ```

2. **Create Rate Limiting Middleware** (`lib/rate-limit.ts`):
   ```typescript
   import rateLimit from 'express-rate-limit';
   import { NextApiRequest, NextApiResponse } from 'next';

   // General API rate limiter
   export const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP, please try again later.',
     standardHeaders: true,
     legacyHeaders: false,
   });

   // Stricter limiter for authentication endpoints
   export const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // limit each IP to 5 requests per windowMs
     message: 'Too many authentication attempts, please try again later.',
     standardHeaders: true,
     legacyHeaders: false,
   });

   // Apply rate limiting to API routes
   export function applyRateLimit(req: NextApiRequest, res: NextApiResponse, limiter: any) {
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

3. **Update API Routes**:
   ```typescript
   // app/api/admin/auth/route.ts
   import { authLimiter } from '@/lib/rate-limit';

   export async function POST(request: NextRequest) {
     // Apply rate limiting
     await applyRateLimit(request, response, authLimiter);
     
     // ... existing validation and logic
   }
   ```

#### 2.2 CSRF Protection Implementation

**Objective**: Prevent cross-site request forgery attacks

**Implementation Steps**:

1. **Install Dependencies**:
   ```bash
   npm install next-csrf
   ```

2. **Create CSRF Middleware** (`lib/csrf.ts`):
   ```typescript
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

   // Generate CSRF token for forms
   export function generateCSRFToken(req: NextApiRequest): string {
     return req.csrfToken();
   }
   ```

3. **Update API Routes**:
   ```typescript
   // app/api/admin/auth/route.ts
   import { withCSRF } from '@/lib/csrf';

   export default withCSRF(async function handler(req: NextApiRequest, res: NextApiResponse) {
     // ... existing logic
   });
   ```

#### 2.3 Secure Password Storage

**Objective**: Implement proper password hashing and verification

**Implementation Steps**:

1. **Install Dependencies**:
   ```bash
   npm install bcryptjs
   npm install --save-dev @types/bcryptjs
   ```

2. **Create Password Utilities** (`lib/password.ts`):
   ```typescript
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
     if (!hashedPassword) {
       throw new Error('Admin password hash not configured');
     }
     
     const isValid = await verifyPassword(password, hashedPassword);
     
     if (isValid && email === process.env.ADMIN_EMAIL) {
       return true;
     }
     return false;
   }
   ```

3. **Update Admin Authentication**:
   ```typescript
   // app/api/admin/auth/route.ts
   import { verifyAdminCredentials } from '@/lib/password';

   export async function POST(request: NextRequest) {
     try {
       const body = await request.json();
       const { email, password } = adminAuthSchema.parse(body);

       const isValid = await verifyAdminCredentials(email, password);
       
       if (!isValid) {
         return NextResponse.json(
           { error: 'Invalid admin credentials' },
           { status: 401 }
         );
       }

       // ... rest of the logic
     } catch (error) {
       // ... error handling
     }
   }
   ```

#### 2.4 Comprehensive Logging

**Objective**: Implement security event logging and monitoring

**Implementation Steps**:

1. **Install Dependencies**:
   ```bash
   npm install winston
   ```

2. **Create Logger** (`lib/logger.ts`):
   ```typescript
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
       new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
       new winston.transports.File({ filename: 'logs/combined.log' }),
     ],
   });

   // Add console logging in development
   if (process.env.NODE_ENV !== 'production') {
     logger.add(new winston.transports.Console({
       format: winston.format.simple()
     }));
   }

   export function logSecurityEvent(event: string, details: any) {
     logger.info('Security Event', {
       event,
       details,
       timestamp: new Date().toISOString(),
       ip: details.ip || 'unknown',
       userAgent: details.userAgent || 'unknown',
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

   export function logError(error: Error, context: any = {}) {
     logger.error('Application Error', {
       error: error.message,
       stack: error.stack,
       context,
       timestamp: new Date().toISOString(),
     });
   }
   ```

3. **Update API Routes with Logging**:
   ```typescript
   // app/api/admin/auth/route.ts
   import { logSecurityEvent, logError } from '@/lib/logger';

   export async function POST(request: NextRequest) {
     try {
       const body = await request.json();
       const { email, password } = adminAuthSchema.parse(body);

       // Log authentication attempt
       logSecurityEvent('admin_login_attempt', {
         email,
         ip: request.headers.get('x-forwarded-for') || request.ip,
         userAgent: request.headers.get('user-agent'),
       });

       const isValid = await verifyAdminCredentials(email, password);
       
       if (!isValid) {
         logSecurityEvent('admin_login_failed', {
           email,
           ip: request.headers.get('x-forwarded-for') || request.ip,
         });
         
         return NextResponse.json(
           { error: 'Invalid admin credentials' },
           { status: 401 }
         );
       }

       logSecurityEvent('admin_login_success', {
         email,
         ip: request.headers.get('x-forwarded-for') || request.ip,
       });

       // ... rest of the logic
     } catch (error) {
       logError(error as Error, { endpoint: '/api/admin/auth' });
       // ... error handling
     }
   }
   ```

## 📋 Phase 2 Implementation Checklist

### Week 3:
- [ ] Install rate limiting dependencies
- [ ] Implement rate limiting middleware
- [ ] Apply rate limiting to authentication endpoints
- [ ] Install CSRF protection dependencies
- [ ] Implement CSRF middleware

### Week 4:
- [ ] Install password hashing dependencies
- [ ] Implement secure password storage
- [ ] Update admin authentication to use hashed passwords
- [ ] Install logging dependencies
- [ ] Implement comprehensive logging
- [ ] Update all API routes with logging
- [ ] Test all new security features

## 🔧 Configuration Updates

### Environment Variables (Add to `.env.local`):
```env
# CSRF Protection
CSRF_SECRET=your-super-secret-csrf-key-here

# Admin Password Hash (generate using bcrypt)
ADMIN_PASSWORD_HASH=$2b$12$your-hashed-password-here

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=logs/
```

### Generate Admin Password Hash:
```bash
# Create a script to generate password hash
node -e "
const bcrypt = require('bcryptjs');
const password = 'your-admin-password';
bcrypt.hash(password, 12).then(hash => {
  console.log('Password hash:', hash);
});
"
```

## 🧪 Testing Phase 2 Features

### Rate Limiting Test:
```bash
# Test rate limiting by making multiple requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/auth \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done
```

### CSRF Protection Test:
```bash
# Test CSRF protection
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Should return CSRF error
```

### Logging Test:
```bash
# Check log files
tail -f logs/combined.log
tail -f logs/error.log
```

## 🚨 Security Considerations

### Rate Limiting:
- Monitor rate limit violations for potential attacks
- Adjust limits based on application usage patterns
- Consider different limits for different user types

### CSRF Protection:
- Ensure all state-changing operations use CSRF tokens
- Regularly rotate CSRF secrets
- Monitor for CSRF token validation failures

### Password Security:
- Never store plain text passwords
- Use strong password policies
- Regularly rotate admin passwords
- Monitor for failed authentication attempts

### Logging:
- Secure log files with proper permissions
- Implement log rotation to prevent disk space issues
- Monitor logs for suspicious activities
- Consider log aggregation for production environments

## 📈 Next Steps

After completing Phase 2:

1. **Deploy to staging environment**
2. **Test all new security features**
3. **Monitor logs for any issues**
4. **Prepare for Phase 3 implementation**
5. **Update security documentation**

## 🔗 Related Documentation

- [Phase 1 Security Implementation](./IMMEDIATE_SECURITY_FIXES.md)
- [Security Review and Recommendations](./SECURITY_REVIEW_AND_RECOMMENDATIONS.md)
- [Security Summary](./SECURITY_SUMMARY.md)

---

**Remember**: Security is an ongoing process. Continue monitoring and improving security measures as your application evolves.
