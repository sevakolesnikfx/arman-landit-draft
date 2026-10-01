import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const q of ['demo=1&text=xlarge', 'demo=1&lang=ur&text=xlarge']) {
  const { ctx, page } = await open(browser, 'phone', q, '#/benefit/uni-hardship-fund');
  await page.waitForTimeout(300);
  await page.shot('xl-detail-' + (q.includes('ur') ? 'ur' : 'en'));
  await ctx.close();
}
await browser.close();
