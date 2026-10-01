/* Benefits page: where the list starts, repeated pills, row content. */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '/benefits');
  const info = await page.evaluate(() => {
    const r = el => el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
    const rows = [...document.querySelectorAll('.brow')];
    const notListed = rows.map(row => [...row.querySelectorAll('.brow-cell')].filter(c => /Not listed/.test(c.textContent)).length);
    const generic = rows.filter(r => r.classList.contains('is-generic')).length;
    const vis = el => el && el.offsetParent !== null;
    return {
      viewportH: innerHeight,
      docH: document.documentElement.scrollHeight,
      glanceTop: r(document.querySelector('.glance')),
      chartTop: r(document.querySelector('.chart')),
      toolsTop: r(document.querySelector('.bf-tools')),
      firstRowTop: r(rows[0]),
      blockedTop: r(document.querySelector('.blocked')),
      rows: rows.length,
      rowsWithNotListed: notListed.filter(n => n > 0).length,
      notListedTotal: notListed.reduce((a, b) => a + b, 0),
      generic,
      genericVisible: rows.filter(r => vis(r.querySelector('.brow-generic'))).length,
      subtextVisible: rows.filter(r => vis(r.querySelector('.brow-subtext'))).length,
      headVisible: vis(document.querySelector('.blist-head')),
      firstRows: rows.slice(0, 6).map(r => r.innerText.replace(/\s+/g, ' ').trim()),
      rowH: rows.slice(0, 5).map(r => Math.round(r.getBoundingClientRect().height)),
      effortNote: (document.querySelector('.effort-note') || {}).innerText,
      chartQ: [...document.querySelectorAll('.bar-q')].map(e => e.innerText),
      tiles: [...document.querySelectorAll('.gtile')].map(e => e.innerText.replace(/\s+/g, ' ')),
    };
  });
  console.log(size, JSON.stringify(info, null, 1));
  // scroll to the toolbar and the first row and take viewport shots
  await page.evaluate(() => document.querySelector('.bf-tools').scrollIntoView());
  await page.waitForTimeout(200);
  await shot(page, `${size}-benefits-list`);
  await page.evaluate(() => { const b = document.getElementById('blocked-toggle'); b.scrollIntoView(); b.click(); });
  await page.waitForTimeout(300);
  await shot(page, `${size}-benefits-blocked`);
  await ctx.close();
}
await browser.close();
