import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '#/benefits');
  const H = size === 'phone' ? 844 : 900;
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const listTop = await page.evaluate(() => document.getElementById('list-h').getBoundingClientRect().top + scrollY);
  console.log(size, 'page height', total, 'list heading at', Math.round(listTop), 'screens before list', (listTop / H).toFixed(1));
  for (const [i, y] of [0, 1, 2, 3].map(k => [k, k * (H - 100)])) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await page.waitForTimeout(150);
    await page.shot('benefits-' + i);
  }
  await page.evaluate(() => document.getElementById('list-h').scrollIntoView());
  await page.waitForTimeout(150);
  await page.shot('benefits-list');
  // row heights
  console.log(size, 'row heights', await page.evaluate(() => [...document.querySelectorAll('.brow')].slice(0, 8).map(r => Math.round(r.getBoundingClientRect().height))));
  // filter by category via chart bar
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.bar-row').first().click();
  await page.waitForTimeout(500);
  console.log(size, 'after bar click', await page.inputValue('#bf-cat'), await page.locator('#bf-count').innerText());
  await ctx.close();
}
await browser.close();
