/* Small targets (<44px), small text (<16px), icon buttons without names, horizontal overflow. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const sizeArg = process.argv[2] || 'phone';
const lang = process.argv[3] || 'en';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(SIZES[sizeArg]);
const page = await ctx.newPage();
await page.goto(BASE + '?demo=1&lang=' + lang + '#/chat', { waitUntil: 'load' });
await page.waitForTimeout(300);
const routes = ['login', 'register', 'questions', 'ack', 'chat', 'benefits', 'benefits/all', 'benefit/council-tax-student', 'community', 'community/ratings', 'settings', 'settings/help', 'settings/answer/status'];
for (const r of routes) {
  await page.evaluate(h => { location.hash = h; }, '#/' + r);
  await page.waitForTimeout(200);
  const res = await page.evaluate(() => {
    const vis = el => { const s = getComputedStyle(el); const rr = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && rr.width > 0 && rr.height > 0 && !el.closest('[inert]') && !el.closest('.sr-only'); };
    const small = [];
    document.querySelectorAll('a[href], button, input, select, textarea, label[for], summary').forEach(el => {
      if (!vis(el)) return;
      if (el.matches('input[type=radio], input[type=checkbox]')) return; // covered by their label
      if (el.closest('.side-rail') && getComputedStyle(el.closest('.side-rail')).display === 'none') return;
      const rr = el.getBoundingClientRect();
      // inline text links inside a paragraph are exempt (WCAG 2.5.8 inline exception)
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
      if ((rr.height < 44 || rr.width < 44) && !inline) small.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(rr.width)}x${Math.round(rr.height)}`);
    });
    const tiny = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || !vis(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) { const k = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] + ' ' + fs.toFixed(1) + 'px'; if (!tiny.has(k)) tiny.set(k, n.textContent.trim().slice(0, 40)); }
    }
    const unnamed = [];
    document.querySelectorAll('button, a[href]').forEach(el => {
      if (!vis(el)) return;
      const name = (el.getAttribute('aria-label') || el.innerText || '').trim();
      if (!name) unnamed.push(el.outerHTML.slice(0, 120));
    });
    return { small, tiny: [...tiny.entries()].map(([k, v]) => k + ' "' + v + '"'), unnamed, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  console.log(`== ${r}  overflow=${res.overflow}`);
  if (res.small.length) console.log('  small targets:', res.small.slice(0, 12).join(' ; '));
  if (res.tiny.length) console.log('  text <16px:', res.tiny.slice(0, 12).join(' ; '));
  if (res.unnamed.length) console.log('  unnamed:', res.unnamed.join(' ; '));
}
await browser.close();
