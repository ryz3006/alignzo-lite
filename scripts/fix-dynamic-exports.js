const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files in a directory
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to check if a file uses request.url
function usesRequestUrl(content) {
  return content.includes('new URL(request.url)') || 
         content.includes('request.url');
}

// Function to check if file already has dynamic export
function hasDynamicExport(content) {
  return content.includes('export const dynamic = \'force-dynamic\'');
}

// Function to add dynamic export to a file
function addDynamicExport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (usesRequestUrl(content) && !hasDynamicExport(content)) {
    console.log(`Adding dynamic export to: ${filePath}`);
    
    // Find the first import statement
    const importMatch = content.match(/^import.*$/m);
    if (importMatch) {
      const importLine = importMatch[0];
      const newContent = content.replace(
        importLine,
        `${importLine}\n\n// Force dynamic rendering for this route\nexport const dynamic = 'force-dynamic';`
      );
      
      fs.writeFileSync(filePath, newContent);
      return true;
    }
  }
  
  return false;
}

// Main execution
const apiDir = path.join(__dirname, '..', 'app', 'api');
const tsFiles = findTsFiles(apiDir);

console.log('Scanning API routes for request.url usage...');
let fixedCount = 0;

tsFiles.forEach(file => {
  if (addDynamicExport(file)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} API routes with dynamic exports.`);
console.log('Build should now work without dynamic server usage errors.');
