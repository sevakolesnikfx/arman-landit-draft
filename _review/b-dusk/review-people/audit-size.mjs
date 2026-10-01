/* Small text (<16px) and small tap targets (<44px) on every route. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, open, HERE } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

const scenes = [
  ['login', 'reset=1', '/login'],
  ['register', 'reset=1', '/register'],
  ['questions', 'reset=1', '/register', async p => { await p.fill('#reg-email', 'a@b.c'); await p.click('#auth-submit'); await p.waitForTimeout(400); }],
  ['ack', 'reset=1', '/register', async p => { await p.fill('#reg-email', 'a@b.c'); await p.click('#auth-submit'); await p.waitForTimeout(300); await p.click('#q-skip-all'); await p.waitForTimeout(300); }],
  ['chat', 'demo=1', '/chat'],
  ['benefits', 'demo=1', '/benefits'],
  ['benefit-overview', 'demo=1', '/benefit/railcard-16-25'],
  ['benefit-apply', 'demo=1', '/benefit/railcard-16-25', async p => { await p.click('#tab-apply'); }],
  ['benefit-community', 'demo=1', '/benefit/railcard-16-25', async p => { await p.click('#tab-community'); }],
  ['community', 'demo=1', '/community'],
  ['community-ratings', 'demo=1', '/community', async (p, size) => { if (size === 'phone') await p.click('#cm-tab-ratings'); }],
  ['settings', 'demo=1', '/settings'],
  ['sidebar', 'demo=1', '/chat', async (p, size) => { if (size === 'phone') { await p.click('#menu-btn'); await p.waitForTimeout(300); } await p.click('#trk-btn-uni-hardship-fund').catch(() => {}); }],
  ['avatar-menu', 'demo=1', '/chat', async p => { await p.click('#avatar-btn'); }],
  ['help-dialog', 'demo=1', '/chat', async p => { await p.click('#avatar-btn'); await p.click('[data-menu="help"]'); }],
];

const report = {};
for (const size of ['phone', 'desktop']) {
  for (const [name, q, h, act] of scenes) {
    const { ctx, page } = await open(browser, size, q, h);
    if (act) await act(page, size);
    await page.waitForTimeout(400);
    const res = await page.evaluate(() => {
      const root = document.querySelector('dialog[open]') || document.body;
      const vis = el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none') return false;
        if (el.closest('[hidden], .sr-only, [aria-hidden="true"]')) return el.closest('[aria-hidden="true"]') ? 'aria' : false;
        if (el.closest('[inert]')) return false;
        return true;
      };
      const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      // small text: elements with own text nodes
      const small = {};
      root.querySelectorAll('*').forEach(el => {
        if (['SCRIPT', 'STYLE', 'svg', 'path', 'OPTION'].includes(el.tagName)) return;
        const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
        if (!own) return;
        const v = vis(el);
        if (v !== true) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) {
          const k = desc(el).slice(0, 80) + ' @' + fs + 'px';
          if (!small[k]) small[k] = { n: 0, sample: own.slice(0, 70) };
          small[k].n++;
        }
      });
      // tap targets
      const targets = [];
      root.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=tab], [role=switch], summary').forEach(el => {
        if (vis(el) !== true) return;
        let box = el.getBoundingClientRect();
        // radios/checkboxes: use their label
        if (el.matches('input[type=radio], input[type=checkbox]')) {
          const lab = el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]'));
          if (lab) box = lab.getBoundingClientRect();
        }
        if (el.matches('input[type=radio], input[type=checkbox]') && getComputedStyle(el).opacity === '0') {
          const lab = el.closest('label'); if (lab) box = lab.getBoundingClientRect();
        }
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p');
        if ((box.height < 44 || box.width < 44) && !inline) {
          targets.push(desc(el).slice(0, 70) + ' "' + (el.getAttribute('aria-label') || el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '" ' + Math.round(box.width) + 'x' + Math.round(box.height));
        }
      });
      return { small, targets: [...new Set(targets)] };
    });
    report[size + ':' + name] = res;
    await ctx.close();
  }
}
fs.writeFileSync(path.join(HERE, 'audit-size.json'), JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) {
  console.log('\n== ' + k);
  for (const [s, o] of Object.entries(v.small)) console.log('  text ' + s + ' x' + o.n + ' "' + o.sample + '"');
  for (const t of v.targets) console.log('  tap  ' + t);
}
await browser.close();
