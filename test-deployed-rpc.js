const fetch = require('node-fetch');

async function testDeployedRPC() {
  try {
    console.log('🔍 Testing RPC functions in deployed environment...');
    
    const projectId = '992bb505-f93b-4a9e-88ba-f4aede14c9e0';
    const testUrl = `https://alignzo-lite.vercel.app/api/test/rpc-test?projectId=${projectId}`;
    
    console.log(`📡 Testing RPC functions: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log(`✅ Response status: ${response.status}`);
    console.log(`📊 Response data:`, JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n📋 RPC Function Results:');
      console.log(`RPC Function: ${data.rpcFunction.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Categories: ${data.rpcFunction.categoriesCount}`);
      if (data.rpcFunction.error) {
        console.log(`  Error: ${data.rpcFunction.error}`);
      }
      
      console.log(`Direct Function: ${data.directFunction.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Categories: ${data.directFunction.categoriesCount}`);
      if (data.directFunction.error) {
        console.log(`  Error: ${data.directFunction.error}`);
      }
      
      if (data.rpcFunction.categories && data.rpcFunction.categories.length > 0) {
        console.log('\n📂 Categories from RPC function:');
        data.rpcFunction.categories.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.name} with ${cat.options?.length || 0} options`);
          if (cat.options && cat.options.length > 0) {
            cat.options.forEach((option, optIndex) => {
              console.log(`      • ${option.option_value}`);
            });
          }
        });
      }
    } else {
      console.log('❌ RPC test failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing deployed RPC:', error);
  }
}

testDeployedRPC();
