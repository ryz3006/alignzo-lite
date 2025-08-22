const bcrypt = require('bcryptjs');

// Test admin authentication
async function testAdminAuth() {
  console.log('🔐 Testing Admin Authentication');
  console.log('================================');
  
  // Check environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  
  console.log('\n📋 Environment Variables Check:');
  console.log(`ADMIN_EMAIL: ${adminEmail ? '✅ Set' : '❌ Not set'}`);
  console.log(`ADMIN_PASSWORD_HASH: ${adminPasswordHash ? '✅ Set' : '❌ Not set'}`);
  
  if (!adminEmail || !adminPasswordHash) {
    console.log('\n❌ Admin credentials not properly configured!');
    console.log('Please set both ADMIN_EMAIL and ADMIN_PASSWORD_HASH environment variables.');
    return;
  }
  
  console.log(`\n📧 Admin Email: ${adminEmail}`);
  console.log(`🔑 Password Hash: ${adminPasswordHash.substring(0, 20)}...`);
  
  // Test password verification
  console.log('\n🧪 Testing Password Verification:');
  
  // Test with a sample password (you can change this)
  const testPassword = 'AdminPassword123!';
  
  try {
    const isValid = await bcrypt.compare(testPassword, adminPasswordHash);
    console.log(`Test password "${testPassword}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (isValid) {
      console.log('\n✅ Admin authentication is working correctly!');
      console.log('You can use these credentials to log in to the admin panel.');
    } else {
      console.log('\n❌ Password verification failed!');
      console.log('This means either:');
      console.log('1. The password hash in ADMIN_PASSWORD_HASH is incorrect');
      console.log('2. The password you\'re trying to use doesn\'t match the hash');
      console.log('\nTo generate a new password hash, run:');
      console.log('node scripts/generate-admin-hash.js "YourNewPassword"');
    }
  } catch (error) {
    console.error('\n❌ Error testing password verification:', error.message);
  }
  
  console.log('\n📝 Instructions:');
  console.log('1. If the test password is valid, you can use it to log in');
  console.log('2. If not, generate a new hash with your desired password');
  console.log('3. Update the ADMIN_PASSWORD_HASH environment variable');
  console.log('4. Redeploy your application');
}

// Run the test
testAdminAuth().catch(console.error);
