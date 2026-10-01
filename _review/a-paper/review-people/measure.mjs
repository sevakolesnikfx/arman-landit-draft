/* People-lens review: measure tap targets and text sizes on every route. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1440, height: 900 } };
async function go(p, url) {
  for (let i = 0; i < 3; i++) {
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(400); if (await p.locator('#root *').count()) return; } catch (e) {}
    await p.waitForTimeout(800);
  }
}
const routes = ['?reset=1#/login', '?reset=1#/register', '?reset=1#/questions', '?reset=1#/ack', '?demo=1#/chat', '?demo=1#/benefits', '?demo=1#/benefit/council-tax-student-exemption', '?demo=1#/community', '?demo=1#/community/ratings', '?demo=1#/settings'];
const report = {};
for (const [dname, dev] of [['phone', PHONE], ['desk', DESK]]) {
  for (const r of routes) {
    const c = await browser.newContext(dev);
    const p = await c.newPage();
    await go(p, INDEX + r);
    if (r.includes('benefit/')) {
      // open chat cards? no. expand blocked
      await p.evaluate(() => { const d = document.getElementById('blocked'); if (d) d.open = true; });
    }
    if (r.includes('#/community') && !r.includes('ratings')) {
      await p.evaluate(() => { const b = document.querySelector('[data-act="comments"]'); if (b) b.click(); });
      await p.waitForTimeout(200);
    }
    const res = await p.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden]') && !el.closest('.sr-only'); };
      const label = el => (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const small = [];
      const sel = 'a[href], button, input, select, textarea, summary, [role="button"], label.opt, label.check';
      document.querySelectorAll(sel).forEach(el => {
        if (!vis(el)) return;
        if (el.matches('input[type="radio"], input[type="checkbox"]')) {
          // measure the label instead
          const l = el.closest('label');
          if (!l) { const r = el.getBoundingClientRect(); if (r.width < 44 || r.height < 44) small.push({ t: 'input-nolabel', w: Math.round(r.width), h: Math.round(r.height), label: el.name }); }
          return;
        }
        if (el.classList.contains('skip-link')) return;
        const r = el.getBoundingClientRect();
        // inline links inside text are exempt (WCAG 2.5.8 inline exception)
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.parentElement && /^(P|SPAN|LI|DD)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 3;
        if ((r.width < 44 || r.height < 44)) small.push({ t: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''), w: Math.round(r.width), h: Math.round(r.height), label: label(el), inline });
      });
      const texts = [];
      const seen = new Set();
      document.querySelectorAll('p, li, dd, dt, label, span, a, button, summary, h1, h2, h3, small, blockquote, td, legend').forEach(el => {
        if (!vis(el)) return;
        // only elements with own text
        const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (own.length < 2) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) {
          const key = el.tagName + '.' + (typeof el.className === 'string' ? el.className : '') + '|' + fs;
          if (seen.has(key)) return; seen.add(key);
          texts.push({ fs, el: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''), text: own.slice(0, 70) });
        }
      });
      const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
      return { small, texts, overflowX, sw: document.documentElement.scrollWidth };
    });
    report[dname + ' ' + r] = res;
    await c.close();
  }
}
fs.writeFileSync(path.join(HERE, 'measure.json'), JSON.stringify(report, null, 1));
for (const k of Object.keys(report)) {
  const r = report[k];
  console.log('\n== ' + k + ' overflowX=' + r.overflowX + ' sw=' + r.sw);
  const nonInline = r.small.filter(s => !s.inline);
  console.log(' small targets (' + nonInline.length + '):');
  const uniq = {};
  nonInline.forEach(s => { const key = s.t + ' ' + s.w + 'x' + s.h; if (!uniq[key]) uniq[key] = s; });
  Object.values(uniq).forEach(s => console.log('   ' + s.w + 'x' + s.h + ' ' + s.t + ' "' + s.label + '"'));
  console.log(' text <16px:');
  r.texts.forEach(t => console.log('   ' + t.fs + 'px ' + t.el + ' "' + t.text + '"'));
}
await browser.close();
