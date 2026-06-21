import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

content = content.replace(
  'font-size: 0.75rem;',
  'font-size: 0.65rem;'
);
content = content.replace(
  'padding: 16px;\n          text-align: left;',
  'padding: 10px 8px;\n          text-align: left;'
);
content = content.replace(
  'padding: 14px 16px;\n          font-size: 0.85rem;',
  'padding: 8px;\n          font-size: 0.75rem;'
);
content = content.replace(
  'let val = getCellValue(row, col);',
  'let val = col === "SR. NO." ? (ri + 1) : getCellValue(row, col);'
);

fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Patched ReportsHubPage layout!");
