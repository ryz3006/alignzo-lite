const bcrypt = require('bcryptjs');

// Function to generate admin password hash
async function generateAdminPasswordHash(password) {
  try {
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    throw error;
  }
}

// Function to validate password strength
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔐 Admin Password Hash Generator');
    console.log('');
    console.log('Usage: node scripts/generate-admin-hash.js <your-admin-password>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/generate-admin-hash.js "MySecurePassword123!"');
    console.log('');
    console.log('⚠️  Important:');
    console.log('  - Use a strong password with at least 8 characters');
    console.log('  - Include uppercase, lowercase, numbers, and special characters');
    console.log('  - Keep your password secure and don\'t share it');
    console.log('');
    return;
  }
  
  const password = args[0];
  
  // Validate password strength
  const validation = validatePasswordStrength(password);
  
  if (!validation.isValid) {
    console.log('❌ Password validation failed:');
    validation.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log('');
    console.log('Please use a stronger password and try again.');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Generating password hash...');
    const hash = await generateAdminPasswordHash(password);
    
    console.log('');
    console.log('✅ Password hash generated successfully!');
    console.log('');
    console.log('📋 Add these environment variables to your Vercel project:');
    console.log('');
    console.log('ADMIN_EMAIL=your-admin-email@example.com');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('');
    console.log('🔧 Steps to add to Vercel:');
    console.log('1. Go to your Vercel project dashboard');
    console.log('2. Navigate to Settings → Environment Variables');
    console.log('3. Add the two variables above');
    console.log('4. Redeploy your application');
    console.log('');
    console.log('🔒 Security Notes:');
    console.log('- Never commit the actual password to your code');
    console.log('- Only the hash is stored in environment variables');
    console.log('- The original password is never stored anywhere');
    console.log('- Use a strong, unique password for admin access');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error generating password hash:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
