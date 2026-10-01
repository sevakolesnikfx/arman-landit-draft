/* Themes at phone, RTL at phone and desktop, xlarge at 360, drawer. */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const theme of ['dusk', 'slate', 'daylight', 'sand']) {
  for (const [name, h] of [['chat', '/chat'], ['benefits', '/benefits'], ['benefit', '/benefit/railcard-16-25']]) {
    const { ctx, page } = await open(browser, 'phone', 'demo=1&theme=' + theme, h);
    await shot(page, `theme-${theme}-${name}`);
    if (name === 'benefits') { await page.evaluate(() => document.querySelector('.bf-tools').scrollIntoView()); await page.waitForTimeout(150); await shot(page, `theme-${theme}-benefits-list`); }
    await ctx.close();
  }
}
// RTL
for (const size of ['phone', 'desktop']) {
  for (const [name, h] of [['chat', '/chat'], ['benefits', '/benefits'], ['benefit', '/benefit/railcard-16-25'], ['community', '/community'], ['settings', '/settings']]) {
    const { ctx, page, errors } = await open(browser, size, 'demo=1&lang=ar', h);
    await shot(page, `rtl-${size}-${name}`);
    if (name === 'benefits') { await page.evaluate(() => document.querySelector('.bf-tools').scrollIntoView()); await page.waitForTimeout(150); await shot(page, `rtl-${size}-benefits-list`); }
    if (name === 'chat' && size === 'phone') { await page.click('#menu-btn'); await page.waitForTimeout(400); await shot(page, `rtl-phone-drawer`); }
    if (errors.length) console.log('rtl', size, name, errors);
    await ctx.close();
  }
}
// drawer phone (ltr)
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '/chat');
  await page.click('#menu-btn'); await page.waitForTimeout(400);
  await shot(page, 'phone-drawer');
  await page.click('#trk-btn-uni-hardship-fund'); await page.waitForTimeout(200);
  await shot(page, 'phone-drawer-expanded');
  await ctx.close();
}
// avatar menu
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '/chat');
  await page.click('#avatar-btn'); await page.waitForTimeout(200);
  await shot(page, `${size}-avatar-menu`);
  await ctx.close();
}
await browser.close();
console.log('done');
