/* Accessible tree (ARIA snapshot) for key routes, to check names, roles and headings. */
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const size = process.argv[2] || 'desktop';
const SIZES = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, desktop: { viewport: { width: 1440, height: 900 } } };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
await page.waitForTimeout(300);
let out = '';
for (const r of ['chat', 'benefits/all', 'benefit/council-tax-student', 'community/ratings', 'settings']) {
  await page.evaluate(h => { location.hash = h; }, '#/' + r);
  await page.waitForTimeout(300);
  const snap = await page.locator('body').ariaSnapshot();
  out += '\n\n######## ' + r + '\n' + snap;
}
writeFileSync(OUT + `aria-${size}.txt`, out);
console.log('written', out.length);
await browser.close();
