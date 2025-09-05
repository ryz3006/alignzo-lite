#!/usr/bin/env node

/**
 * Email Provider Test Script
 * 
 * This script tests different email providers to help you find one that works.
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

console.log('📧 Email Provider Test Script');
console.log('==============================\n');

// Test configurations for different providers
const providerConfigs = [
  {
    name: 'Gmail (Personal)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    requirements: 'Requires App Password (2FA enabled)'
  },
  {
    name: 'Gmail (Workspace)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    requirements: 'May require OAuth2 or admin settings'
  },
  {
    name: 'Outlook/Hotmail',
    config: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    requirements: 'Uses regular password'
  },
  {
    name: 'Yahoo Mail',
    config: {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    requirements: 'Requires App Password'
  }
];

async function testProvider(name, config, requirements) {
  try {
    console.log(`🔄 Testing ${name}...`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Requirements: ${requirements}`);
    
    const transporter = nodemailer.createTransport(config);
    
    // Test connection
    const verifyResult = await transporter.verify();
    console.log(`✅ ${name} - Connection successful!`);
    console.log(`   📊 Verify result:`, verifyResult);
    
    return { success: true, provider: name };
    
  } catch (error) {
    console.warn(`⚠️ ${name} failed:`);
    console.warn(`   Error: ${error.message}`);
    if (error.code) {
      console.warn(`   Code: ${error.code}`);
    }
    return { success: false, provider: name, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing different email providers...\n');
  
  const results = [];
  
  for (const { name, config, requirements } of providerConfigs) {
    const result = await testProvider(name, config, requirements);
    results.push(result);
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Provider Test Results');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`✅ ${successful.length} provider(s) working:`);
    successful.forEach(r => {
      console.log(`   - ${r.provider}`);
    });
  } else {
    console.log('❌ No providers working with current credentials.');
    console.log('\n💡 Recommendations:');
    console.log('   1. Try using a personal Gmail account with App Password');
    console.log('   2. Use Outlook/Hotmail (usually works with regular password)');
    console.log('   3. Consider using a service like SendGrid or Mailgun');
    console.log('   4. Check if your organization blocks SMTP access');
  }
  
  if (failed.length > 0) {
    console.log(`\n⚠️ ${failed.length} provider(s) failed:`);
    failed.forEach(r => {
      console.log(`   - ${r.provider}: ${r.error}`);
    });
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. If using Gmail: Enable 2FA and create App Password');
  console.log('   2. If using Outlook: Try with your regular password');
  console.log('   3. If using workspace email: Contact your IT admin');
  console.log('   4. Consider using a dedicated email service (SendGrid, etc.)');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
