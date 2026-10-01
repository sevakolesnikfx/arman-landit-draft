#!/usr/bin/env node
/* Design B (Dusk): screen-sized shots for close inspection after the review
   fixes (phone screens one at a time, Extra large text at 360px, Urdu and
   Arabic right to left, the four themes) plus a few layout measurements.
   Usage: node _review/b-dusk/look.mjs   Output: _review/b-dusk/look/ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.resolve(HERE, '../../b-dusk/index.html')).href;
const OUT = path.join(HERE, 'look');
fs.mkdirSync(OUT, { recursive: true });

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
const SMALL = { viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
let problems = 0;

async function open(ctxOpts, query, hash) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(PAGE + query + hash, { waitUntil: 'networkidle' });
  await page.waitForFunction(h => window.DUSK && window.DUSK.lastHash === h, hash);
  await page.waitForTimeout(150);
  return { ctx, page, errs };
}

/* Anything wider than the screen, or text smaller than 16px in running text. */
async function measure(page, name) {
  const r = await page.evaluate(() => {
    const vw = innerWidth;
    const wide = [...document.querySelectorAll('body *')].filter(e => {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return false;
      if (e.closest('.sr-only, .bars, [inert], .sidebar')) return false;
      return b.right > vw + 1 || b.left < -1;
    }).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')).slice(0, 6);
    const small = [...document.querySelectorAll('p, li, dd, label, .qual, .disclaimer, .composer-note')].filter(e => {
      if (!e.offsetParent || e.closest('.sr-only, [inert]')) return false;
      if (!e.textContent.trim()) return false;
      return parseFloat(getComputedStyle(e).fontSize) < 15.9;
    }).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' ' + getComputedStyle(e).fontSize).slice(0, 6);
    return { scrollW: document.documentElement.scrollWidth, vw, wide, small };
  });
  const bad = r.scrollW > r.vw + 1 || r.wide.length || r.small.length;
  if (bad) problems++;
  report.push(`${bad ? 'CHECK' : 'ok   '} ${name}: scrollWidth ${r.scrollW}/${r.vw}` + (r.wide.length ? ' wide: ' + r.wide.join(', ') : '') + (r.small.length ? ' small: ' + r.small.join(', ') : ''));
}

