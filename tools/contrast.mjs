#!/usr/bin/env node
/* Landit click dummies: colour contrast check for a design's themes.

   Usage:  node tools/contrast.mjs <folder>
           <folder> is a folder name inside landit-test or an absolute path.

   Reads <folder>/themes.js, which sets:
     window.LANDIT_THEMES = [{ id, name, dark, default?, colors: {
       bg, surface, surface2, text, textMuted, border, accent, onAccent, focus,
       cat: { <category key>: '#hex', ... } } }]

   FAILS (exit 1), WCAG 2.2 contrast ratios:
     text and textMuted on bg, surface, surface2   at least 4.5
     onAccent on accent                            at least 4.5
     accent against bg and surface                 at least 3
     focus against bg and surface                  at least 3
     every cat colour against surface and bg       at least 3
   REPORTED ONLY: border against bg.
   WARNS (user feedback: the old app was too saturated and too harsh):
     bg, surface or surface2 saturation above 30% (HSL). Near white or near
       black, HSL saturation jumps to 100% for a barely visible tint
       (#FFFDF9 is 100%), so the warning needs chroma (max minus min
       channel) of 5% or more as well. Both numbers are printed.
     text on bg above 15:1
     accent saturation above 60%
     a category key from shared/data.js missing from cat */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/contrast.mjs <folder>');
  process.exit(2);
}
const DIR = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
const FILE = path.join(DIR, 'themes.js');
if (!fs.existsSync(FILE)) {
  console.error(`No themes.js in ${DIR}`);
  process.exit(2);
}

function load(file, ctx) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
}
const ctx = { window: {}, document: undefined, console };
vm.createContext(ctx);
load(FILE, ctx);
const THEMES = ctx.window.LANDIT_THEMES;
if (!Array.isArray(THEMES) || !THEMES.length) {
  console.error('themes.js must set window.LANDIT_THEMES to a non-empty array');
  process.exit(2);
}
let CATEGORY_KEYS = [];
try {
  const dctx = { window: {} };
  vm.createContext(dctx);
  load(path.join(ROOT, 'shared', 'data.js'), dctx);
  CATEGORY_KEYS = Object.keys(dctx.window.LANDIT.categories);
} catch (e) { /* shared/data.js missing: skip the coverage check */ }

/* ---------------- colour maths ---------------- */

function parse(c) {
  if (typeof c !== 'string') return null;
  let s = c.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]) : 1 };
  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const h = +m[1] / 360, sat = +m[2] / 100, l = +m[3] / 100;
    const f = n => { const k = (n + h * 12) % 12; const a = sat * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return { r: f(0), g: f(8), b: f(4), a: m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]) : 1 };
  }
  return null;
}
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function hsl(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s: Math.round(s * 100), l: Math.round(l * 100), chroma: Math.round((max - min) * 100) };
}

/* ---------------- checks ---------------- */

const rows = [];
let fails = 0, warns = 0;
const pad = (s, n) => { s = String(s); return s.length >= n ? s + '  ' : s.padEnd(n); };

for (const t of THEMES) {
  const c = t.colors || {};
  const col = k => parse(k.startsWith('cat.') ? (c.cat || {})[k.slice(4)] : c[k]);
  const out = { theme: `${t.id} (${t.name || ''}${t.dark ? ', dark' : ''})`, lines: [] };
  const add = (status, what, value, need) => {
    out.lines.push({ status, what, value, need });
    if (status === 'FAIL') fails++;
    if (status === 'WARN') warns++;
  };
  const pair = (fg, bg, min, reportOnly) => {
    const a = col(fg), b = col(bg);
    if (!a || !b) { add('FAIL', `${fg} on ${bg}`, 'missing or unreadable colour', min ? `>= ${min}` : ''); return; }
    if (a.a < 1 || b.a < 1) add('WARN', `${fg} on ${bg}`, 'has transparency, checked as opaque', '');
    const r = ratio(a, b);
    const status = reportOnly ? 'info' : (r >= min ? 'ok' : 'FAIL');
    add(status, `${fg} on ${bg}`, r.toFixed(2) + ':1', reportOnly ? '' : `>= ${min}`);
    return r;
  };

  for (const fg of ['text', 'textMuted']) for (const bg of ['bg', 'surface', 'surface2']) pair(fg, bg, 4.5);
  pair('onAccent', 'accent', 4.5);
  for (const bg of ['bg', 'surface']) pair('accent', bg, 3);
  for (const bg of ['bg', 'surface']) pair('focus', bg, 3);
  const cats = Object.keys(c.cat || {});
  for (const k of cats) for (const bg of ['surface', 'bg']) pair('cat.' + k, bg, 3);
  pair('border', 'bg', 0, true);

  // feedback: calm, not harsh
  for (const k of ['bg', 'surface', 'surface2']) {
    const x = col(k);
    if (!x) continue;
    const h = hsl(x);
    add(h.s > 30 && h.chroma >= 5 ? 'WARN' : 'ok', `${k} saturation`, `${h.s}% (chroma ${h.chroma}%)`, '<= 30%');
  }
  const tb = col('text') && col('bg') ? ratio(col('text'), col('bg')) : null;
  if (tb !== null) add(tb > 15 ? 'WARN' : 'ok', 'text on bg not too harsh', tb.toFixed(2) + ':1', '<= 15');
  if (col('accent')) { const h = hsl(col('accent')); add(h.s > 60 ? 'WARN' : 'ok', 'accent saturation', `${h.s}% (chroma ${h.chroma}%)`, '<= 60%'); }
  const missing = CATEGORY_KEYS.filter(k => !cats.includes(k));
  if (missing.length) add('WARN', 'category colours missing', missing.join(', '), 'all keys');

  rows.push(out);
}

const shown = path.relative(ROOT, FILE).startsWith('..') ? FILE : path.relative(ROOT, FILE);
console.log(`contrast: ${shown}  (${THEMES.length} theme${THEMES.length === 1 ? '' : 's'})`);
for (const r of rows) {
  console.log(`\n${r.theme}`);
  console.log('  ' + pad('', 6) + pad('check', 34) + pad('value', 22) + 'needs');
  console.log('  ' + '-'.repeat(72));
  for (const l of r.lines) console.log('  ' + pad(l.status, 6) + pad(l.what, 34) + pad(l.value, 22) + l.need);
}
console.log(`\n${fails} failure(s), ${warns} warning(s)`);
process.exit(fails ? 1 : 0);
