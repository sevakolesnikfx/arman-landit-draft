#!/usr/bin/env node
/* Landit click dummies: screenshots and page checks for one design.

   Usage:  node tools/shoot.mjs <folder> [--out <dir>]
           <folder> is a folder name inside landit-test (a-paper) or an
           absolute path. Output goes to landit-test/_review/<folder name>/
           unless --out is given.

   Drives the installed Google Chrome through the Playwright copy in the
   Landit repo. Each shot gets a fresh browser context (clean storage).

   Routes (hash routing, file:// URLs):
     #/login, #/register                        with ?reset=1
     #/questions, #/ack, #/chat, #/benefits,
     #/benefit/<LANDIT.demo.sampleBenefitId>,
     #/community, #/settings                    with ?demo=1
   Sizes: phone 390x844 (mobile, touch, 2x) and desktop 1440x900.
   Extra shots: chat and benefits with lang=ar (both sizes); chat and
   benefits for every non-default theme in themes.js (desktop); benefits
   with text=xlarge (phone); phone chat with the sidebar drawer open.

   Checks per page: console errors, page errors, failed requests (Google
   Fonts ignored), horizontal overflow (scrollWidth wider than innerWidth
   or the configured viewport width), buttons and links with no
   accessible name, images with no alt, LANDIT.disclaimer shown on the
   ack, chat, benefits, benefit and community routes, html dir="rtl" for
   lang=ar. Writes shoot-report.json and shoot-report.txt. Exit 1 on errors. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json'); // check-content: allow-line (a local path, not user-facing)
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const folderArg = args.find(a => !a.startsWith('--'));
if (!folderArg) {
  console.error('Usage: node tools/shoot.mjs <folder> [--out <dir>]');
  process.exit(2);
}
const DIR = path.isAbsolute(folderArg) ? folderArg : path.join(ROOT, folderArg);
const NAME = path.basename(DIR);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(ROOT, '_review', NAME);
const SHOTS = path.join(OUT, 'shots');
if (!fs.existsSync(path.join(DIR, 'index.html'))) {
  console.error(`No index.html in ${DIR}`);
  process.exit(2);
}
fs.mkdirSync(SHOTS, { recursive: true });

/* Demo benefit id and the themes, read the same way the page reads them. */
const sandbox = { window: {}, console, Intl };
vm.createContext(sandbox);
for (const f of ['data.js', 'match.js', 'content.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', f), 'utf8'), sandbox, { filename: f });
}
const SAMPLE = sandbox.window.LANDIT.demo.sampleBenefitId;
let THEMES = [];
const themesFile = path.join(DIR, 'themes.js');
if (fs.existsSync(themesFile)) {
  const tctx = { window: {}, console };
  vm.createContext(tctx);
  vm.runInContext(fs.readFileSync(themesFile, 'utf8'), tctx, { filename: 'themes.js' });
  THEMES = tctx.window.LANDIT_THEMES || [];
}
const defaultTheme = THEMES.find(t => t.default) || THEMES[0];
const otherThemes = THEMES.filter(t => t !== defaultTheme);

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const ROUTES = [
  { slug: 'login', route: '/login', params: 'reset=1' },
  { slug: 'register', route: '/register', params: 'reset=1' },
  { slug: 'questions', route: '/questions', params: 'demo=1' },
  { slug: 'ack', route: '/ack', params: 'demo=1', disclaimer: true },
  { slug: 'chat', route: '/chat', params: 'demo=1', disclaimer: true },
  { slug: 'benefits', route: '/benefits', params: 'demo=1', disclaimer: true },
  { slug: 'benefit', route: '/benefit/' + SAMPLE, params: 'demo=1', disclaimer: true },
  { slug: 'community', route: '/community', params: 'demo=1', disclaimer: true },
  { slug: 'settings', route: '/settings', params: 'demo=1' },
];

const shots = [];
for (const r of ROUTES) for (const size of ['phone', 'desktop']) shots.push({ ...r, size });
for (const base of ['chat', 'benefits']) {
  const r = ROUTES.find(x => x.slug === base);
  for (const size of ['phone', 'desktop']) shots.push({ ...r, slug: `${base}-ar`, params: r.params + '&lang=ar', size, rtl: true });
  for (const t of otherThemes) shots.push({ ...r, slug: `${base}-theme-${t.id}`, params: r.params + '&theme=' + encodeURIComponent(t.id), size: 'desktop' });
}
{
  const r = ROUTES.find(x => x.slug === 'benefits');
  shots.push({ ...r, slug: 'benefits-xlarge', params: r.params + '&text=xlarge', size: 'phone' });
  const c = ROUTES.find(x => x.slug === 'chat');
  shots.push({ ...c, slug: 'chat-drawer', size: 'phone', drawer: true });
}

const pageUrl = s => pathToFileURL(path.join(DIR, 'index.html')).href + '?' + s.params + '#' + s.route;
const IGNORE_FAIL = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

/* Runs inside the page. vw is the configured viewport width: on phone
   emulation Chrome widens innerWidth to fit wide content, so both are used. */
