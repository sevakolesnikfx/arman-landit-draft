/* Long sentences (> 20 words) visible on each route, with their source element. */
import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const scenes = [
  ['register', 'reset=1', '/register'],
  ['questions', 'reset=1', '/register', async p => { await p.fill('#reg-email', 'a@b.c'); await p.click('#auth-submit'); await p.waitForTimeout(300); }],
  ['ack', 'reset=1', '/register', async p => { await p.fill('#reg-email', 'a@b.c'); await p.click('#auth-submit'); await p.waitForTimeout(300); await p.click('#q-skip-all'); await p.waitForTimeout(300); }],
  ['chat-empty', 'reset=1', '/register', async p => { await p.fill('#reg-email', 'a@b.c'); await p.click('#auth-submit'); await p.waitForTimeout(300); await p.click('#q-skip-all'); await p.waitForTimeout(300); await p.click('#ack-btn'); await p.waitForTimeout(300); }],
  ['chat', 'demo=1', '/chat', async p => { for (const t of ['What does no recourse to public funds mean?', 'How does tracking work?', 'Which documents do I need?']) { await p.fill('#chat-input', t); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(1600); } }],
  ['benefits', 'demo=1', '/benefits', async p => { await p.click('#blocked-toggle'); }],
  ['benefit-ov', 'demo=1', '/benefit/railcard-16-25'],
  ['benefit-apply', 'demo=1', '/benefit/railcard-16-25', async p => { await p.click('#tab-apply'); }],
  ['benefit-blocked', 'demo=1', '/benefit/universal-credit'],
  ['community', 'demo=1', '/community'],
  ['settings', 'demo=1', '/settings'],
];
const seen = new Set();
for (const [name, q, h, act] of scenes) {
  const { ctx, page } = await open(browser, 'desktop', q, h);
  if (act) await act(page);
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('p, li, h1, h2, h3, dd, span.disclosure-hint, label, legend, .bar-q, .gtile-q').forEach(el => {
      if (el.closest('[hidden], .sr-only, [inert]') || !el.getClientRects().length) return;
      if (el.querySelector('p, li')) return;
      const t = el.innerText.replace(/\s+/g, ' ').trim();
      t.split(/(?<=[.!?])\s+/).forEach(s => {
        const n = s.split(/\s+/).filter(Boolean).length;
        if (n > 20) res.push(n + 'w [' + el.tagName.toLowerCase() + '.' + (el.className || '') + '] ' + s);
      });
    });
    return res;
  });
  const fresh = out.filter(x => !seen.has(x.replace(/^\d+w /, '')));
  fresh.forEach(x => seen.add(x.replace(/^\d+w /, '')));
  if (fresh.length) console.log('\n== ' + name + '\n  ' + fresh.join('\n  '));
  await ctx.close();
}
await browser.close();