async function screens(page, name, n) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let i = 0; i < n && i * vh < h; i++) {
    await page.evaluate(y => window.scrollTo(0, y), i * vh);
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(OUT, `${name}-${i + 1}.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function shootPanel(page, name, n) {
  /* Detail on phones scrolls inside #bp-scroll */
  for (let i = 0; i < n; i++) {
    const done = await page.evaluate(i => { const s = document.getElementById('bp-scroll'); if (!s) return true; s.scrollTop = i * (s.clientHeight - 80); return i > 0 && s.scrollTop + s.clientHeight >= s.scrollHeight - 2 && i * (s.clientHeight - 80) > s.scrollHeight; }, i);
    if (done) break;
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(OUT, `${name}-${i + 1}.png`) });
  }
}

const jobs = [
  ['phone-benefits', PHONE, '?demo=1', '#/benefits', async p => { await measure(p, 'phone benefits'); await screens(p, 'phone-benefits', 4); }],
  ['phone-benefits-blocked', PHONE, '?demo=1', '#/benefits', async p => { await p.click('[data-action="show-blocked"]'); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, 'phone-benefits-blocked.png') }); }],
  ['phone-detail', PHONE, '?demo=1', '#/benefit/council-tax-student', async p => { await measure(p, 'phone detail'); await shootPanel(p, 'phone-detail', 4); }],
  ['phone-detail-blocked', PHONE, '?demo=1', '#/benefit/universal-credit', async p => { await shootPanel(p, 'phone-detail-blocked', 2); }],
  ['phone-chat', PHONE, '?demo=1', '#/chat', async p => { await measure(p, 'phone chat'); await p.screenshot({ path: path.join(OUT, 'phone-chat.png') }); }],
  ['phone-chat-blocked', PHONE, '?demo=1', '#/chat', async p => {
    await p.fill('#chat-input', 'Council tax as a student'); await p.press('#chat-input', 'Enter');
    await p.waitForFunction(() => document.querySelector('.bcard.is-blocked')); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, 'phone-chat-blocked.png') });
  }],
  ['phone-drawer', PHONE, '?demo=1', '#/chat', async p => {
    await p.click('#menu-btn'); await p.waitForTimeout(400);
    await p.click('#trk-btn-council-tax-student'); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, 'phone-drawer.png') });
    await p.evaluate(() => { document.getElementById('sidebar').scrollTop = 9999; }); await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(OUT, 'phone-drawer-2.png') });
  }],
  ['phone-community', PHONE, '?demo=1', '#/community', async p => { await measure(p, 'phone community'); await screens(p, 'phone-community', 2); }],
  ['phone-settings', PHONE, '?demo=1', '#/settings', async p => { await measure(p, 'phone settings'); await screens(p, 'phone-settings', 6); }],
  ['xl360-benefits', { ...SMALL }, '?demo=1&text=xlarge', '#/benefits', async p => {
    await measure(p, 'xl360 benefits'); await screens(p, 'xl360-benefits', 3);
    await p.click('[data-action="show-blocked"]'); await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, 'xl360-benefits-blocked.png') });
    const t = await p.evaluate(() => { const e = document.querySelector('#blocked-toggle .disclosure-text'); return e.getBoundingClientRect().width; });
    report.push(`${t > 120 ? 'ok   ' : 'CHECK'} xl360 blocked toggle label width ${Math.round(t)}px`); if (t <= 120) problems++;
    const overlap = await p.evaluate(() => [...document.querySelectorAll('.brow')].filter(r => {
      const n = r.querySelector('.row-link').getBoundingClientRect(), b = r.querySelector('.brow-track button').getBoundingClientRect();
      return n.right > b.left + 1 && n.bottom > b.top && n.top < b.bottom;
    }).map(r => r.dataset.bid));
    report.push(`${overlap.length ? 'CHECK' : 'ok   '} xl360 row names clear of Track: ${overlap.join(', ') || 'none overlap'}`); if (overlap.length) problems++;
  }],
  ['xl360-detail', { ...SMALL }, '?demo=1&text=xlarge', '#/benefit/uni-hardship-fund', async p => { await measure(p, 'xl360 detail'); await shootPanel(p, 'xl360-detail', 3); }],
  ['xl360-drawer', { ...SMALL }, '?demo=1&text=xlarge', '#/chat', async p => { await p.click('#menu-btn'); await p.waitForTimeout(400); await p.screenshot({ path: path.join(OUT, 'xl360-drawer.png') }); }],
  ['xl360-settings', { ...SMALL }, '?demo=1&text=xlarge', '#/settings', async p => { await measure(p, 'xl360 settings'); await p.screenshot({ path: path.join(OUT, 'xl360-settings.png') }); }],
  ['xl360-chat', { ...SMALL }, '?demo=1&text=xlarge', '#/chat', async p => { await measure(p, 'xl360 chat'); await p.screenshot({ path: path.join(OUT, 'xl360-chat.png') }); }],
  ['ur-detail', PHONE, '?demo=1&lang=ur&text=xlarge', '#/benefit/council-tax-student', async p => { await measure(p, 'ur xlarge detail'); await shootPanel(p, 'ur-xl-detail', 1); }],
  ['ar-benefits', PHONE, '?demo=1&lang=ar', '#/benefits', async p => { await measure(p, 'ar benefits'); await screens(p, 'ar-benefits', 2); }],
  ['ar-desktop-benefit', DESK, '?demo=1&lang=ar', '#/benefit/railcard-16-25', async p => { await measure(p, 'ar desktop detail'); await p.screenshot({ path: path.join(OUT, 'ar-desktop-benefit.png') }); }],
  ['desk-detail', DESK, '?demo=1', '#/benefit/council-tax-student', async p => { await measure(p, 'desktop detail'); await p.screenshot({ path: path.join(OUT, 'desk-detail.png') }); }],
  ['desk-detail-blocked', DESK, '?demo=1', '#/benefit/universal-credit', async p => { await p.screenshot({ path: path.join(OUT, 'desk-detail-blocked.png') }); }],
  ['desk-chat', DESK, '?demo=1', '#/chat', async p => { await measure(p, 'desktop chat'); await p.screenshot({ path: path.join(OUT, 'desk-chat.png') }); }],
  ['desk-community', DESK, '?demo=1', '#/community', async p => { await measure(p, 'desktop community'); await p.screenshot({ path: path.join(OUT, 'desk-community.png') }); }],
  ['desk-settings', DESK, '?demo=1', '#/settings', async p => { await measure(p, 'desktop settings'); await p.screenshot({ path: path.join(OUT, 'desk-settings.png') }); }],
  ['desk-collapsed', DESK, '?demo=1', '#/benefits', async p => { await p.click('#collapse-btn'); await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, 'desk-collapsed.png') }); await p.click('#collapse-btn'); }],
];
for (const theme of ['slate', 'daylight', 'sand']) {
  jobs.push(['theme-' + theme, PHONE, '?demo=1&theme=' + theme, '#/benefit/council-tax-student', async p => { await p.screenshot({ path: path.join(OUT, `theme-${theme}-detail.png`) }); }]);
}

for (const [name, opts, q, h, fn] of jobs) {
  const { ctx, page, errs } = await open(opts, q, h);
  try { await fn(page); } catch (e) { problems++; report.push('FAIL  ' + name + ': ' + e.message.split('\n')[0]); }
  if (errs.length) { problems++; report.push('ERROR ' + name + ': ' + errs.join(' | ')); }
  await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
console.log(problems ? `\n${problems} thing(s) to check` : '\nall clear');
