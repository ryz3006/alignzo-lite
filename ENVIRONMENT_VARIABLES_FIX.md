# 🔧 Environment Variables Fix Guide

## 🚨 Critical Issues Identified

### 1. **Firebase Not Initialized Error**
- **Problem**: `Error: Firebase not initialized`
- **Cause**: Missing Firebase environment variables in Vercel
- **Impact**: Users cannot sign in with Google

### 2. **Admin Authentication 403 Forbidden**
- **Problem**: `GET /api/admin/security-alerts 403 (Forbidden)`
- **Cause**: Admin email not being sent in API headers
- **Impact**: Admin cannot access security alerts

### 3. **Audit Trail Not Showing**
- **Problem**: Database entries exist but not visible in admin panel
- **Cause**: Inconsistent admin authentication headers
- **Impact**: Admin cannot view audit trail

---

## 🛠️ **Immediate Fixes Applied**

### ✅ **Code Fixes Completed**

1. **Security Alerts API** - Updated to use `x-admin-email` header
2. **Client-side Headers** - Added admin authentication headers consistently
3. **Firebase Config** - Added graceful error handling for missing env vars
4. **Auth Functions** - Better error messages for Firebase issues

---

## 🌍 **Environment Variables Required**

### **Firebase Configuration (Client-side)**
```bash
# These MUST be set in Vercel as "NEXT_PUBLIC_" variables
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### **Admin Authentication (Server-side)**
```bash
# These MUST be set in Vercel as regular variables (no NEXT_PUBLIC_)
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=your-bcrypt-hashed-password
```

### **Supabase Configuration (Server-side)**
```bash
# These MUST be set in Vercel as secrets
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

---

## 🚀 **Vercel Configuration Steps**

### **Step 1: Access Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Log in and select your `alignzo-lite` project
3. Navigate to **Settings** → **Environment Variables**

### **Step 2: Add Firebase Variables**
For each Firebase variable:

1. Click **"Add New"**
2. **Name:** `NEXT_PUBLIC_FIREBASE_API_KEY` (etc.)
3. **Value:** Your Firebase configuration value
4. **Environments:** ☑ Production ☑ Preview ☑ Development
5. Click **"Save"**

**Example:**
```
Name: NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyAchetEFS86mLMIWI9z4G1BYud3ZZDQsSs
Environments: ☑ Production ☑ Preview ☑ Development
```

### **Step 3: Add Admin Variables**
```bash
Name: ADMIN_EMAIL
Value: your-admin-email@example.com
Environments: ☑ Production ☑ Preview ☑ Development

Name: ADMIN_PASSWORD_HASH
Value: $2b$10$your-bcrypt-hash-here
Environments: ☑ Production ☑ Preview ☑ Development
```

### **Step 4: Add Supabase Variables**
```bash
Name: SUPABASE_URL
Value: https://your-project.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development

Name: SUPABASE_ANON_KEY
Value: eyJ0eXAiOiJKV1QiLCJhbGc...
Environments: ☑ Production ☑ Preview ☑ Development
```

---

## 🔍 **Verification Steps**

### **1. Test Firebase Initialization**
After setting Firebase variables:
1. Deploy to Vercel
2. Check browser console for "Firebase initialized successfully"
3. Try Google sign-in

### **2. Test Admin Authentication**
After setting admin variables:
1. Deploy to Vercel
2. Login as admin
3. Navigate to Security Alerts
4. Should see data instead of 403 error

### **3. Test Audit Trail**
After setting all variables:
1. Deploy to Vercel
2. Login as admin
3. Navigate to Audit Trail
4. Should see your database entries

---

## 🚨 **Common Issues & Solutions**

### **Issue: "Firebase not initialized"**
**Solution:**
- Check all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Ensure they have `NEXT_PUBLIC_` prefix
- Verify values are correct from Firebase console

### **Issue: "Admin access required"**
**Solution:**
- Check `ADMIN_EMAIL` is set correctly
- Verify `ADMIN_PASSWORD_HASH` is bcrypt hash
- Ensure no `NEXT_PUBLIC_` prefix on server variables

### **Issue: "Cannot read property of undefined"**
**Solution:**
- Check all required environment variables are set
- Verify variable names match exactly
- Ensure proper environment selection in Vercel

---

## 📋 **Complete Environment Variables Checklist**

### **Client-side Variables (NEXT_PUBLIC_)**
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### **Server-side Variables (No prefix)**
- [ ] `ADMIN_EMAIL`
- [ ] `ADMIN_PASSWORD_HASH`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### **Optional Variables**
- [ ] `NEXTAUTH_SECRET`
- [ ] `LOG_LEVEL`
- [ ] `MONITORING_ENABLED`

---

## 🎯 **Next Steps**

1. **Set all required environment variables in Vercel**
2. **Deploy the updated code**
3. **Test each functionality:**
   - Google sign-in (Firebase)
   - Admin login (Admin auth)
   - Security alerts (Admin API)
   - Audit trail (Admin API)
4. **Monitor console for any remaining errors**

---

## 📞 **Support**

If you continue to experience issues after following this guide:

1. Check Vercel deployment logs
2. Verify environment variables are loaded correctly
3. Test with a simple API endpoint first
4. Ensure all variables have correct values and formats
