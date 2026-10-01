import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, opts] of [['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE + '?demo=1#/benefits/all', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.b-row')].map(x => x.getBoundingClientRect().height);
    const first = document.querySelector('.b-row').getBoundingClientRect().top + scrollY;
    return { n: rows.length, avg: Math.round(rows.reduce((a, b) => a + b, 0) / rows.length), min: Math.round(Math.min(...rows)), max: Math.round(Math.max(...rows)), firstTop: Math.round(first), doc: document.documentElement.scrollHeight };
  });
  console.log(name, JSON.stringify(r));
  // questions skip position
  await page.goto(BASE + '?reset=1#/questions', { waitUntil: 'load' });
  await page.evaluate(() => { const s = window.LC.state; s.signedIn = true; s.user = { name: 'x', email: '' }; window.LC.save(); location.hash = '#/questions/1'; });
  await page.waitForTimeout(300);
  const q = await page.evaluate(() => [...document.querySelectorAll('.q-actions > *')].map(e => [e.innerText.trim(), Math.round(e.getBoundingClientRect().top)]));
  console.log(name, 'Q1 actions top (viewport h=' + opts.viewport.height + ')', JSON.stringify(q));
  await page.screenshot({ path: `${OUT}/q1-${name}.png` });
  await ctx.close();
}
await browser.close();
