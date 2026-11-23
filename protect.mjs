// protect.mjs: scrambles the site's JavaScript inside a build folder so the
// readable source is never served to visitors. Run after copying the site:
//   node protect.mjs dist
// Touches every .html file (inline <script> blocks, HTML comments) and every
// .js file. Removes source maps. The original files in the repo stay as they are.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JavaScriptObfuscator = require('javascript-obfuscator');

const root = process.argv[2] || 'dist';
const OPTIONS = {
  compact: true,
  simplify: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,          // keep top-level names so onclick="..." in HTML still works
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: false,
  controlFlowFlattening: false,  // off: keeps big apps fast
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  sourceMap: false,
  unicodeEscapeSequence: false,
  target: 'browser',
};

function scramble(code, isModule) {
  if (!code.trim()) return code;
  return JavaScriptObfuscator.obfuscate(code, {
    ...OPTIONS,
    sourceType: isModule ? 'module' : 'script',
  }).getObfuscatedCode();
}

const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);
let files = 0, blocks = 0, failed = 0;

function processHtml(file) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, attrs, code) => {
    if (/\bsrc\s*=/i.test(attrs)) return all;
    const t = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [, ''])[1].toLowerCase();
    if (!JS_TYPES.has(t)) return all;
    try {
      const out = scramble(code, t === 'module');
      blocks++;
      return `<script${attrs}>${out.replace(/<\/script/gi, '<\\/script')}</script>`;
    } catch (e) {
      failed++;
      console.error(`  ! could not scramble a script in ${file}: ${e.message}`);
      return all;
    }
  });
  // drop HTML comments (keep IE conditionals)
  html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  html = html.replace(/\s*\/\/# sourceMappingURL=\S+/g, '');
  fs.writeFileSync(file, html);
  files++;
}

function processJs(file) {
  const code = fs.readFileSync(file, 'utf8');
  if (/\.min\.js$/.test(file) && code.length > 200000) return; // bundled vendor libs
  try {
    const isModule = /^\s*(import|export)\s/m.test(code);
    fs.writeFileSync(file, scramble(code.replace(/\/\/# sourceMappingURL=\S+/g, ''), isModule));
    files++;
  } catch (e) {
    failed++;
    console.error(`  ! could not scramble ${file}: ${e.message}`);
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (name !== 'node_modules' && name !== '.git') walk(p); continue; }
    if (name.endsWith('.map')) { fs.unlinkSync(p); continue; }
    if (name.endsWith('.html') || name.endsWith('.htm')) processHtml(p);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) processJs(p);
  }
}

walk(root);
console.log(`protect: ${files} files, ${blocks} inline scripts scrambled${failed ? `, ${failed} FAILED` : ''}`);
if (failed) process.exit(1);
