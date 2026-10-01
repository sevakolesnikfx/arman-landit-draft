import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'phone', 'demo=1', '#/benefit/railcard-16-25');
const sec = page.locator('.bp-sec').filter({ hasText: 'Do you qualify?' });
await sec.scrollIntoViewIfNeeded();
await sec.screenshot({ path: '/Users/armanbayatmaku/Desktop/landit-test/_review/b-dusk/review-brief/shots/phone-rules-ticks.png' });
console.log(await page.evaluate(() => getComputedStyle(document.querySelector('.ticks svg')).color));
await browser.close();
