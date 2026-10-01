/* Review helper for design A: viewport screenshots with optional scrolling.
   Usage: node snap.mjs <name> <params#route> <phone|desktop> [scrollY] [--full] [--js "code"] */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.resolve(HERE, '../../a-paper/index.html');
const [name, route, size = 'desktop', scrollY = '0', ...rest] = process.argv.slice(2);
const full = rest.includes('--full');
const jsIdx = rest.indexOf('--js');
const js = jsIdx >= 0 ? rest[jsIdx + 1] : null;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 820, height: 1000 }, deviceScaleFactor: 1 },
  small: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(SIZES[size]);
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const [q, h] = route.split('#');
await page.goto(pathToFileURL(INDEX).href + '?' + q + '#' + (h || ''), { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
if (js) { await page.evaluate(js); await page.waitForTimeout(1600); }
if (+scrollY) { await page.evaluate(y => window.scrollTo(0, y), +scrollY); await page.waitForTimeout(300); }
await page.screenshot({ path: path.join(HERE, 'snaps', name + '.png'), fullPage: full });
const sw = await page.evaluate(() => [document.scrollingElement.scrollWidth, window.innerWidth]);
console.log(name, 'scrollWidth/inner', sw.join('/'), errs.length ? '\n' + errs.join('\n') : '');
await browser.close();
