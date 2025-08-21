const bcrypt = require('bcryptjs');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function hideInput() {
  process.stdin.on('data', (char) => {
    const key = char.toString();
    if (key === '\r' || key === '\n') {
      // Enter key pressed
      process.stdout.write('\n');
    } else if (key === '\u007f' || key === '\b') {
      // Backspace key pressed
      process.stdout.write('\b \b');
    } else {
      // Any other key pressed, show asterisk
      process.stdout.write('*');
    }
  });
}

console.log('🔐 Admin Password Hash Generator\n');
console.log('This script will generate a secure bcrypt hash for your admin password.');
console.log('The generated hash should be stored in your ADMIN_PASSWORD_HASH environment variable.\n');

rl.question('Enter admin password (input will be hidden): ', (password) => {
  if (!password || password.length < 8) {
    console.log('\n❌ Password must be at least 8 characters long');
    rl.close();
    return;
  }

  // Validate password strength
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    console.log('\n⚠️  Password should contain:');
    if (!hasUppercase) console.log('   - At least one uppercase letter');
    if (!hasLowercase) console.log('   - At least one lowercase letter');
    if (!hasNumber) console.log('   - At least one number');
    if (!hasSpecial) console.log('   - At least one special character');
    console.log('\nContinuing with current password...\n');
  }

  console.log('\n🔄 Generating secure hash...');

  bcrypt.hash(password, 12)
    .then(hash => {
      console.log('\n✅ Password hash generated successfully!\n');
      console.log('Add this to your environment variables:');
      console.log('=====================================');
      console.log(`ADMIN_PASSWORD_HASH=${hash}`);
      console.log('=====================================\n');
      
      console.log('📝 Instructions:');
      console.log('1. Add the above line to your .env.local file');
      console.log('2. Add it to your Vercel environment variables');
      console.log('3. Remove any existing ADMIN_PASSWORD environment variable');
      console.log('4. Restart your application\n');
      
      console.log('🔒 Security note: Keep this hash secure and never commit it to version control!');
    })
    .catch(error => {
      console.error('\n❌ Error generating hash:', error.message);
    })
    .finally(() => {
      rl.close();
    });
});

// Hide password input
rl.input.on('keypress', (str, key) => {
  if (key && key.name === 'return') {
    return;
  }
  
  // Move cursor back and clear
  if (str) {
    process.stdout.write('\b*');
  }
});
