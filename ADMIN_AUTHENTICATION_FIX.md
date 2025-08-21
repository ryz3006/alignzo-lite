# 🔐 Admin Authentication Fix Guide

## 🚨 **Issue Identified**

You're getting the warning "⚠️ Admin credentials not configured in environment variables" because there's a mismatch between:

1. **What the client-side was checking**: `NEXT_PUBLIC_ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_PASSWORD`
2. **What the server-side actually uses**: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`

## ✅ **What I Fixed**

1. **Removed client-side environment variable checks** - Admin credentials should be server-side only for security
2. **Updated the admin login page** to show a proper informational message
3. **Created a password hash generator script** to help you set up the correct environment variables

## 🔧 **How to Fix Your Vercel Environment Variables**

### **Step 1: Generate Your Admin Password Hash**

Run this command in your terminal (replace `YourSecurePassword123!` with your actual admin password):

```bash
node scripts/generate-admin-hash.js "YourSecurePassword123!"
```

**Example:**
```bash
node scripts/generate-admin-hash.js "AdminPassword2024!"
```

### **Step 2: Update Vercel Environment Variables**

1. Go to your **Vercel project dashboard**
2. Navigate to **Settings** → **Environment Variables**
3. **Remove** any existing admin-related variables:
   - ❌ `NEXT_PUBLIC_ADMIN_EMAIL`
   - ❌ `NEXT_PUBLIC_ADMIN_PASSWORD`
   - ❌ `ADMIN_PASSWORD` (if exists)

4. **Add** the correct environment variables:
   - ✅ `ADMIN_EMAIL` = your-admin-email@example.com
   - ✅ `ADMIN_PASSWORD_HASH` = the hash generated in Step 1

### **Step 3: Redeploy Your Application**

After updating the environment variables, redeploy your application in Vercel.

## 📋 **Environment Variables Summary**

### **✅ Correct Variables (Server-side only):**
```bash
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=$2b$12$...your-generated-hash...
```

### **❌ Wrong Variables (Remove these):**
```bash
NEXT_PUBLIC_ADMIN_EMAIL=your-admin-email@example.com
NEXT_PUBLIC_ADMIN_PASSWORD=your-admin-password
ADMIN_PASSWORD=your-admin-password
```

## 🔒 **Security Benefits**

- **Server-side only**: Admin credentials are never exposed to the browser
- **Password hashing**: Only the bcrypt hash is stored, never the plain password
- **Secure verification**: Password verification happens on the server using bcrypt
- **No client-side exposure**: Admin credentials cannot be viewed in browser dev tools

## 🧪 **Testing the Fix**

1. **Deploy the updated code** to Vercel
2. **Update your environment variables** as described above
3. **Visit your admin login page** - you should see:
   - ✅ No more warning message
   - ✅ Informational message about server-side security
   - ✅ Login form ready to use

4. **Test admin login** with your credentials

## 🚀 **Complete Environment Variables for Vercel**

Here's what your Vercel environment variables should look like:

```bash
# Admin Authentication (Server-side)
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=$2b$12$...your-generated-hash...

# Supabase Configuration (Server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Firebase Configuration (Client-side - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 🔍 **Troubleshooting**

### **If you still can't log in:**

1. **Check the hash generation**: Make sure you used the exact password you want to use
2. **Verify environment variables**: Double-check the variable names in Vercel
3. **Check the logs**: Look at Vercel function logs for any authentication errors
4. **Redeploy**: Make sure to redeploy after changing environment variables

### **If you need to change your admin password:**

1. Generate a new hash with the new password
2. Update the `ADMIN_PASSWORD_HASH` variable in Vercel
3. Redeploy the application

## 📚 **Related Files**

- `lib/password.ts` - Password verification logic
- `app/api/admin/auth/route.ts` - Admin authentication API
- `app/admin/login/page.tsx` - Admin login page
- `scripts/generate-admin-hash.js` - Password hash generator

---

**🎉 After following these steps, your admin authentication should work correctly and securely!**