function inspect(vw) {
  const visible = el => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return (r.width > 0 || r.height > 0) && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const nameOf = el => {
    const label = el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map(id => { const n = document.getElementById(id); return n ? n.textContent : ''; }).join(' ').trim();
      if (t) return t;
    }
    const text = (el.innerText || el.textContent || '').trim();
    if (text) return text;
    if (el.value && /^(button|submit|reset)$/i.test(el.type || '')) return el.value;
    const img = el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    const svgT = el.querySelector('svg title');
    if (svgT && svgT.textContent.trim()) return svgT.textContent.trim();
    const svgL = el.querySelector('svg[aria-label]');
    if (svgL) return svgL.getAttribute('aria-label');
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    return '';
  };
  const se = document.scrollingElement || document.documentElement;
  const controls = [...document.querySelectorAll('button, a[href], [role="button"], [role="link"], input[type="button"], input[type="submit"]')];
  const unnamed = controls.filter(visible).filter(el => !nameOf(el)).map(el => el.outerHTML.replace(/\s+/g, ' ').slice(0, 140));
  const imgNoAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).map(i => (i.getAttribute('src') || '').slice(-80));
  const text = (document.body ? document.body.innerText : '').replace(/\s+/g, ' ');
  const disc = window.LANDIT && window.LANDIT.disclaimer ? window.LANDIT.disclaimer.replace(/\s+/g, ' ') : null;
  return {
    title: document.title,
    overflow: se.scrollWidth > Math.min(window.innerWidth, vw) + 1 ? { scrollWidth: se.scrollWidth, innerWidth: window.innerWidth, viewport: vw } : null,
    unnamed,
    imgNoAlt,
    hasDisclaimer: disc ? text.includes(disc) : false,
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
  };
}

function openDrawer() {
  const re = /menu|sidebar|navigation|applications/i;
  const btn = [...document.querySelectorAll('button, [role="button"]')].find(b => {
    const r = b.getBoundingClientRect();
    return re.test(b.getAttribute('aria-label') || '') && r.width > 0 && r.height > 0;
  });
  if (!btn) return null;
  btn.click();
  return btn.getAttribute('aria-label');
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const s of shots) {
  const context = await browser.newContext(SIZES[s.size]);
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  page.on('requestfailed', r => { if (!IGNORE_FAIL.test(r.url())) failedRequests.push(`${r.url()} (${r.failure() && r.failure().errorText})`); });
  const url = pageUrl(s);
  const file = path.join(SHOTS, `${s.slug}-${s.size}.png`);
  const res = { name: `${s.slug}-${s.size}`, url, file: path.relative(OUT, file), errors: [], consoleErrors, pageErrors, failedRequests };
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(400);
    if (s.drawer) {
      const label = await page.evaluate(openDrawer);
      if (!label) res.errors.push('no button with an aria-label matching menu, sidebar, navigation or applications');
      else res.drawerButton = label;
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
    }
    Object.assign(res, await page.evaluate(inspect, SIZES[s.size].viewport.width));
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    res.errors.push('could not load or capture: ' + e.message.split('\n')[0]);
  }
  if (consoleErrors.length) res.errors.push(`${consoleErrors.length} console error(s)`);
  if (pageErrors.length) res.errors.push(`${pageErrors.length} page error(s)`);
  if (failedRequests.length) res.errors.push(`${failedRequests.length} failed request(s)`);
  if (res.overflow) res.errors.push(`horizontal overflow: page is ${res.overflow.scrollWidth}px wide, viewport ${res.overflow.viewport}px`);
  if (res.unnamed && res.unnamed.length) res.errors.push(`${res.unnamed.length} button(s) or link(s) with no accessible name`);
  if (res.imgNoAlt && res.imgNoAlt.length) res.errors.push(`${res.imgNoAlt.length} image(s) with no alt`);
  if (s.disclaimer && res.hasDisclaimer === false) res.errors.push('disclaimer (LANDIT.disclaimer) not shown');
  if (s.rtl && res.dir !== 'rtl') res.errors.push(`html dir is "${res.dir}", expected "rtl"`);
  results.push(res);
  await context.close();
}
await browser.close();

const failed = results.filter(r => r.errors.length);
const report = {
  folder: DIR,
  when: new Date().toISOString(),
  sampleBenefitId: SAMPLE,
  themes: THEMES.map(t => t.id),
  total: results.length,
  withErrors: failed.length,
  pages: results,
};
fs.writeFileSync(path.join(OUT, 'shoot-report.json'), JSON.stringify(report, null, 2));
const lines = [`shoot: ${NAME}  ${results.length} shots, ${failed.length} with errors  (${report.when})`, `shots: ${path.relative(ROOT, SHOTS) || SHOTS}`, ''];
for (const r of results) {
  lines.push(`${r.errors.length ? 'ERR' : 'ok '}  ${r.name}${r.errors.length ? ': ' + r.errors.join('; ') : ''}`);
  for (const m of r.consoleErrors) lines.push(`       console: ${m.slice(0, 200)}`);
  for (const m of r.pageErrors) lines.push(`       page: ${m.slice(0, 200)}`);
  for (const m of r.failedRequests) lines.push(`       request: ${m.slice(0, 200)}`);
  for (const m of r.unnamed || []) lines.push(`       unnamed: ${m}`);
}
fs.writeFileSync(path.join(OUT, 'shoot-report.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(failed.length ? 1 : 0);
