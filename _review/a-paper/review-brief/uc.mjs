import { chromium, open, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'desktop', '?demo=1#/benefit/universal-credit');
await page.screenshot({ path: SHOTS + 'uc-top-desktop.png' });
await page.evaluate(() => document.querySelector('.apply-row').scrollIntoView({ block: 'center' })); await page.waitForTimeout(200);
await page.screenshot({ path: SHOTS + 'uc-apply-desktop.png' });
console.log(await page.evaluate(() => ({ apply: document.querySelector('.apply-row')?.innerText, claim: document.querySelector('.claim')?.innerText.replace(/\n+/g, ' / '), track: document.querySelector('[data-fk=d-track]').innerText })));
await ctx.close(); await browser.close();
