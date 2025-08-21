#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function installWithRetry() {
  console.log('Starting npm installation with retry logic...');
  
  // First, try to clear npm cache
  console.log('Clearing npm cache...');
  runCommand('npm cache clean --force');
  
  // Try installation with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\nAttempt ${attempt} of ${MAX_RETRIES}`);
    
    const success = runCommand('npm install --no-audit --no-fund --prefer-offline --cache-min=3600');
    
    if (success) {
      console.log('\n✅ Installation completed successfully!');
      return;
    }
    
    if (attempt < MAX_RETRIES) {
      console.log(`\n⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
      await sleep(RETRY_DELAY);
    }
  }
  
  console.error('\n❌ All installation attempts failed');
  process.exit(1);
}

// Run the installation
installWithRetry().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
