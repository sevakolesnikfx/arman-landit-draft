import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  for (const route of ['#/chat', '#/benefits', '#/benefit/railcard-16-25', '#/settings']) {
    const { ctx, page } = await open(browser, size, 'demo=1&lang=ar', route);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const sb = document.getElementById('sidebar').getBoundingClientRect();
      const main = document.querySelector('.main-col').getBoundingClientRect();
      return { dir: document.documentElement.dir, lang: document.documentElement.lang, sidebarX: Math.round(sb.x), sidebarW: Math.round(sb.width), mainX: Math.round(main.x), title: document.getElementById('page-title').innerText, hscroll: document.documentElement.scrollWidth > innerWidth };
    });
    console.log(size, route, JSON.stringify(info));
    await page.shot('ar' + route.replace(/[#/]+/g, '-'));
    if (size === 'phone' && route === '#/chat') {
      await page.click('#menu-btn'); await page.waitForTimeout(400);
      console.log('  drawer box', JSON.stringify(await page.locator('#sidebar').boundingBox()));
      await page.shot('ar-drawer');
    }
    await ctx.close();
  }
}
await browser.close();
