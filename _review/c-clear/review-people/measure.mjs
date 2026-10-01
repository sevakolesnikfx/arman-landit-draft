/* Measure tap targets, text sizes, headings, unnamed controls, overflow, on every route.
   node measure.mjs phone|desktop|xl360 [lang] */
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
  xl360: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true },
};
const size = process.argv[2] || 'phone';
const lang = process.argv[3] || 'en';
const text = size === 'xl360' ? '&text=xlarge' : '';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE + '?demo=1&lang=' + lang + text + '#/chat', { waitUntil: 'load' });
await page.waitForTimeout(300);
const routes = ['chat', 'chat#reply', 'benefits', 'benefits#blocked', 'benefits/all', 'benefits/money', 'benefit/council-tax-student', 'benefit/universal-credit', 'community', 'community#replies', 'community/ratings', 'settings', 'settings/help', 'settings/answer/status', 'chat#drawer', 'questions', 'ack', 'login', 'register'];
const report = {};
for (const rr of routes) {
  const [r, extra] = rr.split('#');
  if (r === 'login' || r === 'register' || r === 'questions' || r === 'ack') {
    // still signed in: these are public routes and render anyway
  }
  await page.evaluate(h => { location.hash = h; }, '#/' + r);
  await page.waitForTimeout(250);
  if (extra === 'reply') { await page.fill('#chat-input', 'What can I claim?'); await page.click('.send-btn'); await page.waitForTimeout(300); }
  if (extra === 'blocked') { await page.click('[data-action="blocked-toggle"]'); }
  if (extra === 'replies') { await page.locator('[data-action="reply-toggle"]').first().click(); }
  if (extra === 'drawer') { if (size !== 'desktop') { await page.click('[data-action="open-drawer"]'); await page.waitForTimeout(200); } await page.locator('#sidebar .app-toggle').first().click(); }
  const res = await page.evaluate(() => {
    const vis = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !el.closest('[inert]') && !el.closest('[hidden]'); };
    const lab = el => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const small = [];
    document.querySelectorAll('a[href], button, select, textarea, input:not([type=radio]):not([type=checkbox]):not([type=hidden]), label').forEach(el => {
      if (!vis(el)) return;
      if (el.closest('.sr-only')) return;
      if (el.tagName === 'LABEL' && !el.querySelector('input[type=radio],input[type=checkbox]')) return;
      const r = el.getBoundingClientRect();
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p');
      if (inline) return;
      if (r.height < 43.5 || r.width < 43.5) small.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0,2).join('.')} "${lab(el)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    // text size
    const tiny = {};
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      if (!t || t.length < 2) continue;
      const el = n.parentElement;
      if (!el || !vis(el) || el.closest('.sr-only, svg, option, [aria-hidden=true]')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 15.95) {
        const key = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] + ' ' + fs.toFixed(1) + 'px';
        if (!tiny[key]) tiny[key] = { n: 0, ex: t.slice(0, 50) };
        tiny[key].n++;
      }
    }
    // headings
    const heads = [...document.querySelectorAll('h1,h2,h3,h4')].filter(h => !h.closest('[hidden]')).map(h => h.tagName + ':' + h.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) + (vis(h) ? '' : ' (sr)'));
    // unnamed controls
    const unnamed = [];
    document.querySelectorAll('a[href], button, select, textarea, input:not([type=hidden])').forEach(el => {
      if (!vis(el) && !el.matches('input[type=radio],input[type=checkbox]')) return;
      let name = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (!name && el.id) { const l = document.querySelector('label[for="' + el.id + '"]'); if (l) name = l.textContent.trim(); }
      if (!name && el.getAttribute('aria-labelledby')) name = el.getAttribute('aria-labelledby').split(' ').map(i => (document.getElementById(i) || {}).textContent || '').join(' ').trim();
      if (!name && el.closest('label')) name = el.closest('label').textContent.trim();
      if (!name) unnamed.push(el.outerHTML.slice(0, 120));
    });
    // overflow
    const W = document.documentElement.clientWidth;
    const over = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!vis(el) || el.closest('.sr-only')) return;
      const r = el.getBoundingClientRect();
      if (r.right > W + 1 || r.left < -1) {
        if (el.closest('.side, .scrim')) return;
        over.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    });
    const clipped = [];
    document.querySelectorAll('button, a, select, .pill, .cat-chip, .tab-label, .val-amt, .b-name, h1, h2').forEach(el => {
      if (!vis(el)) return;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') clipped.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${lab(el)}" ${el.scrollWidth}>${el.clientWidth}`);
    });
    const docH = document.documentElement.scrollHeight;
    const disc = [...document.querySelectorAll('.disclaimer, .composer-disclaimer, .ack-text')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return Math.round(r.top + window.scrollY) + 'px ' + e.className; });
    return { small: [...new Set(small)], tiny, heads, unnamed, over: [...new Set(over)].slice(0, 12), clipped: [...new Set(clipped)].slice(0, 12), docH, hscroll: document.documentElement.scrollWidth > W, disc };
  });
  report[rr] = res;
  // close drawer
  await page.keyboard.press('Escape');
}
report.errors = errs;
writeFileSync(OUT + `measure-${size}-${lang}.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) {
  if (k === 'errors') { console.log('errors', v); continue; }
  console.log('\n== ' + k + ` docH=${v.docH} hscroll=${v.hscroll}`);
  if (v.small.length) console.log('  small:', v.small.join(' | '));
  const t = Object.entries(v.tiny); if (t.length) console.log('  tiny:', t.map(([kk, vv]) => `${kk} x${vv.n} "${vv.ex}"`).join(' | '));
  if (v.unnamed.length) console.log('  unnamed:', v.unnamed.join(' | '));
  if (v.over.length) console.log('  over:', v.over.join(' | '));
  if (v.clipped.length) console.log('  clipped:', v.clipped.join(' | '));
  console.log('  heads:', v.heads.join(' / '));
  console.log('  disclaimer at:', v.disc.join(', '));
}
await browser.close();
