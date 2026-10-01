import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'phone', 'demo=1&text=xlarge', '#/benefit/uni-hardship-fund');
console.log(await page.evaluate(() => ['#bf-root', '#bf-panel', '.bp', '#bp-scroll', '.bp-bar', '.facts', '.tabs', '.bp-worth', '.bp-actions'].map(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return s + ' x=' + Math.round(r.left) + ' w=' + Math.round(r.width) + ' sw=' + e.scrollWidth; }).join('\n')));
console.log(await page.evaluate(() => { const t = document.querySelector('.tabs'); return [...t.children].map(c => c.innerText + ':' + Math.round(c.getBoundingClientRect().width)).join(', '); }));
await browser.close();
