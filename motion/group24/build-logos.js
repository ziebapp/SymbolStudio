// Inlines svg/*.svg into logos.js so the preview works from file:// without fetch.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'svg');
const out = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.svg'))) {
  out[path.basename(f, '.svg')] = fs.readFileSync(path.join(dir, f), 'utf8');
}
fs.writeFileSync(path.join(__dirname, 'logos.js'), 'window.LOGOS = ' + JSON.stringify(out) + ';\n');
console.log('logos.js:', Object.keys(out).join(', '));
