/* Shared helpers for the people/accessibility review of design B. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
export const { chromium } = require('playwright');
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PAGE = pathToFileURL(path.resolve(HERE, '../../../b-dusk/index.html')).href;
export const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  narrow: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
export async function open(browser, size, query, hash, extra = {}) {
  const ctx = await browser.newContext({ ...SIZES[size], ...extra });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('page: ' + e.message));
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(PAGE + (query ? '?' + query : '') + (hash ? '#' + hash : ''), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.DUSK && window.LANDIT, null, { timeout: 4000 });
      break;
    } catch (e) { if (i === 2) throw e; await page.waitForTimeout(800); }
  }
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
export const shot = (page, name) => page.screenshot({ path: path.join(HERE, name + '.png') });
