const fs = require('fs');
const path = require('path');

console.log('🔒 Testing Security Fixes...\n');

let allTestsPassed = true;

// Test 1: Check for validation library file
console.log('1. Checking for validation library file...');
if (fs.existsSync('lib/validation.ts')) {
  console.log('✅ Validation library file exists');
} else {
  console.log('❌ Validation library file not found');
  allTestsPassed = false;
}

// Test 2: Check for RLS fix file
console.log('\n2. Checking for RLS fix file...');
if (fs.existsSync('database/fix_rls_policies.sql')) {
  console.log('✅ RLS fix file exists');
} else {
  console.log('❌ RLS fix file not found');
  allTestsPassed = false;
}

// Test 3: Check package.json for zod dependency
console.log('\n3. Checking for zod dependency...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies.zod) {
    console.log('✅ Zod dependency found in package.json');
  } else {
    console.log('❌ Zod dependency not found in package.json');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Could not read package.json');
  allTestsPassed = false;
}

// Test 4: Check for security headers in next.config.js
console.log('\n4. Checking for security headers...');
try {
  const configContent = fs.readFileSync('next.config.js', 'utf8');
  if (configContent.includes('X-Frame-Options') && configContent.includes('Content-Security-Policy')) {
    console.log('✅ Security headers configured in next.config.js');
  } else {
    console.log('❌ Security headers not configured in next.config.js');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Could not read next.config.js');
  allTestsPassed = false;
}

// Test 5: Check for .gitignore security
console.log('\n5. Checking .gitignore for security...');
try {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  const requiredEntries = [
    '.env',
    '.env.local',
    '.env*.local',
    '*.log',
    '.vercel'
  ];
  
  let gitignorePassed = true;
  requiredEntries.forEach(entry => {
    if (!gitignoreContent.includes(entry)) {
      console.log(`❌ Missing .gitignore entry: ${entry}`);
      gitignorePassed = false;
    }
  });
  
  if (gitignorePassed) {
    console.log('✅ .gitignore properly configured');
  } else {
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Could not read .gitignore');
  allTestsPassed = false;
}

// Test 6: Check for hardcoded passwords in documentation
console.log('\n6. Checking documentation for hardcoded credentials...');
try {
  const deploymentContent = fs.readFileSync('DEPLOYMENT.md', 'utf8');
  if (deploymentContent.includes('your-admin-email@example.com') || 
      deploymentContent.includes('your-admin-password') ||
      deploymentContent.includes('your-firebase-api-key')) {
    console.log('✅ Documentation uses placeholder values');
  } else {
    console.log('❌ Documentation may contain hardcoded credentials');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('⚠️  Could not read DEPLOYMENT.md');
}

// Test 7: Check API routes for validation
console.log('\n7. Checking API routes for validation...');
try {
  const adminAuthRoute = fs.readFileSync('app/api/admin/auth/route.ts', 'utf8');
  const jiraRoute = fs.readFileSync('app/api/integrations/jira/route.ts', 'utf8');
  const verifyRoute = fs.readFileSync('app/api/jira/verify-credentials/route.ts', 'utf8');
  
  if (adminAuthRoute.includes('zod') && jiraRoute.includes('zod') && verifyRoute.includes('zod')) {
    console.log('✅ Validation implemented in API routes');
  } else {
    console.log('❌ Validation not fully implemented in API routes');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('❌ Could not check API routes');
  allTestsPassed = false;
}

// Test 8: Check for security documentation
console.log('\n8. Checking for security documentation...');
const securityDocs = [
  'SECURITY_REVIEW_AND_RECOMMENDATIONS.md',
  'IMMEDIATE_SECURITY_FIXES.md',
  'SECURITY_SUMMARY.md'
];

let docsFound = 0;
securityDocs.forEach(doc => {
  if (fs.existsSync(doc)) {
    docsFound++;
  }
});

if (docsFound === securityDocs.length) {
  console.log('✅ All security documentation files exist');
} else {
  console.log(`❌ Missing security documentation files (found ${docsFound}/${securityDocs.length})`);
  allTestsPassed = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 ALL SECURITY TESTS PASSED!');
  console.log('✅ Your application meets the basic security requirements.');
  console.log('\nNext steps:');
  console.log('1. Deploy to staging environment');
  console.log('2. Test all functionality');
  console.log('3. Monitor for any issues');
  console.log('4. Proceed with Phase 2 security improvements');
} else {
  console.log('❌ SOME SECURITY TESTS FAILED!');
  console.log('Please fix the issues above before proceeding.');
  console.log('\nCritical issues to address:');
  console.log('1. Remove any exposed credentials');
  console.log('2. Implement input validation');
  console.log('3. Add security headers');
  console.log('4. Fix RLS policies');
}
console.log('='.repeat(50));

// Exit with appropriate code
process.exit(allTestsPassed ? 0 : 1);
