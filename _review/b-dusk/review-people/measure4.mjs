import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'narrow', 'demo=1&text=xlarge', '/benefit/railcard-16-25');
const list = () => page.evaluate(() => [...document.querySelectorAll('#bf-panel *')].filter(e => e.getBoundingClientRect().right > 362 && e.getClientRects().length).slice(0, 8).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className) + ' R' + Math.round(e.getBoundingClientRect().right) + ' w' + Math.round(e.getBoundingClientRect().width) + ' sw' + e.scrollWidth));
console.log('before', await list());
await page.addStyleTag({ content: '.bp-scroll { grid-template-columns: minmax(0, 1fr); } .tabs { overflow-x: auto; } .bp-bar { flex-wrap: wrap; }' });
console.log('after', await list());
console.log(await page.evaluate(() => ({ panelW: document.getElementById('bf-panel').getBoundingClientRect().width, bp: document.querySelector('.bp-scroll').getBoundingClientRect().width, cols: getComputedStyle(document.querySelector('.bp-scroll')).gridTemplateColumns })));
await ctx.close(); await browser.close();
