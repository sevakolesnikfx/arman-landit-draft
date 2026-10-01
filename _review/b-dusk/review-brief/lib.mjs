import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
export const { chromium } = require('playwright');
export const HERE = '/Users/armanbayatmaku/Desktop/landit-test/_review/b-dusk/review-brief';
export const PAGE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/b-dusk/index.html').href;
export const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
export async function open(browser, size, q = 'demo=1', hash = '#/chat') {
  const ctx = await browser.newContext(SIZES[size]);
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
  await page.goto(PAGE + (q ? '?' + q : '') + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  page.shot = name => page.screenshot({ path: path.join(HERE, 'shots', size + '-' + name + '.png') });
  page.go = async h => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForFunction(x => window.DUSK.lastHash === x || location.hash !== x, h); await page.waitForTimeout(250); };
  return { ctx, page };
}
