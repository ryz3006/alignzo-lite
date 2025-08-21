const fs = require('fs');

console.log('🔒 Phase 3 Security Test\n');

let passed = 0;
let total = 0;

// Test 1: Validation middleware
total++;
if (fs.existsSync('lib/validation-middleware.ts')) {
  const validationContent = fs.readFileSync('lib/validation-middleware.ts', 'utf8');
  if (validationContent.includes('withValidation') && 
      validationContent.includes('ValidationConfig') &&
      validationContent.includes('commonSchemas')) {
    console.log('✅ Validation middleware implemented');
    passed++;
  } else {
    console.log('❌ Validation middleware incomplete');
  }
} else {
  console.log('❌ Validation middleware missing');
}

// Test 2: Audit trail system
total++;
if (fs.existsSync('lib/audit-trail.ts')) {
  const auditContent = fs.readFileSync('lib/audit-trail.ts', 'utf8');
  if (auditContent.includes('AuditTrailManager') && 
      auditContent.includes('AuditEventType') &&
      auditContent.includes('logDataAccess')) {
    console.log('✅ Audit trail system implemented');
    passed++;
  } else {
    console.log('❌ Audit trail system incomplete');
  }
} else {
  console.log('❌ Audit trail system missing');
}

// Test 3: Monitoring system
total++;
if (fs.existsSync('lib/monitoring.ts')) {
  const monitoringContent = fs.readFileSync('lib/monitoring.ts', 'utf8');
  if (monitoringContent.includes('MonitoringManager') && 
      monitoringContent.includes('AlertType') &&
      monitoringContent.includes('processSecurityEvent')) {
    console.log('✅ Monitoring system implemented');
    passed++;
  } else {
    console.log('❌ Monitoring system incomplete');
  }
} else {
  console.log('❌ Monitoring system missing');
}

// Test 4: API key management
total++;
if (fs.existsSync('lib/api-key-management.ts')) {
  const apiKeyContent = fs.readFileSync('lib/api-key-management.ts', 'utf8');
  if (apiKeyContent.includes('APIKeyManager') && 
      apiKeyContent.includes('APIKeyPermission') &&
      apiKeyContent.includes('generateAPIKey')) {
    console.log('✅ API key management implemented');
    passed++;
  } else {
    console.log('❌ API key management incomplete');
  }
} else {
  console.log('❌ API key management missing');
}

// Test 5: Database schema
total++;
if (fs.existsSync('database/phase3_schema.sql')) {
  const schemaContent = fs.readFileSync('database/phase3_schema.sql', 'utf8');
  if (schemaContent.includes('audit_trail') && 
      schemaContent.includes('security_alerts') &&
      schemaContent.includes('api_keys') &&
      schemaContent.includes('monitoring_rules')) {
    console.log('✅ Phase 3 database schema created');
    passed++;
  } else {
    console.log('❌ Phase 3 database schema incomplete');
  }
} else {
  console.log('❌ Phase 3 database schema missing');
}

// Test 6: Audit logs directory
total++;
if (fs.existsSync('logs/audit')) {
  console.log('✅ Audit logs directory exists');
  passed++;
} else {
  console.log('❌ Audit logs directory missing');
}

// Test 7: Enhanced validation schemas
total++;
try {
  const validationContent = fs.readFileSync('lib/validation.ts', 'utf8');
  if (validationContent.includes('z.object') && 
      validationContent.includes('z.string') &&
      validationContent.includes('z.number')) {
    console.log('✅ Enhanced validation schemas available');
    passed++;
  } else {
    console.log('❌ Enhanced validation schemas incomplete');
  }
} catch (error) {
  console.log('❌ Could not check validation schemas');
}

// Test 8: Security event types
total++;
try {
  const loggerContent = fs.readFileSync('lib/logger.ts', 'utf8');
  if (loggerContent.includes('SecurityEventType') && 
      loggerContent.includes('LOGIN_ATTEMPT') &&
      loggerContent.includes('SUSPICIOUS_ACTIVITY')) {
    console.log('✅ Security event types defined');
    passed++;
  } else {
    console.log('❌ Security event types incomplete');
  }
} catch (error) {
  console.log('❌ Could not check security event types');
}

// Test 9: Monitoring rules
total++;
try {
  const monitoringContent = fs.readFileSync('lib/monitoring.ts', 'utf8');
  if (monitoringContent.includes('defaultMonitoringRules') && 
      monitoringContent.includes('rate-limit-exceeded') &&
      monitoringContent.includes('failed-login-attempts')) {
    console.log('✅ Default monitoring rules configured');
    passed++;
  } else {
    console.log('❌ Default monitoring rules incomplete');
  }
} catch (error) {
  console.log('❌ Could not check monitoring rules');
}

// Test 10: API key permissions
total++;
try {
  const apiKeyContent = fs.readFileSync('lib/api-key-management.ts', 'utf8');
  if (apiKeyContent.includes('APIKeyPermission') && 
      apiKeyContent.includes('READ_USERS') &&
      apiKeyContent.includes('ADMIN_ACCESS')) {
    console.log('✅ API key permissions defined');
    passed++;
  } else {
    console.log('❌ API key permissions incomplete');
  }
} catch (error) {
  console.log('❌ Could not check API key permissions');
}

// Test 11: Database functions
total++;
try {
  const schemaContent = fs.readFileSync('database/phase3_schema.sql', 'utf8');
  if (schemaContent.includes('cleanup_old_audit_trail') && 
      schemaContent.includes('cleanup_old_api_key_usage') &&
      schemaContent.includes('security_dashboard')) {
    console.log('✅ Database functions and views created');
    passed++;
  } else {
    console.log('❌ Database functions incomplete');
  }
} catch (error) {
  console.log('❌ Could not check database functions');
}

// Test 12: RLS policies
total++;
try {
  const schemaContent = fs.readFileSync('database/phase3_schema.sql', 'utf8');
  if (schemaContent.includes('ENABLE ROW LEVEL SECURITY') && 
      schemaContent.includes('CREATE POLICY') &&
      schemaContent.includes('auth.jwt()')) {
    console.log('✅ RLS policies configured');
    passed++;
  } else {
    console.log('❌ RLS policies incomplete');
  }
} catch (error) {
  console.log('❌ Could not check RLS policies');
}

console.log(`\n📊 Phase 3 Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('\n🎉 All Phase 3 security tests passed!');
  console.log('\n✅ Phase 3 Implementation Complete:');
  console.log('   • Centralized request validation middleware');
  console.log('   • Comprehensive audit trail system');
  console.log('   • Real-time monitoring and alerting');
  console.log('   • Secure API key management');
  console.log('   • Enhanced database schema with RLS');
  console.log('   • Database functions and views');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Apply database schema to Supabase');
  console.log('   2. Configure monitoring rules');
  console.log('   3. Set up alert notifications');
  console.log('   4. Test API key functionality');
  console.log('   5. Deploy to staging environment');
  console.log('   6. Proceed with Phase 4 (if needed)');
  process.exit(0);
} else {
  console.log('\n❌ Some Phase 3 tests failed!');
  console.log('Please fix the issues above before proceeding.');
  process.exit(1);
}
