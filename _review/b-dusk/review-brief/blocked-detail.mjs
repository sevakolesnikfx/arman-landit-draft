import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '#/benefit/universal-credit');
  await page.waitForTimeout(400);
  await page.shot('blocked-uc-detail');
  console.log(size, await page.evaluate(() => ({ banner: document.querySelector('.banner').innerText, actions: document.querySelector('.bp-actions').innerText.replace(/\n+/g, ' | '), claim: !!document.getElementById('claim-sec'), worth: document.querySelector('.bp-worth').innerText.replace(/\n+/g, ' | ') })));
  await ctx.close();
}
await browser.close();
