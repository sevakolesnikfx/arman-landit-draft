/* How much of a keyboard-focused control is hidden under the fixed tab bar or the sticky composer. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const SIZES = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, desktop: { viewport: { width: 1440, height: 900 } } };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1#/benefits/all', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  for (const [hash, prep] of [['#/benefits/all', null], ['#/chat', 'reply'], ['#/settings', null]]) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(300);
    if (prep === 'reply') { await page.fill('#chat-input', 'What can I claim?'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.evaluate(() => document.querySelector('#chat-h') && document.querySelector('#chat-h').focus()); await page.evaluate(() => scrollTo(0, 0)); }
    let worst = null;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(25);
      const v = await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        let coverTop = innerHeight;
        const tb = document.querySelector('.tabbar'); if (tb && getComputedStyle(tb).display !== 'none') coverTop = Math.min(coverTop, tb.getBoundingClientRect().top);
        const cp = document.querySelector('.chat > .composer-wrap .composer'); if (cp && !el.closest('.composer')) { const cr = cp.getBoundingClientRect(); if (cr.height) coverTop = Math.min(coverTop, cr.top); }
        if (el.closest('.tabbar') || el.closest('.side') || el.closest('.topbar')) return null;
        const hidden = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, coverTop));
        return { name: (el.innerText || el.getAttribute('aria-label') || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 30), pct: Math.round(hidden / r.height * 100), top: Math.round(r.top), bottom: Math.round(r.bottom), coverTop: Math.round(coverTop) };
      });
      if (v && (!worst || v.pct > worst.pct)) worst = v;
      if (v && v.pct >= 99) { await page.screenshot({ path: OUT + `obscured-${size}-${hash.replace(/[#/]/g, '')}.png` }); break; }
    }
    console.log(size, hash, JSON.stringify(worst));
  }
  await ctx.close();
}
await browser.close();
