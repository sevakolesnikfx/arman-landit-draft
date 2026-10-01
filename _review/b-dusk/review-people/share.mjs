import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '/benefit/railcard-16-25');
  await page.click('.bp-actions [data-action="share"]'); await page.waitForTimeout(400);
  console.log('no web share -> toast right after open:', JSON.stringify(await page.evaluate(() => document.getElementById('toast').innerText)), 'dialog open:', await page.evaluate(() => !!document.querySelector('dialog[open]')));
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { window.__shared = 0; navigator.share = () => { window.__shared++; return new Promise(() => {}); }; navigator.canShare = () => true; });
  const page = await ctx.newPage();
  const { PAGE } = await import('./lib.mjs');
  await page.goto(PAGE + '?demo=1#/benefit/railcard-16-25', { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  await page.click('.bp-actions [data-action="share"]'); await page.waitForTimeout(300);
  console.log('with web share: native share called', await page.evaluate(() => window.__shared), 'times; custom dialog open:', await page.evaluate(() => !!document.querySelector('dialog[open]')));
  await ctx.close();
}
await browser.close();
