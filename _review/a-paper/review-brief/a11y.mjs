import { chromium, open, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = [['?reset=1', 'login'], ['?reset=1', 'register'], ['?demo=1', 'questions'], ['?demo=1', 'chat'], ['?demo=1', 'benefits'], ['?demo=1', 'benefit/council-tax-student'], ['?demo=1', 'community'], ['?demo=1', 'community/ratings'], ['?demo=1', 'settings']];
for (const size of ['phone']) {
  for (const [q, r] of routes) {
    const { ctx, page } = await open(browser, size, q + '#/' + r);
    if (r === 'chat') { await page.click('.chip >> nth=0'); await page.waitForTimeout(1600); }
    if (r === 'community') { await page.click('.post >> nth=0 >> [data-act=comments]'); await page.waitForTimeout(300); }
    const res = await page.evaluate(() => {
      const small = [];
      document.querySelectorAll('a[href], button, input, select, textarea, summary, label.check, label.opt, label.seg-opt, label.rate-opt, label.theme-opt').forEach(e => {
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden') return;
        if (e.matches('input[type=radio], input[type=checkbox]') && e.closest('label')) return; // label is target
        if (cs.position === 'absolute' && e.classList.contains('stretch')) return;
        if (r.height < 44 || r.width < 44) {
          // inline text links inside paragraphs are exempt in WCAG 2.5.8 if inline
          const inline = e.tagName === 'A' && cs.display === 'inline' && e.closest('p');
          small.push((e.getAttribute('aria-label') || e.innerText || e.value || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (inline ? ' (inline)' : ''));
        }
      });
      const fonts = {};
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) {
        const t = n.textContent.trim(); if (t.length < 3) continue;
        const el = n.parentElement; const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr-only, [hidden]')) continue;
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        const fs = parseFloat(cs.fontSize);
        if (fs < 16) { const k = fs.toFixed(1); (fonts[k] = fonts[k] || []).push((el.className || el.tagName) + ': ' + t.slice(0, 35)); }
      }
      Object.keys(fonts).forEach(k => { fonts[k] = [...new Set(fonts[k])].slice(0, 8); });
      return { small: [...new Set(small)].slice(0, 30), fonts };
    });
    console.log('==', size, r, '\n  small targets:', res.small.join(' | '), '\n  fonts<16:', JSON.stringify(res.fonts));
    await ctx.close();
  }
}
await browser.close();
