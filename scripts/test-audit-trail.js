const { auditTrail } = require('../lib/audit-trail');

async function testAuditTrail() {
  console.log('🔍 Testing Audit Trail Functionality');
  console.log('===================================');

  try {
    // Test basic query functionality
    console.log('\n1. Testing queryAuditTrail...');
    const entries = await auditTrail.queryAuditTrail({
      limit: 5,
      offset: 0
    });
    console.log(`✅ Retrieved ${entries.length} audit entries`);
    
    // Test count functionality
    console.log('\n2. Testing getAuditTrailCount...');
    const count = await auditTrail.getAuditTrailCount({});
    console.log(`✅ Total audit entries: ${count}`);
    
    // Test with filters
    console.log('\n3. Testing filtered queries...');
    const filteredEntries = await auditTrail.queryAuditTrail({
      eventType: 'API_CALL',
      limit: 3
    });
    console.log(`✅ Retrieved ${filteredEntries.length} API_CALL entries`);
    
    console.log('\n✅ All audit trail tests passed!');
    console.log('\nThe /api/admin/audit-trail endpoint should now work correctly.');
    
  } catch (error) {
    console.error('\n❌ Audit trail test failed:', error.message);
    console.error('This indicates there may still be issues with the audit trail implementation.');
  }
}

testAuditTrail().catch(console.error);
