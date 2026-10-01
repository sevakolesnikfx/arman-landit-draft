/* Focus rings seen with the keyboard, xlarge on desktop, the phone detail at normal size with keyboard. */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1&text=xlarge', '/benefits');
  await page.evaluate(() => document.querySelector('.bf-tools').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'desktop-xlarge-benefits-list');
  await page.goto(page.url().replace(/#.*/, '#/benefit/railcard-16-25')); await page.waitForTimeout(500);
  await shot(page, 'desktop-xlarge-benefit');
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/benefits');
  await page.focus('#bf-q'); for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement.scrollIntoView({ block: 'center' }));
  await shot(page, 'focus-desktop-row');
  await ctx.close();
}
for (const theme of ['daylight', 'sand']) {
  const { ctx, page } = await open(browser, 'phone', 'reset=1&theme=' + theme, '/register');
  await page.fill('#reg-email', 'a@b.c'); await page.click('#auth-submit'); await page.waitForTimeout(300);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  await shot(page, `focus-${theme}-questions`);
  await ctx.close();
}
await browser.close();
console.log('done');
