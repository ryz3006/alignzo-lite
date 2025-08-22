# 🔧 Security Alerts 500 Error Fix Guide

## 🚨 **Error Description**
```
GET https://alignzo-lite.vercel.app/api/admin/security-alerts?page=1&pageSize=20&dateFrom=2025-08-20&dateTo=2025-08-22 500 (Internal Server Error)
Error fetching data: Error: Internal server error
```

## 🔍 **Root Causes Identified**

### **1. Missing Environment Variables**
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are not set in Vercel
- Server-side Supabase client cannot connect to database

### **2. Missing Database Table**
- `security_alerts` table doesn't exist in your Supabase database
- API tries to query a non-existent table

### **3. Supabase Connection Failure**
- Environment variables missing → connection fails → 500 error

### **4. Column Mismatch (NEW ISSUE)**
- Table exists but with different column names than expected
- API expects `created_at` column but it doesn't exist

## 🛠️ **Immediate Fixes Applied**

### ✅ **1. Enhanced Error Handling**
- Added table existence check
- Better error messages and logging
- Graceful fallback when table doesn't exist

### ✅ **2. Robust Supabase Configuration**
- Better error handling for missing environment variables
- Development vs production error messages
- Prevents crashes when config is missing

### ✅ **3. Flexible Table Schema**
- Smart column addition (only adds missing columns)
- Handles existing tables with different structures
- Safe to run multiple times

### ✅ **4. Diagnostic Tools**
- Script to check current table structure
- Identifies missing columns and constraints

## 🚀 **Step-by-Step Fix**

### **Step 1: Set Environment Variables in Vercel**

1. Go to [vercel.com](https://vercel.com)
2. Select your `alignzo-lite` project
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:

```bash
# Supabase Configuration (Server-side - NO NEXT_PUBLIC_ prefix)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Admin Authentication (Server-side)
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=your-bcrypt-hash

# Firebase Configuration (Client-side - WITH NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### **Step 2: Diagnose Current Table Structure**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. **FIRST** run the diagnostic script:

```sql
-- Run this diagnostic script first
-- Copy the content from: database/check_security_alerts_structure.sql
```

4. **Check the results** to see what columns currently exist

### **Step 3: Fix Table Structure**

1. **After running the diagnostic**, run the fix script:

```sql
-- Run this fix script
-- Copy the content from: database/security_alerts_table.sql
```

This script will:
- ✅ Create the table if it doesn't exist
- ✅ Add missing columns safely
- ✅ Create indexes and triggers
- ✅ Set up RLS policies
- ✅ Insert sample data

### **Step 4: Deploy Updated Code**

```bash
git add .
git commit -m "Fix security alerts 500 error with enhanced error handling and flexible table schema"
git push
```

### **Step 5: Test the Fix**

1. **Deploy to Vercel** - Wait for deployment to complete
2. **Login as admin** - Navigate to Security Alerts
3. **Check for errors** - Should see data instead of 500 error
4. **Verify functionality** - Test acknowledge/resolve actions

## 🔍 **Verification Steps**

### **1. Check Environment Variables**
Visit `/api/test-env` to verify all variables are set correctly.

### **2. Check Supabase Connection**
- Go to Supabase dashboard
- Check if `security_alerts` table exists
- Verify all required columns are present
- Check sample data is present

### **3. Test Security Alerts API**
- Try accessing `/api/admin/security-alerts` directly
- Should return JSON with alerts data
- No more 500 errors

## 🚨 **Common Issues & Solutions**

### **Issue: "column created_at does not exist"**
**Solution:**
- Run the diagnostic script first to see current structure
- Run the fix script to add missing columns
- The fix script handles existing tables safely

### **Issue: Still getting 500 errors**
**Solution:**
- Check Vercel deployment logs
- Verify environment variables are loaded
- Ensure Supabase table exists with correct columns

### **Issue: Table exists but no data**
**Solution:**
- Run the sample data INSERT statements
- Check RLS policies are correct
- Verify table permissions

### **Issue: Environment variables not loading**
**Solution:**
- Redeploy after setting variables
- Check variable names match exactly
- Ensure proper environment selection in Vercel

## 📋 **Complete Checklist**

- [ ] Set `SUPABASE_URL` in Vercel
- [ ] Set `SUPABASE_ANON_KEY` in Vercel
- [ ] Set `ADMIN_EMAIL` in Vercel
- [ ] Set `ADMIN_PASSWORD_HASH` in Vercel
- [ ] Set Firebase variables in Vercel
- [ ] **Run diagnostic script** to check current table structure
- [ ] **Run fix script** to create/fix `security_alerts` table
- [ ] Deploy updated code
- [ ] Test admin login
- [ ] Test security alerts page
- [ ] Verify no more 500 errors

## 🎯 **Expected Result**

After completing these steps:
- ✅ Security alerts API returns 200 OK
- ✅ Admin can view security alerts
- ✅ No more 500 Internal Server Error
- ✅ No more "column does not exist" errors
- ✅ Full admin functionality restored

## 📞 **Support**

If you continue to experience issues:
1. **Run the diagnostic script first** to see what's wrong
2. Check Vercel deployment logs
3. Verify Supabase connection
4. Test environment variables loading
5. Ensure all required tables and columns exist

## 🔧 **Quick Fix for Column Error**

If you're still getting the "column created_at does not exist" error:

1. **Run the diagnostic script** to see current structure
2. **Run the fix script** to add missing columns
3. **The fix script is safe** - it only adds what's missing
4. **No data loss** - existing data is preserved
