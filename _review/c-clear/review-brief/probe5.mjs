import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '?demo=1#/benefit/warm-home-discount', { waitUntil: 'load' });
await page.waitForTimeout(300);
const t = await page.innerText('#main');
console.log(t.slice(0, 900).replace(/\n+/g, ' | '));
await page.screenshot({ path: OUT + '/warm-home-discount-desktop.png' });
// refugee profile benefits header
await page.evaluate(() => { const s = window.LC.state; s.profile.status = 'refugee'; window.LC.save(); location.hash = '#/benefits'; });
await page.waitForTimeout(300);
console.log('REFUGEE:', (await page.innerText('.ben-head')).replace(/\n+/g, ' | '));
await page.evaluate(() => { location.hash = '#/benefit/council-tax-student'; });
await page.waitForTimeout(300);
console.log('REFUGEE CTS pf line:', (await page.locator('.pf-line').allInnerTexts()).join(' / '));
// no status
await page.evaluate(() => { const s = window.LC.state; delete s.profile.status; window.LC.save(); location.hash = '#/benefits'; });
await page.waitForTimeout(300);
console.log('NOSTATUS:', (await page.innerText('.ben-head')).replace(/\n+/g, ' | '));
// asylum
await page.evaluate(() => { const s = window.LC.state; s.profile.status = 'asylum'; window.LC.save(); location.hash = '#/benefits'; });
await page.waitForTimeout(300);
console.log('ASYLUM:', (await page.innerText('.ben-head')).replace(/\n+/g, ' | '));
// nation Scotland, worker: does start-up-loans appear?
await page.evaluate(() => { const s = window.LC.state; s.profile = { status: 'ilr' }; window.LC.save(); location.hash = '#/benefit/start-up-loans'; });
await page.waitForTimeout(300);
console.log('ILR start-up-loans worth:', (await page.locator('.sum-cell.sum-worth').innerText()).replace(/\n+/g, ' '), '| cost:', (await page.locator('.sum-more > div').nth(1).innerText()).replace(/\n+/g, ' '), '| standing:', await page.locator('.detail > .note-card').count());
await page.evaluate(() => { location.hash = '#/benefits/all'; });
await page.waitForTimeout(300);
const hasSUL = await page.locator('.b-row', { hasText: 'Start Up Loans' }).count();
console.log('ILR list has start up loans', hasSUL);
await browser.close();
