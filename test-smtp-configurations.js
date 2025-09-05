#!/usr/bin/env node

/**
 * SMTP Configuration Test Script
 * 
 * This script tests multiple SMTP configurations to help you find the working one.
 * Run this to diagnose email configuration issues.
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 SMTP Configuration Test Script');
console.log('=====================================\n');

// Get current configuration
const config = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || ''
};

console.log('📧 Current Configuration:');
console.log(`   Host: ${config.host || '❌ NOT SET'}`);
console.log(`   Port: ${config.port || '❌ NOT SET'}`);
console.log(`   Secure: ${config.secure}`);
console.log(`   User: ${config.user ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   Password: ${config.pass ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   From: ${config.from || '❌ NOT SET'}\n`);

// Validate required fields
const missingVars = [];
if (!config.host) missingVars.push('SMTP_HOST');
if (!config.user) missingVars.push('SMTP_USER');
if (!config.pass) missingVars.push('SMTP_PASS');
if (!config.from) missingVars.push('SMTP_FROM');

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('   Please set these in your .env.local file');
  process.exit(1);
}

// Test configurations
const testConfigs = [
  {
    name: 'Current Configuration',
    config: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Gmail STARTTLS (port 587, secure=false)',
    config: {
      host: config.host,
      port: 587,
      secure: false,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Gmail SSL (port 465, secure=true)',
    config: {
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Alternative STARTTLS (port 587, secure=false, no TLS config)',
    config: {
      host: config.host,
      port: 587,
      secure: false,
      auth: { user: config.user, pass: config.pass }
    }
  },
  {
    name: 'Alternative SSL (port 465, secure=true, no TLS config)',
    config: {
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.user, pass: config.pass }
    }
  }
];

async function testConfiguration(name, smtpConfig) {
  try {
    console.log(`🔄 Testing ${name}...`);
    console.log(`   Host: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`   Secure: ${smtpConfig.secure}`);
    console.log(`   TLS Config: ${smtpConfig.tls ? 'Custom' : 'Default'}`);
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Test connection
    const verifyResult = await transporter.verify();
    console.log(`✅ ${name} - Connection successful!`);
    console.log(`   📊 Verify result:`, verifyResult);
    
    // Test sending a simple email
    const testEmail = {
      from: config.from,
      to: config.user, // Send to self for testing
      subject: 'SMTP Configuration Test',
      text: `This is a test email from ${name} configuration.`,
      html: `<p>This is a test email from <strong>${name}</strong> configuration.</p>`
    };
    
    const sendResult = await transporter.sendMail(testEmail);
    console.log(`✅ ${name} - Email sent successfully!`);
    console.log(`   🆔 Message ID: ${sendResult.messageId}`);
    console.log(`   📧 Sent to: ${testEmail.to}`);
    
    return { success: true, config: smtpConfig, result: sendResult };
    
  } catch (error) {
    console.warn(`⚠️ ${name} failed:`);
    console.warn(`   Error: ${error.message}`);
    if (error.code) {
      console.warn(`   Code: ${error.code}`);
    }
    if (error.command) {
      console.warn(`   Command: ${error.command}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting SMTP configuration tests...\n');
  
  const results = [];
  
  for (const { name, config: smtpConfig } of testConfigs) {
    const result = await testConfiguration(name, smtpConfig);
    results.push({ name, ...result });
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Test Results Summary');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`✅ ${successful.length} configuration(s) working:`);
    successful.forEach(r => {
      console.log(`   - ${r.name}`);
    });
    
    console.log('\n💡 Recommendation:');
    const firstWorking = successful[0];
    console.log(`   Use the "${firstWorking.name}" configuration.`);
    console.log('   Update your .env.local file with these settings:');
    console.log(`   SMTP_HOST=${firstWorking.config.host}`);
    console.log(`   SMTP_PORT=${firstWorking.config.port}`);
    console.log(`   SMTP_SECURE=${firstWorking.config.secure}`);
    console.log(`   SMTP_USER=${firstWorking.config.auth.user}`);
    console.log(`   SMTP_PASS=${firstWorking.config.auth.pass}`);
    console.log(`   SMTP_FROM=${config.from}`);
    
  } else {
    console.log('❌ No working configurations found.');
    console.log('\n🔍 Troubleshooting suggestions:');
    console.log('   1. Check your SMTP credentials (username/password)');
    console.log('   2. For Gmail: Enable 2FA and use an App Password');
    console.log('   3. Check if your email provider blocks SMTP access');
    console.log('   4. Verify your network allows SMTP connections');
    console.log('   5. Try a different email provider (SendGrid, Mailgun, etc.)');
  }
  
  if (failed.length > 0) {
    console.log(`\n⚠️ ${failed.length} configuration(s) failed:`);
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
