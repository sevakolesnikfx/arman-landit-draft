/* People-lens review: keyboard-only pass on every route. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
async function go(p, url) {
  for (let i = 0; i < 3; i++) {
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(400); if (await p.locator('#root *').count()) return; } catch (e) {}
    await p.waitForTimeout(800);
  }
}
const info = () => {
  const a = document.activeElement;
  if (!a || a === document.body) return { tag: 'BODY' };
  const s = getComputedStyle(a);
  const r = a.getBoundingClientRect();
  const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
  // for inputs hidden visually (radio inside label), check sibling ring
  let proxy = false;
  if (!ring && (a.type === 'radio' || a.type === 'checkbox')) {
    const sib = a.nextElementSibling;
    if (sib) { const ss = getComputedStyle(sib); proxy = (ss.outlineStyle !== 'none' && parseFloat(ss.outlineWidth) > 0) || (ss.boxShadow && ss.boxShadow !== 'none'); }
  }
  const label = (a.getAttribute('aria-label') || a.innerText || a.value || a.getAttribute('placeholder') || a.name || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const offscreen = r.bottom < 0 || r.top > innerHeight || r.width === 0 || r.height === 0;
  return { tag: a.tagName, label, ring: ring || proxy, offscreen, inSidebar: !!a.closest('#sidebar'), w: Math.round(r.width), h: Math.round(r.height) };
};
const routes = ['?reset=1#/login', '?reset=1#/register', '?reset=1#/questions', '?reset=1#/ack', '?demo=1#/chat', '?demo=1#/benefits', '?demo=1#/benefit/council-tax-student', '?demo=1#/community', '?demo=1#/community/ratings', '?demo=1#/settings'];
const out = {};
for (const [dn, dev] of [['desk', DESK], ['phone', PHONE]]) {
  for (const r of routes) {
    const c = await browser.newContext(dev);
    const p = await c.newPage();
    await go(p, INDEX + r);
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    const stops = [];
    for (let i = 0; i < 60; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(info);
      stops.push(f);
      if (f.tag === 'BODY' && i > 2) break;
    }
    out[dn + ' ' + r] = stops;
    await c.close();
  }
}
fs.writeFileSync(path.join(HERE, 'keyboard.json'), JSON.stringify(out, null, 1));
for (const k of Object.keys(out)) {
  const s = out[k];
  const noRing = s.filter(x => x.tag !== 'BODY' && !x.ring);
  const off = s.filter(x => x.tag !== 'BODY' && x.offscreen && x.w === 0);
  console.log('\n== ' + k + ': ' + s.length + ' stops; no visible ring: ' + noRing.length + '; zero-size: ' + off.length);
  console.log('  order: ' + s.slice(0, 22).map(x => (x.inSidebar ? '[sb]' : '') + x.tag.toLowerCase() + ':' + x.label + (x.ring ? '' : ' !NORING')).join(' | '));
  noRing.slice(0, 8).forEach(x => console.log('  NO RING: ' + x.tag + ' "' + x.label + '"'));
  off.slice(0, 5).forEach(x => console.log('  ZERO SIZE: ' + x.tag + ' "' + x.label + '"'));
}
await browser.close();
