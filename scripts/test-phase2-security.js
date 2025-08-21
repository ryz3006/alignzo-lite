const fs = require('fs');

console.log('🔒 Phase 2 Security Test\n');

let passed = 0;
let total = 0;

// Test 1: Rate limiting middleware
total++;
if (fs.existsSync('lib/rate-limit.ts')) {
  const rateLimitContent = fs.readFileSync('lib/rate-limit.ts', 'utf8');
  if (rateLimitContent.includes('applyRateLimit') && 
      rateLimitContent.includes('authLimiterConfig') &&
      rateLimitContent.includes('logRateLimitEvent')) {
    console.log('✅ Rate limiting middleware implemented');
    passed++;
  } else {
    console.log('❌ Rate limiting middleware incomplete');
  }
} else {
  console.log('❌ Rate limiting middleware missing');
}

// Test 2: CSRF protection
total++;
if (fs.existsSync('lib/csrf.ts')) {
  const csrfContent = fs.readFileSync('lib/csrf.ts', 'utf8');
  if (csrfContent.includes('generateCSRFToken') && 
      csrfContent.includes('verifyCSRFToken') &&
      csrfContent.includes('withCSRF')) {
    console.log('✅ CSRF protection implemented');
    passed++;
  } else {
    console.log('❌ CSRF protection incomplete');
  }
} else {
  console.log('❌ CSRF protection missing');
}

// Test 3: CSRF token endpoint
total++;
if (fs.existsSync('app/api/csrf-token/route.ts')) {
  console.log('✅ CSRF token endpoint exists');
  passed++;
} else {
  console.log('❌ CSRF token endpoint missing');
}

// Test 4: Password utilities
total++;
if (fs.existsSync('lib/password.ts')) {
  const passwordContent = fs.readFileSync('lib/password.ts', 'utf8');
  if (passwordContent.includes('hashPassword') && 
      passwordContent.includes('verifyPassword') &&
      passwordContent.includes('bcrypt') &&
      passwordContent.includes('verifyAdminCredentials')) {
    console.log('✅ Secure password storage implemented');
    passed++;
  } else {
    console.log('❌ Secure password storage incomplete');
  }
} else {
  console.log('❌ Secure password storage missing');
}

// Test 5: Admin hash generator
total++;
if (fs.existsSync('scripts/generate-admin-hash.js')) {
  console.log('✅ Admin password hash generator exists');
  passed++;
} else {
  console.log('❌ Admin password hash generator missing');
}

// Test 6: Comprehensive logging
total++;
if (fs.existsSync('lib/logger.ts')) {
  const loggerContent = fs.readFileSync('lib/logger.ts', 'utf8');
  if (loggerContent.includes('winston') && 
      loggerContent.includes('logSecurityEvent') &&
      loggerContent.includes('logUserAction') &&
      loggerContent.includes('SecurityEventType')) {
    console.log('✅ Comprehensive logging implemented');
    passed++;
  } else {
    console.log('❌ Comprehensive logging incomplete');
  }
} else {
  console.log('❌ Comprehensive logging missing');
}

// Test 7: Logs directory
total++;
if (fs.existsSync('logs')) {
  console.log('✅ Logs directory exists');
  passed++;
} else {
  console.log('❌ Logs directory missing');
}

// Test 8: Dependencies
total++;
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['express-rate-limit', 'csrf', 'bcryptjs', 'winston'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ All Phase 2 dependencies installed');
    passed++;
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  }
} catch (error) {
  console.log('❌ Could not check dependencies');
}

// Test 9: Admin auth route updated
total++;
try {
  const adminAuthContent = fs.readFileSync('app/api/admin/auth/route.ts', 'utf8');
  if (adminAuthContent.includes('applyRateLimit') && 
      adminAuthContent.includes('verifyAdminCredentials') &&
      adminAuthContent.includes('logAuthAttempt')) {
    console.log('✅ Admin auth route updated with Phase 2 features');
    passed++;
  } else {
    console.log('❌ Admin auth route not fully updated');
  }
} catch (error) {
  console.log('❌ Could not check admin auth route');
}

// Test 10: API routes rate limited
total++;
try {
  const jiraRouteContent = fs.readFileSync('app/api/integrations/jira/route.ts', 'utf8');
  const verifyRouteContent = fs.readFileSync('app/api/jira/verify-credentials/route.ts', 'utf8');
  
  if (jiraRouteContent.includes('applyRateLimit') && 
      verifyRouteContent.includes('applyRateLimit')) {
    console.log('✅ API routes have rate limiting applied');
    passed++;
  } else {
    console.log('❌ Not all API routes have rate limiting');
  }
} catch (error) {
  console.log('❌ Could not check API routes');
}

console.log(`\n📊 Phase 2 Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('\n🎉 All Phase 2 security tests passed!');
  console.log('\n✅ Phase 2 Implementation Complete:');
  console.log('   • Rate limiting for API endpoints');
  console.log('   • CSRF protection for state-changing operations');
  console.log('   • Secure password storage with bcrypt');
  console.log('   • Comprehensive security event logging');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Generate admin password hash');
  console.log('   2. Update environment variables');
  console.log('   3. Test functionality');
  console.log('   4. Deploy to staging');
  console.log('   5. Proceed with Phase 3');
  process.exit(0);
} else {
  console.log('\n❌ Some Phase 2 tests failed!');
  console.log('Please fix the issues above before proceeding.');
  process.exit(1);
}
