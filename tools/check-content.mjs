#!/usr/bin/env node
/* Landit click dummies: content checker.

   Usage:  node tools/check-content.mjs <folder>
           <folder> is a folder name inside landit-test (a-paper, shared,
           tools) or an absolute path.

   Scans .html .js .css .md .mjs files (skips _review, source, node_modules).

   ERRORS (exit 1):
     - en dash or em dash characters, or their HTML entities, or their \u
       escapes outside the tools folder
     - banned whole words and phrases (tools/content-rules.mjs), except the
       official qualification names "Level 3" and "A-level"
     - the disclaimer's first sentence typed out anywhere except
       tools/build-data.mjs and shared/data.js (pages must use LANDIT.disclaimer)
   WARNINGS:
     - a pound sign followed by a digit inside a design folder (amounts must
       come from the data)
     - the words upload, scan, scanning (not checked in the generated   (check-content: allow-line)
       shared/data.js, where official application steps use them)

   A line containing "check-content: allow-line" skips the word checks, but
   only inside the tools folder. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { findBanned, findWarnWords, DASHES } from './content-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/check-content.mjs <folder>');
  process.exit(2);
}
const DIR = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
if (!fs.existsSync(DIR)) {
  console.error(`No such folder: ${DIR}`);
  process.exit(2);
}

const EXT = new Set(['.html', '.js', '.css', '.md', '.mjs']);
const SKIP_DIRS = new Set(['_review', 'source', 'node_modules']);
const MARKER = 'check-content: allow-line';
const DISCLAIMER_OK = [path.join(ROOT, 'tools', 'build-data.mjs'), path.join(ROOT, 'shared', 'data.js')];
const DATA_JS = path.join(ROOT, 'shared', 'data.js');
const TOOLS_DIR = path.join(ROOT, 'tools');

/* The disclaimer comes from the generated data, so this file never types it. */
function disclaimerFirstSentence() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DATA_JS, 'utf8'), ctx);
  const d = ctx.window.LANDIT && ctx.window.LANDIT.disclaimer;
  if (!d) throw new Error('shared/data.js has no LANDIT.disclaimer. Run node tools/build-data.mjs first.');
  return d.split(/(?<=\.)\s+/)[0];
}
const firstSentence = disclaimerFirstSentence();
const disclaimerRe = new RegExp(firstSentence.split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'), 'gi');

const DASH_ENTITIES = /&(?:mdash|ndash);|&#(?:8211|8212);|&#x(?:2013|2014);/gi;
const DASH_ESCAPES = /\\u(?:2013|2014)|\\u\{(?:2013|2014)\}/gi;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), out);
    } else if (EXT.has(path.extname(e.name))) out.push(path.join(dir, e.name));
  }
  return out;
}

const errors = [];
const warnings = [];
const rel = f => path.relative(ROOT, f) || f;
const excerpt = (line, idx) => {
  const start = Math.max(0, idx - 40);
  return (start > 0 ? '...' : '') + line.slice(start, idx + 50).trim() + (idx + 50 < line.length ? '...' : '');
};

const files = walk(DIR);
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const inTools = file.startsWith(TOOLS_DIR + path.sep);
  const isData = file === DATA_JS;
  const designFolder = !file.startsWith(path.join(ROOT, 'shared') + path.sep) && !inTools;

  lines.forEach((line, i) => {
    const at = `${rel(file)}:${i + 1}`;
    for (const m of line.matchAll(DASHES)) errors.push({ at, what: 'dash character', text: excerpt(line, m.index) });
    for (const m of line.matchAll(DASH_ENTITIES)) errors.push({ at, what: `dash entity ${m[0]}`, text: excerpt(line, m.index) });
    if (!inTools) for (const m of line.matchAll(DASH_ESCAPES)) errors.push({ at, what: `dash escape ${m[0]}`, text: excerpt(line, m.index) });

    const allowed = inTools && line.includes(MARKER);
    if (!allowed) {
      for (const h of findBanned(line)) errors.push({ at, what: `banned "${h.term}"`, text: excerpt(line, h.index) });
      if (!isData) for (const h of findWarnWords(line)) warnings.push({ at, what: `word "${h.term}"`, text: excerpt(line, h.index) });
    }
    if (designFolder) for (const m of line.matchAll(/£\s?\d/g)) warnings.push({ at, what: 'pound amount typed in a design', text: excerpt(line, m.index) });
  });

  if (!DISCLAIMER_OK.includes(file)) {
    for (const m of text.matchAll(disclaimerRe)) {
      const lineNo = text.slice(0, m.index).split('\n').length;
      errors.push({ at: `${rel(file)}:${lineNo}`, what: 'disclaimer typed out (use LANDIT.disclaimer)', text: m[0].replace(/\s+/g, ' ') });
    }
  }
}

const print = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length})`);
  for (const x of list) console.log(`  ${x.at}  ${x.what}\n      ${x.text}`);
};
console.log(`check-content: ${rel(DIR)}  (${files.length} files)`);
print('ERRORS', errors);
print('WARNINGS', warnings);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
