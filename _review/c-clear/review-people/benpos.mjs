import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, opts] of [['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1#/benefits', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const t = s => [...document.querySelectorAll(s)].map(e => Math.round(e.getBoundingClientRect().top));
    const tb = document.querySelector('.tabbar'); const bottom = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().top : innerHeight;
    return { visibleBottom: Math.round(bottom), headTop: t('.ben-head')[0], headBottom: Math.round(document.querySelector('.ben-head').getBoundingClientRect().bottom), tiles: t('.tile').slice(0, 5), tilesFullyVisible: [...document.querySelectorAll('.tile')].filter(e => e.getBoundingClientRect().bottom <= bottom).length, blockedBtnY: t('.blocked-btn')[0] + Math.round(scrollY), docH: document.documentElement.scrollHeight };
  });
  console.log(name, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
