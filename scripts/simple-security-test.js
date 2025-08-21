const fs = require('fs');

console.log('🔒 Simple Security Test\n');

let passed = 0;
let total = 0;

// Test 1: Validation library
total++;
if (fs.existsSync('lib/validation.ts')) {
  console.log('✅ Validation library exists');
  passed++;
} else {
  console.log('❌ Validation library missing');
}

// Test 2: RLS fix file
total++;
if (fs.existsSync('database/fix_rls_policies.sql')) {
  console.log('✅ RLS fix file exists');
  passed++;
} else {
  console.log('❌ RLS fix file missing');
}

// Test 3: Zod dependency
total++;
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies.zod) {
    console.log('✅ Zod dependency found');
    passed++;
  } else {
    console.log('❌ Zod dependency missing');
  }
} catch (error) {
  console.log('❌ Could not read package.json');
}

// Test 4: Security headers
total++;
try {
  const config = fs.readFileSync('next.config.js', 'utf8');
  if (config.includes('X-Frame-Options') && config.includes('Content-Security-Policy')) {
    console.log('✅ Security headers configured');
    passed++;
  } else {
    console.log('❌ Security headers missing');
  }
} catch (error) {
  console.log('❌ Could not read next.config.js');
}

// Test 5: Documentation placeholders
total++;
try {
  const deployment = fs.readFileSync('DEPLOYMENT.md', 'utf8');
  if (deployment.includes('your-firebase-api-key') && deployment.includes('your-supabase-anon-key')) {
    console.log('✅ Documentation uses placeholders');
    passed++;
  } else {
    console.log('❌ Documentation may contain real credentials');
  }
} catch (error) {
  console.log('❌ Could not read DEPLOYMENT.md');
}

// Test 6: API validation
total++;
try {
  const adminAuth = fs.readFileSync('app/api/admin/auth/route.ts', 'utf8');
  const jiraRoute = fs.readFileSync('app/api/integrations/jira/route.ts', 'utf8');
  if (adminAuth.includes('zod') && jiraRoute.includes('zod')) {
    console.log('✅ API routes have validation');
    passed++;
  } else {
    console.log('❌ API routes missing validation');
  }
} catch (error) {
  console.log('❌ Could not check API routes');
}

console.log(`\n📊 Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('🎉 All security tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the issues above.');
  process.exit(1);
}
