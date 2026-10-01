/* More phone views: community posts, ratings, dialogs, settings lower sections, detail tabs. */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const go = async (q, h, size = 'phone') => open(browser, size, q, h);
{
  const { ctx, page } = await go('demo=1', '/community');
  await page.evaluate(() => document.querySelector('.feed-tools').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-community-feed');
  await page.click('#cm-tab-ratings'); await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
  await shot(page, 'phone-community-ratings');
  await page.evaluate(() => document.getElementById('rt-list').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-community-ratings-list');
  await page.click('#rate-open'); await page.waitForTimeout(300);
  await shot(page, 'phone-rate-dialog');
  await ctx.close();
}
{
  const { ctx, page } = await go('demo=1', '/settings');
  await page.evaluate(() => document.getElementById('st-prefs').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-settings-prefs');
  await page.evaluate(() => document.getElementById('st-safety').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-settings-safety');
  await page.evaluate(() => document.getElementById('st-privacy').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-settings-privacy');
  await ctx.close();
}
{
  const { ctx, page } = await go('demo=1', '/benefit/railcard-16-25');
  await page.evaluate(() => document.querySelector('.tabs').scrollIntoView()); await page.waitForTimeout(150);
  await shot(page, 'phone-detail-tabs');
  await page.click('#tab-apply'); await page.waitForTimeout(150);
  await shot(page, 'phone-detail-apply');
  await page.click('.bp-actions [data-action="share"]'); await page.waitForTimeout(300);
  await shot(page, 'phone-share-dialog');
  await ctx.close();
}
{
  const { ctx, page } = await go('demo=1', '/benefit/universal-credit');
  await shot(page, 'phone-detail-blocked');
  await ctx.close();
}
{
  const { ctx, page } = await go('demo=1', '/chat');
  await page.click('#avatar-btn'); await page.click('[data-menu="help"]'); await page.waitForTimeout(300);
  await shot(page, 'phone-help-dialog');
  await ctx.close();
}
{
  const { ctx, page } = await go('demo=1', '/chat', 'desktop');
  await page.click('#collapse-btn'); await page.waitForTimeout(300);
  await shot(page, 'desktop-sidebar-collapsed');
  await ctx.close();
}
await browser.close();
console.log('done');
