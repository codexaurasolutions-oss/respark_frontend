const fs = require('fs');
const path = require('path');

const walk = (dir) => fs.readdirSync(dir).flatMap(f => {
  const p = path.join(dir, f);
  return fs.statSync(p).isDirectory() ? walk(p) : p;
}).filter(f => f.endsWith('.jsx'));

const files = walk('frontend/src/pages');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.match(/<span className="muted">\s*\{.*\}\s*<\/span>/)) {
    console.log('ERROR IN: ' + f);
  }
});
