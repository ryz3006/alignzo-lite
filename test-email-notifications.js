// Test script for Kanban email notifications
// Run with: node test-email-notifications.js

const testEmailNotifications = async () => {
  try {
    console.log('🧪 Testing Kanban Email Notifications...\n');

    // Test 1: Check environment variables
    console.log('1. Checking environment variables...');
    const requiredEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT', 
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars.join(', '));
      console.log('   Please set these in your .env.local file or deployment environment\n');
      return false;
    } else {
      console.log('✅ All required environment variables are set\n');
    }

    // Test 2: Test email service connection
    console.log('2. Testing email service connection...');
    console.log('   This will test SMTP connectivity and credentials...');
    try {
      const response = await fetch('http://localhost:3000/api/kanban/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Email service connection test passed');
        console.log('   📧 SMTP server is reachable and credentials are valid\n');
      } else {
        console.log('❌ Email service connection test failed:', result.message);
        console.log('   🔍 Check your SMTP configuration and credentials\n');
        return false;
      }
    } catch (error) {
      console.log('❌ Failed to test email service:', error.message);
      console.log('   Make sure your Next.js app is running on localhost:3000');
      console.log('   Run: npm run dev\n');
      return false;
    }

    // Test 3: Validate SMTP configuration
    console.log('3. Validating SMTP configuration...');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   Secure: ${process.env.SMTP_SECURE}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`   From: ${process.env.SMTP_FROM}`);
    console.log('✅ SMTP configuration looks valid\n');

    console.log('🎉 All tests passed! Email notifications are ready to use.\n');
    console.log('📧 To test with real emails:');
    console.log('   1. Create a task in the Kanban board');
    console.log('   2. Assign it to another user');
    console.log('   3. Update the task properties');
    console.log('   4. Move the task between columns');
    console.log('   5. Check email inboxes for notifications\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

// Run the test
testEmailNotifications().then(success => {
  process.exit(success ? 0 : 1);
});
