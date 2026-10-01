import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const q of ['demo=1&text=xlarge', 'demo=1&lang=ur&text=xlarge', 'demo=1&theme=daylight']) {
  const { ctx, page } = await open(browser, 'phone', q, '#/chat');
  for (const r of ['#/chat', '#/benefits', '#/benefit/uni-hardship-fund', '#/community', '#/settings']) {
    await page.go(r);
    const o = await page.evaluate(() => {
      const W = innerWidth; const bad = [];
      document.querySelectorAll('body *').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && (b.right > W + 1 || b.left < -1) && !e.closest('#sidebar,[hidden],.sr-only,dialog') && getComputedStyle(e).position !== 'fixed') bad.push((e.id || e.className.toString().slice(0, 30)) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return { hscroll: document.documentElement.scrollWidth > W, bad: bad.slice(0, 6) };
    });
    console.log(q, r, JSON.stringify(o));
  }
  await page.go('#/benefits');
  await page.shot(q.replace(/[=&]/g, '-') + '-benefits');
  await ctx.close();
}
await browser.close();
