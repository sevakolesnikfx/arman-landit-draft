import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = ['#/chat', '#/benefits', '#/benefit/council-tax-student', '#/community', '#/settings'];
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size);
  for (const r of routes) {
    await page.go(r);
    if (r === '#/benefits') { await page.click('#blocked-toggle'); await page.waitForTimeout(100); }
    const res = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden],[inert]') && !e.closest('.sr-only'); };
      const small = [];
      document.querySelectorAll('a[href], button, input:not([type=checkbox]):not([type=radio]), select, textarea, label.check, label.opt, label.seg-opt, label.theme-card').forEach(e => {
        if (!vis(e)) return;
        const r = e.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) small.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      const fonts = {};
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.textContent.trim(); if (!t) continue;
        const e = n.parentElement; if (!vis(e)) continue;
        const fs = parseFloat(getComputedStyle(e).fontSize);
        if (fs < 16) { const k = Math.round(fs * 10) / 10 + 'px ' + e.tagName.toLowerCase() + '.' + [...e.classList].join('.'); (fonts[k] = fonts[k] || []).push(t.slice(0, 40)); }
      }
      return { small, fonts: Object.entries(fonts).map(([k, v]) => k + ' x' + v.length + ' e.g. "' + v[0] + '"') };
    });
    // dedupe small
    const ded = {}; res.small.forEach(s => { const k = s.replace(/"[^"]*"/, '""'); ded[k] = (ded[k] || 0) + 1; });
    console.log(`\n[${size}] ${r}\n small targets:`, Object.entries(ded).map(([k, v]) => k + (v > 1 ? ' x' + v : '')).join('\n   '));
    console.log(' small fonts:\n   ' + res.fonts.join('\n   '));
  }
  await ctx.close();
}
await browser.close();
