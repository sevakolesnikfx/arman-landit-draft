import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [size, q] of [['phone', 'demo=1'], ['narrow', 'demo=1&text=xlarge']]) {
  const { ctx, page } = await open(browser, size, q, '/benefits');
  const r = await page.evaluate(() => {
    const R = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const t = document.querySelector('.blocked-toggle');
    const txt = t.querySelector('.disclosure-text'), hint = t.querySelector('.disclosure-hint');
    const row = document.querySelector('.brow');
    const name = row.querySelector('.row-link'), trk = row.querySelector('.brow-track button');
    // range rect of the link text
    const rg = document.createRange(); rg.selectNodeContents(name); const rr = [...rg.getClientRects()].map(b => [Math.round(b.left), Math.round(b.right)]);
    return { toggleText: R(txt), toggleTextW: Math.round(txt.getBoundingClientRect().width), hint: R(hint), nameLines: rr, trackBtn: R(trk), nameBox: R(name) };
  });
  console.log(size, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
