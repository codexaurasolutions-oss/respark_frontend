const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'pages');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Only process if it has <select
  if (!content.includes('<select')) return;

  // We skip AppointmentsPage because we already modified it manually
  if (filePath.includes('AppointmentsPage.jsx')) return;

  // 1. Add import statement if not exists
  if (!content.includes('PremiumSelect')) {
    // Find how many levels deep we are to construct the correct import path
    const depth = filePath.replace(path.join(__dirname, 'src'), '').split(path.sep).length - 2;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    const importStr = `import PremiumSelect from '${prefix}components/PremiumSelect';\n`;
    
    // Insert after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + importStr + content.slice(endOfLastImport + 1);
    } else {
      content = importStr + content;
    }
  }

  // 2. Replace <select with <PremiumSelect
  // We want to remove className="premium-input" if it exists so we don't get double borders
  content = content.replace(/<select\b/g, '<PremiumSelect');
  content = content.replace(/<\/select>/g, '</PremiumSelect>');
  
  // Clean up premium-input classes on PremiumSelect
  content = content.replace(/<PremiumSelect([^>]*)className=["']premium-input["']([^>]*)>/g, '<PremiumSelect$1$2>');
  content = content.replace(/<PremiumSelect([^>]*)className=["']sf-select["']([^>]*)>/g, '<PremiumSelect$1$2>');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

processDir(srcDir);
console.log('Done!');
