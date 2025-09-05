#!/usr/bin/env node

/**
 * SendGrid Setup Guide
 * 
 * This script helps you set up SendGrid for email notifications.
 * SendGrid is more reliable than personal email providers for applications.
 */

console.log('📧 SendGrid Setup Guide');
console.log('=======================\n');

console.log('🚀 Why Use SendGrid?');
console.log('   ✅ No App Password required');
console.log('   ✅ More reliable than personal email');
console.log('   ✅ Better deliverability');
console.log('   ✅ Free tier available (100 emails/day)');
console.log('   ✅ Designed for applications\n');

console.log('📋 Setup Steps:');
console.log('   1. Go to https://sendgrid.com/');
console.log('   2. Sign up for a free account');
console.log('   3. Verify your email address');
console.log('   4. Go to Settings → API Keys');
console.log('   5. Create a new API key with "Mail Send" permissions');
console.log('   6. Copy the API key\n');

console.log('🔧 Environment Variables:');
console.log('   Add these to your .env.local file:');
console.log('   ```bash');
console.log('   # SendGrid Configuration');
console.log('   SMTP_HOST=smtp.sendgrid.net');
console.log('   SMTP_PORT=587');
console.log('   SMTP_SECURE=false');
console.log('   SMTP_USER=apikey');
console.log('   SMTP_PASS=your-sendgrid-api-key-here');
console.log('   SMTP_FROM=operations@6dtech.co.in');
console.log('   ```\n');

console.log('🧪 Test Your SendGrid Setup:');
console.log('   After setting up SendGrid, run:');
console.log('   node test-smtp-configurations.js\n');

console.log('💡 Alternative Services:');
console.log('   - Mailgun: https://mailgun.com/');
console.log('   - Amazon SES: https://aws.amazon.com/ses/');
console.log('   - Postmark: https://postmarkapp.com/\n');

console.log('🔒 Security Note:');
console.log('   Never commit your API keys to version control!');
console.log('   Always use environment variables for sensitive data.');
