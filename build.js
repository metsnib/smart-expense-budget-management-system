/*
 * build.js — produces a single, fully self-contained index.html
 * (all CSS and JS inlined, zero external asset requests) for previewing
 * and easy sharing. Pure Node.js, no dependencies.
 *
 *   node build.js            -> writes dist/index.html
 *   node build.js <outfile>  -> also writes to <outfile>
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// Use function replacements so `$` sequences in the CSS/JS (e.g. currency
// symbols like "S$") are never interpreted as special replacement patterns.
let out = html
  .replace(/<link rel="stylesheet" href="styles\.css"\s*\/?>/, () => '<style>\n' + css + '\n</style>')
  .replace(/<script src="app\.js"><\/script>/, () => '<script>\n' + js + '\n</script>');

const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), out);
console.log('Wrote dist/index.html (' + Math.round(out.length / 1024) + ' KB)');

const extra = process.argv[2];
if (extra) {
  fs.mkdirSync(path.dirname(extra), { recursive: true });
  fs.writeFileSync(extra, out);
  console.log('Wrote ' + extra);
}
