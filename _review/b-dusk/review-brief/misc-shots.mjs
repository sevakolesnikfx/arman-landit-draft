import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '#/benefit/council-tax-student');
  await page.shot('detail-cts');
  await page.click('#tab-apply'); await page.waitForTimeout(200);
  await page.shot('detail-cts-apply');
  // Where is the disclaimer in the panel: is it visible without scrolling?
  console.log('panel disclaimer y', await page.evaluate(() => { const d = document.querySelector('.bp-disclaimer'); const r = d.getBoundingClientRect(); const sc = document.getElementById('bp-scroll'); return { top: Math.round(r.top), scrollH: sc.scrollHeight, clientH: sc.clientHeight }; }));
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '#/benefit/council-tax-student');
  await page.shot('detail-cts');
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('phone detail height', h);
  await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(150);
  await page.shot('detail-cts-2');
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '#/chat');
  await page.shot('chat');
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '#/benefits');
  const y = await page.evaluate(() => document.getElementById('blocked-toggle').getBoundingClientRect().top + scrollY);
  console.log('phone blocked toggle y', Math.round(y), 'screens', (y / 844).toFixed(1));
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'phone', '', '#/login');
  await page.shot('login');
  await ctx.close();
}
await browser.close();
