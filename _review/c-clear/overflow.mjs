#!/usr/bin/env node
/* Design C: sideways-scroll scan. Every route at 360, 390, 768, 1024 and
   1440 wide, normal and extra large text, English and Arabic. Also flags
   any element whose right or left edge sits outside the viewport (content
   that would be clipped) and any button or link under 44px tall. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..', '..', 'c-clear');
const url = (q, r) => pathToFileURL(path.join(DIR, 'index.html')).href + '?' + q + '#' + r;

const ROUTES = ['/login', '/register', '/questions', '/ack', '/chat', '/benefits', '/benefits/all', '/benefits/council',
  '/benefit/council-tax-student', '/benefit/public-libraries', '/community', '/community/ratings', '/settings',
  '/settings/answer/status', '/settings/help'];
const WIDTHS = [360, 390, 768, 1024, 1440];
const VARIANTS = ['', '&text=xlarge', '&lang=ar', '&lang=ar&text=xlarge'];

function scan(vw) {
  const out = { overflow: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0, clipped: [], small: [] };
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  const inDrawer = el => el.closest('.side') && window.matchMedia('(max-width: 959.98px)').matches;
  for (const el of document.querySelectorAll('main *, .tabbar *, .topbar *')) {
    if (!vis(el) || inDrawer(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      if (!el.closest('.sr-only') && !el.classList.contains('sr-only')) out.clipped.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ` (${Math.round(r.left)} to ${Math.round(r.right)})`);
    }
  }
  for (const el of document.querySelectorAll('main button, main a[href], .tabbar a, .topbar a, .topbar button')) {
    if (!vis(el) || el.closest('.sr-only')) continue;
    const r = el.getBoundingClientRect();
    const inline = el.closest('p, li.reply, .auth-switch, .sources, .blocked-name, .help-main') && el.tagName === 'A';
    if (r.height < 43.5 && !inline) out.small.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.height)}px`);
  }
  out.clipped = [...new Set(out.clipped)].slice(0, 6);
  out.small = [...new Set(out.small)].slice(0, 6);
  return out;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let problems = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const v of VARIANTS) {
    for (const r of ROUTES) {
      const params = (/login|register/.test(r) ? 'reset=1' : 'demo=1') + v;
      await page.goto(url(params, r), { waitUntil: 'load' });
      await page.waitForTimeout(80);
      const res = await page.evaluate(scan, w);
      if (res.overflow || res.clipped.length || res.small.length) {
        problems++;
        console.log(`${w} ${r} ${v || '(en)'}: ${res.overflow ? 'OVERFLOW ' + res.overflow + 'px; ' : ''}${res.clipped.length ? 'clipped: ' + res.clipped.join(', ') + '; ' : ''}${res.small.length ? 'small: ' + res.small.join(', ') : ''}`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} page(s) with problems` : 'no overflow, no clipping, no small targets');
