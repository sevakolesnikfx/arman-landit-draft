/* Extra looks: question 1 skip position, detail lower sections, dialogs, settings themes, ratings, phone. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ...PHONE, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(BASE + '?reset=1#/register', { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.fill('#f-email', 'a@b.c');
await page.click('#auth-form button[type=submit]');
await page.waitForTimeout(300);
const pos = await page.evaluate(() => {
  const y = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  return { options: document.querySelectorAll('.opt').length, continueY: y('#q-form button[type=submit]'), skipY: y('[data-action=q-skip]'), skipAllY: y('[data-action=q-skip-all]'), docH: document.documentElement.scrollHeight, vh: innerHeight };
});
console.log('Q1 phone', JSON.stringify(pos));
await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + 'q1-bottom-phone.png' });

await page.goto(BASE + '?demo=1#/benefit/council-tax-student', { waitUntil: 'load' });
await page.waitForTimeout(300);
for (const [i, sel] of [[1, '#d-need'], [2, '#d-steps'], [3, '#d-claim'], [4, '#d-comm']].entries()) {
  await page.evaluate(s => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }, sel[1]);
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + `detail-sec${sel[0]}-phone.png` });
}
await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + 'detail-end-phone.png' });
// share dialog
await page.evaluate(() => scrollTo(0, 0));
await page.click('.detail-actions [data-action=share]');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'dlg-share-phone.png' });
await page.keyboard.press('Escape');
await page.click('#d-comm ~ * [data-action=rate], [data-action=rate]');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'dlg-rate-phone.png' });
await page.keyboard.press('Escape');
// settings themes
await page.evaluate(() => { location.hash = '#/settings'; });
await page.waitForTimeout(300);
await page.evaluate(() => { const e = document.querySelector('#s-colours'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 20); });
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + 'settings-themes-phone.png' });
await page.evaluate(() => { const e = document.querySelector('#s-read'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 20); });
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + 'settings-read-phone.png' });
// ratings card
await page.evaluate(() => { location.hash = '#/community/ratings'; });
await page.waitForTimeout(300);
await page.evaluate(() => { const e = document.querySelector('.rate-card'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 20); });
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + 'ratings-card-phone.png' });
// write a post
await page.evaluate(() => { location.hash = '#/community'; });
await page.waitForTimeout(300);
await page.click('[data-action=write-post]');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'dlg-post-phone.png' });
await browser.close();
