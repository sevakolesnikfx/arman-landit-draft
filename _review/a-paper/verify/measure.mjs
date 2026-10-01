#!/usr/bin/env node
/* Design A: text sizes and tap targets on every route, phone and desktop.
   Reports visible text under 16px (except short labels and counts listed
   in META, which may be 14 or 15px) and controls under 44px.
   Usage: node _review/a-paper/verify/measure.mjs */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const INDEX = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/a-paper/index.html').href;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const ROUTES = ['reset=1#/login', 'reset=1#/register', 'demo=1#/questions', 'demo=1#/ack', 'demo=1#/chat', 'demo=1#/benefits',
  'demo=1#/benefit/council-tax-student', 'demo=1#/benefit/universal-credit', 'demo=1#/community', 'demo=1#/community/ratings', 'demo=1#/settings'];
/* Short labels and counts allowed at 14 or 15px. */
const META = ['eyebrow', 'cat-label', 'fchip-n', 'group-n', 'bl-cat', 'c-when', 'post-when', 'g-label', 'rscale-h', 'sb-h', 'doc-group', 'menu-hint', 'fit-tag', 'tag-quiet', 'free-label', 'dl', 'avatar'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let problems = 0;
for (const size of Object.keys(SIZES)) {
  for (const r of ROUTES) {
    const ctx = await browser.newContext(SIZES[size]);
    const page = await ctx.newPage();
    await page.goto(INDEX + '?' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    /* open what is folded so it is measured too */
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    const res = await page.evaluate((META) => {
      const vis = el => { const st = getComputedStyle(el); const b = el.getBoundingClientRect(); return st.display !== 'none' && st.visibility !== 'hidden' && b.width > 0 && b.height > 0 && !el.closest('.sr-only'); };
      const small = [], tiny = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        const t = walker.currentNode; if (!t.textContent.trim()) continue;
        const el = t.parentElement; if (!el || seen.has(el) || !vis(el)) continue; seen.add(el);
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const meta = META.some(c => el.closest('.' + c));
        if (fs < 14 || (fs < 16 && !meta)) small.push(Math.round(fs) + 'px ' + (el.className || el.tagName) + ': ' + t.textContent.trim().slice(0, 40));
      }
      document.querySelectorAll('button, a[href], input, select, textarea, summary, label.opt, label.check').forEach(el => {
        if (!vis(el)) return;
        if (el.matches('input[type=radio], input[type=checkbox]') ) return; /* their label is the target */
        const b = el.getBoundingClientRect();
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li') && !el.closest('nav');
        if (inline) return;
        if (el.classList.contains('stretch')) return; /* covers the whole card through ::after */
        if (el.closest('.sb') && getComputedStyle(document.querySelector('.sb')).visibility === 'hidden') return;
        if (b.height < 43.5 || b.width < 43.5) tiny.push(Math.round(b.width) + 'x' + Math.round(b.height) + ' ' + el.tagName + '.' + (el.className || '') + ' "' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30) + '"');
      });
      return { small: [...new Set(small)], tiny: [...new Set(tiny)] };
    }, META);
    if (res.small.length || res.tiny.length) {
      console.log(`\n${size} ${r}`);
      res.small.forEach(s => console.log('  text  ' + s));
      res.tiny.forEach(s => console.log('  target ' + s));
      problems += res.small.length + res.tiny.length;
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${problems} item(s) to look at`);
