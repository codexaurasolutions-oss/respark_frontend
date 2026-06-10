const fs = require('fs');
const path = require('path');

const walk = (dir) => fs.readdirSync(dir).flatMap(f => {
  const p = path.join(dir, f);
  return fs.statSync(p).isDirectory() ? walk(p) : p;
}).filter(f => f.endsWith('.jsx'));

const files = walk('frontend/src/pages');

let modifiedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Fix the broken input tags
  // Broken pattern: <input ... onChange={(event) = />\n</label> some_code} />
  // We want to capture:
  // 1: The label text
  // 2: Everything inside <input ... up to onChange={(event) =
  // 3: The code after </label> up to } />
  
  const regex = /<label>\s*<span className="muted">([^<]+)<\/span>\s*<input(.*?onChange=\{\([^)]*\)\s*)= \/>\s*<\/label>\s*(.*?)\}\s*\/>/gs;
  
  content = content.replace(regex, (match, labelText, inputStart, afterLabel) => {
    // Reconstruct correctly
    // afterLabel is something like `setForm((current) => ({ ...current, title: event.target.value }))`
    // We need to form: onChange={(event) => setForm(...)}
    return `<label>\n              <span className="muted">${labelText}</span>\n              <input${inputStart}=> ${afterLabel.trim()}} />\n            </label>`;
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    modifiedFiles++;
    console.log(`Repaired ${f}`);
  }
});

console.log(`Total files repaired: ${modifiedFiles}`);
