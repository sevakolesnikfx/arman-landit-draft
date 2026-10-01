/* Text sweep of every route of design C, demo profile, phone and desktop.
   Collects rendered text (innerText after opening collapsibles) plus
   accessible attribute text, and checks content rules. Writes
   sweep-<size>.json with per-route text and a findings list. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
import { findBanned, DASHES } from '../../../tools/content-rules.mjs';
import { loadLandit } from './load.mjs';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const L = loadLandit();
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const sizeArg = process.argv[2] || 'desktop';
const m = L.match(L.demo.profile);
const nrpfNotes = L.benefits.map(b => b.nrpfNote).filter(Boolean);
const JARGON = [/\bNRPF\b/, /means-tested/i, /composition/i, /UC-gated/i, /\bLHA\b/, /\bIHS\b/, /\bBRP\b/, /\bs3C\b/i, /contributory/i, /\bPPC\b/, /\bLISA\b/, /\bNINo\b/, /passported/i, /\bCoC\b/, /destitut/i];
const HYPE = [/\bunlock/i, /seamless/i, /game-chang/i, /revolution/i, /\bguarantee[ds]?\b/i, /\bentitled\b/i, /\byou will get\b/i, /\byou can get\b/i, /\byou qualify\b/i, /\byou are eligible\b/i, /\bowed\b/i, /\bclaim your\b/i];
const FEAR = [/\burgent\b/i, /\bwarning\b/i, /\bdanger\b/i, /\bscam/i, /\bdeport/i, /\brisk\b/i, /\bbeware\b/i];

const routes = [
  'login', 'register', 'questions', 'questions/2', 'questions/3', 'questions/4', 'questions/5', 'questions/6', 'questions/7', 'ack',
  'chat', 'benefits', 'benefits/all',
  ...Object.keys(L.categories).map(k => 'benefits/' + k),
  ...m.open.map(b => 'benefit/' + b.id), ...m.blocked.map(x => 'benefit/' + x.benefit.id),
  'community', 'community/ratings', 'community/about/council-tax-student',
  'settings', 'settings/help', ...L.questionnaire.map(q => 'settings/answer/' + q.id),
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(SIZES[sizeArg]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

async function load(url) {
  for (let i = 0; i < 3; i++) {
    try { await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => window.LC && document.getElementById('app').children.length, null, { timeout: 4000 }); return; }
    catch (e) { await page.waitForTimeout(800); }
  }
  throw new Error('could not load ' + url);
}
await load(BASE + '?demo=1#/chat');

const results = {};
const findings = [];
function add(route, kind, detail) { findings.push({ route, kind, detail }); }

async function collect(route) {
  return page.evaluate(() => {
    // open collapsibles so their text is checked too
    document.querySelectorAll('[aria-expanded="false"][aria-controls]').forEach(b => {
      if (b.closest('.side-rail') || b.matches('[data-action="rail"],[data-action="rail-apps"],[data-action="open-drawer"]')) return;
      const p = document.getElementById(b.getAttribute('aria-controls'));
      if (p && p.hidden) p.hidden = false;
    });
    const main = document.getElementById('main') || document.body;
    const attrs = [];
    document.querySelectorAll('[aria-label],[placeholder],[title],[alt],option,optgroup').forEach(el => {
      ['aria-label', 'placeholder', 'title', 'alt', 'label'].forEach(a => { const v = el.getAttribute(a); if (v) attrs.push(v); });
      if (el.tagName === 'OPTION') attrs.push(el.textContent);
    });
    return { main: main.innerText, body: document.body.innerText, all: document.body.textContent, attrs: attrs.join('\n'), title: document.title };
  });
}

for (const r of routes) {
  await page.evaluate(h => { location.hash = h; }, '#/' + r);
  await page.waitForTimeout(120);
  const route = await page.evaluate(() => document.documentElement.getAttribute('data-route'));
  if (route !== r) {
    // public routes after demo redirect? note it
    results[r] = { redirectedTo: route };
  }
  const t = await collect(r);
  results[r] = Object.assign(results[r] || {}, { text: t.body });
  const text = t.body + '\n' + t.attrs + '\n' + t.title;
  if (DASHES.test(text)) { DASHES.lastIndex = 0; add(r, 'dash', (text.match(/.{0,40}[–—].{0,40}/g) || []).join(' || ')); }
  DASHES.lastIndex = 0;
  const banned = findBanned(text);
  if (banned.length) add(r, 'banned', banned.map(b => b.term + ': ' + text.slice(Math.max(0, b.index - 40), b.index + 40).replace(/\s+/g, ' ')).join(' || '));
  for (const n of nrpfNotes) if (t.all.includes(n)) add(r, 'nrpfNote', n);
  for (const re of JARGON) { const mm = t.body.match(new RegExp('.{0,50}' + re.source + '.{0,50}', re.flags.replace('g', ''))); if (mm) add(r, 'jargon', re + ' :: ' + mm[0].replace(/\s+/g, ' ')); }
  for (const re of HYPE) { const mm = t.body.match(new RegExp('.{0,50}' + re.source + '.{0,50}', re.flags.replace('g', ''))); if (mm) add(r, 'promise/hype', re + ' :: ' + mm[0].replace(/\s+/g, ' ')); }
  for (const re of FEAR) { const mm = t.body.match(new RegExp('.{0,50}' + re.source + '.{0,50}', re.flags.replace('g', ''))); if (mm) add(r, 'fear?', re + ' :: ' + mm[0].replace(/\s+/g, ' ')); }
  const hasDisc = t.body.includes(L.disclaimer);
  results[r].disclaimer = hasDisc;
  const showsAmount = /£\s?\d/.test(t.main);
  results[r].showsAmount = showsAmount;
  if (!hasDisc) add(r, 'no-disclaimer', 'shows amount: ' + showsAmount);
  if (/\bfree\b/i.test(t.main)) {
    const fr = t.main.match(/.{0,40}\bfree\b.{0,40}/gi) || [];
    results[r].free = fr;
  }
  // total near the potential label
  if (/potential/i.test(t.body) && !t.body.includes(L.potentialLabel)) add(r, 'potential-label', 'Potential wording but not the exact label');
}

fs.writeFileSync(path.join(OUT, `sweep-${sizeArg}.json`), JSON.stringify({ findings, errors, results }, null, 1));
const summary = {};
for (const f of findings) summary[f.kind] = (summary[f.kind] || 0) + 1;
console.log(sizeArg, 'routes', routes.length, 'findings', JSON.stringify(summary), 'errors', errors.length);
const seen = new Set();
for (const f of findings) {
  const key = f.kind + f.detail;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${f.kind}] ${f.route}: ${f.detail.slice(0, 300)}`);
}
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
