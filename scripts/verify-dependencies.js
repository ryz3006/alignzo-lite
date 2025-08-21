#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Critical dependencies that must be available
const criticalDeps = [
  'next',
  'react',
  'react-dom',
  'tailwindcss',
  'autoprefixer',
  'postcss',
  'typescript',
  '@types/react',
  '@types/node'
];

function checkDependency(dep) {
  try {
    require.resolve(dep);
    return true;
  } catch (error) {
    return false;
  }
}

function installMissingDeps(missingDeps) {
  if (missingDeps.length === 0) {
    console.log('✅ All critical dependencies are available');
    return;
  }

  console.log(`⚠️  Missing critical dependencies: ${missingDeps.join(', ')}`);
  console.log('Attempting to install missing dependencies...');

  try {
    const installCmd = `npm install ${missingDeps.join(' ')} --no-audit --no-fund --prefer-offline`;
    execSync(installCmd, { stdio: 'inherit' });
    console.log('✅ Missing dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install missing dependencies:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🔍 Verifying critical dependencies...');
  
  const missingDeps = criticalDeps.filter(dep => !checkDependency(dep));
  installMissingDeps(missingDeps);
}

main();
