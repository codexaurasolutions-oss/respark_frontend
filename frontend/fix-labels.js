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
  const labels = (content.match(/<label/g) || []).length;
  const inputs = (content.match(/<input/g) || []).length;
  const selects = (content.match(/<select/g) || []).length;
  
  // Only target files that have NO labels but have inputs or selects
  if (labels === 0 && (inputs > 0 || selects > 0)) {
    let newContent = content;
    
    // Replace <input ... />
    // Regex: <input([^>]*?)placeholder="([^"]+)"([^>]*?)\/?>
    newContent = newContent.replace(/<input([^>]*?)placeholder="([^"]+)"([^>]*?)\/?>/g, (match, p1, p2, p3) => {
      if (match.includes('type="checkbox"') || match.includes('type="hidden"')) return match;
      // Capitalize first letter of placeholder to use as label
      const labelText = p2.charAt(0).toUpperCase() + p2.slice(1);
      return `<label>\n              <span className="muted">${labelText}</span>\n              <input${p1}placeholder="${p2}"${p3} />\n            </label>`;
    });

    // Replace <select ...> <option value="">Select branch</option> ... </select>
    // This is harder. A select block spans multiple lines.
    // Let's find <select ...> and the very first <option ...>text</option> to extract label text.
    // We match from <select to </select>
    newContent = newContent.replace(/<select([^>]*?)>([\s\S]*?)<\/select>/g, (match, p1, inner) => {
      // Find the first option text
      const optionMatch = inner.match(/<option[^>]*?>([^<]+)<\/option>/);
      let labelText = "Select Option";
      if (optionMatch && optionMatch[1]) {
        labelText = optionMatch[1].replace(/Select |All |Auto /ig, '');
        labelText = labelText.charAt(0).toUpperCase() + labelText.slice(1);
      }
      return `<label>\n              <span className="muted">${labelText}</span>\n              <select${p1}>${inner}</select>\n            </label>`;
    });

    if (newContent !== content) {
      fs.writeFileSync(f, newContent, 'utf8');
      modifiedFiles++;
      console.log(`Updated labels in ${f}`);
    }
  }
});

console.log(`Total files updated: ${modifiedFiles}`);
