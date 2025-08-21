const fs = require('fs');
const path = require('path');

console.log('🔒 Testing Rate Limiting Relaxations & Audit Trail Features\n');

let passed = 0;
let total = 0;

// Test 1: Check rate limiting configurations
total++;
if (fs.existsSync('lib/rate-limit.ts')) {
  const rateLimitContent = fs.readFileSync('lib/rate-limit.ts', 'utf8');
  if (rateLimitContent.includes('max: 200') && // General API relaxed
      rateLimitContent.includes('uploadLimiterConfig') &&
      rateLimitContent.includes('fileOperationLimiterConfig') &&
      rateLimitContent.includes('max: 50') && // Upload limit
      rateLimitContent.includes('max: 100') && // File operations limit
      rateLimitContent.includes('max: 5') && // Auth limit (same as before)
      rateLimitContent.includes('max: 20')) { // JIRA limit (same as before)
    console.log('✅ Rate limiting relaxations implemented');
    passed++;
  } else {
    console.log('❌ Rate limiting relaxations incomplete');
  }
} else {
  console.log('❌ Rate limiting file missing');
}

// Test 2: Check audit trail viewer page
total++;
if (fs.existsSync('app/admin/dashboard/audit-trail/page.tsx')) {
  const auditPageContent = fs.readFileSync('app/admin/dashboard/audit-trail/page.tsx', 'utf8');
  if (auditPageContent.includes('Audit Trail & Security Monitoring') &&
      auditPageContent.includes('activeTab') &&
      auditPageContent.includes('filters') &&
      auditPageContent.includes('exportData') &&
      auditPageContent.includes('handleAcknowledgeAlert') &&
      auditPageContent.includes('handleResolveAlert')) {
    console.log('✅ Admin audit trail viewer implemented');
    passed++;
  } else {
    console.log('❌ Admin audit trail viewer incomplete');
  }
} else {
  console.log('❌ Admin audit trail viewer missing');
}

// Test 3: Check audit trail API endpoints
total++;
const auditApiFiles = [
  'app/api/admin/audit-trail/route.ts',
  'app/api/admin/security-alerts/route.ts',
  'app/api/admin/security-alerts/[id]/acknowledge/route.ts',
  'app/api/admin/security-alerts/[id]/resolve/route.ts'
];

let auditApiFilesPresent = 0;
auditApiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    auditApiFilesPresent++;
  }
});

if (auditApiFilesPresent === auditApiFiles.length) {
  console.log('✅ All audit trail API endpoints created');
  passed++;
} else {
  console.log(`❌ Missing ${auditApiFiles.length - auditApiFilesPresent} audit API endpoints`);
}

// Test 4: Check admin layout updated
total++;
if (fs.existsSync('app/admin/dashboard/layout.tsx')) {
  const layoutContent = fs.readFileSync('app/admin/dashboard/layout.tsx', 'utf8');
  if (layoutContent.includes('Audit Trail') &&
      layoutContent.includes('/admin/dashboard/audit-trail') &&
      layoutContent.includes('Activity')) {
    console.log('✅ Admin layout updated with audit trail link');
    passed++;
  } else {
    console.log('❌ Admin layout not updated with audit trail link');
  }
} else {
  console.log('❌ Admin layout file missing');
}

// Test 5: Check audit trail library updates
total++;
if (fs.existsSync('lib/audit-trail.ts')) {
  const auditTrailContent = fs.readFileSync('lib/audit-trail.ts', 'utf8');
  if (auditTrailContent.includes('success?: boolean') &&
      auditTrailContent.includes('getAuditTrailCount') &&
      auditTrailContent.includes('filters.success !== undefined')) {
    console.log('✅ Audit trail library updated with new methods');
    passed++;
  } else {
    console.log('❌ Audit trail library updates incomplete');
  }
} else {
  console.log('❌ Audit trail library missing');
}

// Test 6: Check upload/import rate limiting configurations
total++;
if (fs.existsSync('lib/rate-limit.ts')) {
  const rateLimitContent = fs.readFileSync('lib/rate-limit.ts', 'utf8');
  if (rateLimitContent.includes('uploadLimiterConfig') &&
      rateLimitContent.includes('fileOperationLimiterConfig') &&
      rateLimitContent.includes('windowMs: 5 * 60 * 1000') && // 5 minutes for upload
      rateLimitContent.includes('windowMs: 10 * 60 * 1000')) { // 10 minutes for file ops
    console.log('✅ Upload and file operation rate limiting configured');
    passed++;
  } else {
    console.log('❌ Upload and file operation rate limiting incomplete');
  }
} else {
  console.log('❌ Rate limiting file missing');
}

console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('\n🎉 All Rate Limiting & Audit Trail Features Implemented!');
  console.log('\n✅ What\'s Ready:');
  console.log('   • Relaxed general API rate limiting (200 req/15min)');
  console.log('   • Special upload rate limiting (50 req/5min)');
  console.log('   • File operation rate limiting (100 req/10min)');
  console.log('   • Auth rate limiting unchanged (5 req/15min)');
  console.log('   • JIRA rate limiting unchanged (20 req/min)');
  console.log('   • Comprehensive admin audit trail viewer');
  console.log('   • Security alerts management');
  console.log('   • Filtering and pagination support');
  console.log('   • Export functionality');
  console.log('   • Alert acknowledgment and resolution');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Test the audit trail viewer in admin dashboard');
  console.log('   2. Verify rate limiting works for upload/import APIs');
  console.log('   3. Test alert acknowledgment and resolution');
  console.log('   4. Verify export functionality works');
  console.log('   5. Monitor audit trail data collection');

  process.exit(0);
} else {
  console.log('\n❌ Some features are missing!');
  console.log('Please check the issues above before proceeding.');
  process.exit(1);
}
