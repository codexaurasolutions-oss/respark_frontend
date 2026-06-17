const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let countPremium = 0;
let countTwoCol = 0;

walkDir(path.join(process.cwd(), 'src', 'pages'), (p) => {
  if (!p.endsWith('.jsx')) return;
  let content = fs.readFileSync(p, 'utf-8');
  let original = content;

  // 1. Remove PremiumSelect imports
  content = content.replace(/import\s+PremiumSelect\s+from\s+['\"].*?PremiumSelect['\"];?\r?\n?/g, '');
  
  // 2. Replace tags
  content = content.replace(/<PremiumSelect/g, '<select');
  content = content.replace(/<\/PremiumSelect>/g, '</select>');
  
  // 3. Replace two-col
  content = content.replace(/className=\"two-col\"/g, 'className=\"settings-section-grid\"');

  if (content !== original) {
    fs.writeFileSync(p, content);
    if (original.includes('PremiumSelect')) countPremium++;
    if (original.includes('two-col')) countTwoCol++;
  }
});

console.log('Done! Updated ' + countPremium + ' files with PremiumSelect and ' + countTwoCol + ' files with two-col.');
