import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'narrow', 'demo=1&text=xlarge', '/benefits');
const m = () => page.evaluate(() => { const row = document.querySelector('.brow'); const n = row.querySelector('.row-link').getBoundingClientRect(); const t = row.querySelector('.brow-track button').getBoundingClientRect(); return { nameRight: Math.round(n.right), trackLeft: Math.round(t.left), cols: getComputedStyle(row).gridTemplateColumns }; });
console.log('before', JSON.stringify(await m()));
await page.addStyleTag({ content: '.brow .tag { white-space: normal; }' });
console.log('tag wrap', JSON.stringify(await m()));
// blocked toggle fix test
await page.addStyleTag({ content: '.blocked-toggle { flex-wrap: wrap; } .blocked-toggle .disclosure-hint { order: 3; flex-basis: 100%; padding-inline-start: 2.75rem; }' });
console.log('toggle', await page.evaluate(() => Math.round(document.querySelector('.blocked-toggle .disclosure-text').getBoundingClientRect().width)));
// detail panel overflow fix test
await page.goto(page.url().replace(/#.*/, '#/benefit/railcard-16-25')); await page.waitForTimeout(500);
const ov = () => page.evaluate(() => Math.max(...[...document.querySelectorAll('#bf-panel *')].map(e => e.getBoundingClientRect().right)));
console.log('panel max right before', Math.round(await ov()));
await page.addStyleTag({ content: '.bp-scroll { grid-template-columns: minmax(0, 1fr); } .tabs { overflow-x: auto; }' });
console.log('panel max right after', Math.round(await ov()));
await ctx.close(); await browser.close();
