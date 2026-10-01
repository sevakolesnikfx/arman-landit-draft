/* Benefits list: repeated labels, row heights, what fits in the first screen, sort behaviour. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1#/benefits/all', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.b-row')];
    const count = (sel, txt) => rows.filter(r => { const e = r.querySelector(sel); return e && (!txt || e.textContent.includes(txt)); }).length;
    const hs = rows.map(r => r.getBoundingClientRect().height);
    const vh = innerHeight;
    const firstRowTop = rows[0] ? rows[0].getBoundingClientRect().top : null;
    const fullyVisible = rows.filter(r => { const b = r.getBoundingClientRect(); return b.bottom <= vh - (document.querySelector('.tabbar') ? document.querySelector('.tabbar').getBoundingClientRect().height : 0); }).length;
    const qualifiers = {};
    rows.forEach(r => { const q = r.querySelector('.val-q, .val-text, .val-none'); const t = q ? q.textContent : '(none)'; qualifiers[t] = (qualifiers[t] || 0) + 1; });
    const effortWords = {};
    rows.forEach(r => { const q = r.querySelector('.effort-words strong'); const t = q ? q.textContent : '(none)'; effortWords[t] = (effortWords[t] || 0) + 1; });
    return {
      rows: rows.length, avgH: Math.round(hs.reduce((a, b) => a + b, 0) / hs.length), minH: Math.round(Math.min(...hs)), maxH: Math.round(Math.max(...hs)),
      firstRowTop: Math.round(firstRowTop), fullyVisible,
      withAmount: count('.val-amt'), noAmount: count('.val-none'), textOnly: count('.val-text'),
      effortNone: count('.effort-none'), effortWords, qualifiers,
      trackBtns: document.querySelectorAll('.b-row .track-btn').length, shareBtns: document.querySelectorAll('.b-row [data-action=share]').length,
      docH: document.documentElement.scrollHeight,
      tabStops: document.querySelectorAll('#rows a, #rows button').length,
    };
  });
  console.log(size, JSON.stringify(r, null, 1));
  // sorts
  for (const k of ['time', 'easy']) {
    await page.click(`[data-action=sort][data-key=${k}]`);
    await page.waitForTimeout(150);
    const top = await page.evaluate(() => [...document.querySelectorAll('.b-row')].slice(0, 6).map(r => r.querySelector('.b-name').textContent + ' | ' + (r.querySelector('.effort-words') || {}).textContent));
    console.log(size, 'sort', k, top);
  }
  await page.click('[data-action=sort][data-key=value]');
  await ctx.close();
}
await browser.close();
