/* Keyboard-only pass on every route (desktop and phone). */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

const probe = page => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { d: 'BODY' };
  const desc = (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 50);
  const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 35);
  const ring = x => { if (!x) return false; const s = getComputedStyle(x); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== 'rgba(0, 0, 0, 0)' && !s.outlineColor.endsWith(', 0)')) || (s.boxShadow && s.boxShadow !== 'none'); };
  const after = (() => { const s = getComputedStyle(el, '::after'); return s.content !== 'none' && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; })();
  const sib = el.nextElementSibling;
  const vis = ring(el) || after || (el.matches('input') && ring(sib)) || ring(el.closest('.composer-pill')) || ring(el.closest('.theme-card'));
  const r = el.getBoundingClientRect();
  const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const hiddenAnc = !!el.closest('[hidden], [inert], [aria-hidden="true"]');
  return { d: desc, name, vis, inView, hiddenAnc };
});

async function tabWalk(page, label, max = 60) {
  const seen = [];
  const problems = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const p = await probe(page);
    const key = p.d + '|' + p.name;
    if (seen.length && seen[0] === key) break; // wrapped
    seen.push(key);
    if (p.d !== 'BODY' && (!p.vis || !p.inView || p.hiddenAnc)) problems.push(`${i + 1}: ${p.d} "${p.name}" vis=${p.vis} inView=${p.inView} hidden=${p.hiddenAnc}`);
  }
  console.log(`\n== ${label}: ${seen.length} stops`);
  console.log('  order: ' + seen.slice(0, 40).map(s => s.split('|')[1] || s.split('|')[0]).join(' > '));
  if (problems.length) console.log('  PROBLEMS:\n   ' + problems.join('\n   '));
}

const routes = [
  ['login', 'reset=1', '/login'],
  ['register', 'reset=1', '/register'],
  ['chat', 'demo=1', '/chat'],
  ['benefits', 'demo=1', '/benefits'],
  ['benefit', 'demo=1', '/benefit/railcard-16-25'],
  ['community', 'demo=1', '/community'],
  ['settings', 'demo=1', '/settings'],
];
for (const size of ['desktop', 'phone']) {
  for (const [name, q, h] of routes) {
    const { ctx, page } = await open(browser, size, q, h);
    await tabWalk(page, size + ' ' + name, name === 'benefits' || name === 'settings' || name === 'community' ? 90 : 50);
    await ctx.close();
  }
}

// questions page
{
  const { ctx, page } = await open(browser, 'desktop', 'reset=1', '/register');
  await page.fill('#reg-email', 'a@b.c'); await page.press('#reg-password', 'Enter').catch(async () => { await page.click('#auth-submit'); });
  await page.waitForTimeout(400);
  console.log('after Enter on register, hash =', await page.evaluate(() => location.hash), 'focus =', JSON.stringify(await probe(page)));
  await tabWalk(page, 'desktop questions', 40);
  // arrow keys inside radio group
  await page.focus('#q-status-student'); await page.keyboard.press('ArrowRight');
  console.log('arrow in radios ->', await page.evaluate(() => document.activeElement.id), 'progress:', await page.locator('#q-progress').innerText());
  // skip with keyboard then focus stays
  await page.focus('#qskip-work'); await page.keyboard.press('Enter');
  console.log('after skip, focus:', await page.evaluate(() => document.activeElement.id));
  await page.focus('#q-continue'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  console.log('ack focus:', JSON.stringify(await probe(page)));
  await ctx.close();
}

// drawer on phone: open with keyboard, trap, Escape, focus return
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '/chat');
  await page.focus('#menu-btn'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const f1 = await probe(page);
  const stops = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); const p = await probe(page); stops.push(p.name || p.d); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const f2 = await probe(page);
  console.log('\n== phone drawer: first focus', f1.name, '| tabs:', stops.join(' > '), '| after Esc focus:', f2.d);
  // inside drawer: go to Benefits via keyboard, see where focus lands
  await page.focus('#menu-btn'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await page.focus('#nav-benefits'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  console.log('after nav to Benefits from drawer, focus:', JSON.stringify(await probe(page)), 'drawer:', await page.evaluate(() => document.getElementById('shell').dataset.drawer));
  await ctx.close();
}

// avatar menu: open with Enter, arrows, Escape, focus return; submenu
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/chat');
  await page.focus('#avatar-btn'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const a = await probe(page);
  await page.keyboard.press('ArrowDown'); const b = await probe(page);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150); const c = await probe(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150); const d = await probe(page);
  console.log('\n== avatar menu: open->', a.name, '| down->', b.name, '| enter (submenu)->', c.name, '| Esc ->', d.d);
  // Tab out of open menu
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const e = await probe(page);
  console.log('   tab inside menu ->', e.name, 'menu open:', await page.evaluate(() => !document.getElementById('avatar-menu').hidden));
  await ctx.close();
}

// dialogs: Help now, share, rate, delete confirm: Escape closes, focus returns
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/benefit/railcard-16-25');
  await page.focus('.bp-actions [data-action="share"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const s1 = await probe(page);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  const s2 = await probe(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const s3 = await probe(page);
  console.log('\n== share dialog: first', s1.name, '| after 6 tabs', s2.d, s2.name, '| after Esc', s3.d, s3.name);
  // Escape on detail panel closes it, focus returns to row
  await page.focus('#bp-title').catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  console.log('   Esc on panel ->', await page.evaluate(() => location.hash), JSON.stringify(await probe(page)));
  // Tabs keyboard
  await page.goto(page.url().replace(/#.*/, '') + '#/benefit/railcard-16-25'); await page.waitForTimeout(400);
  await page.focus('#tab-overview'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  console.log('   tab arrow ->', await page.evaluate(() => document.activeElement.id + ' selected=' + document.activeElement.getAttribute('aria-selected')));
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/settings');
  await page.focus('#st-delete'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const a = await probe(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const b = await probe(page);
  console.log('\n== delete confirm: first focus', a.name, '| Esc ->', b.d, b.name);
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/community');
  await page.focus('#rate-open'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const a = await probe(page);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const b = await probe(page);
  console.log('== rate dialog: first focus', a.d, a.name, '| Esc ->', b.d, b.name);
  // community tabs on desktop: are both panels visible but tablist present?
  const t = await page.evaluate(() => ({ tablistVisible: getComputedStyle(document.querySelector('.cm-tabs')).display, ratingsHidden: document.getElementById('cm-ratings').hidden }));
  console.log('   community desktop tablist display:', JSON.stringify(t));
  await ctx.close();
}
// skip link
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/benefits');
  await page.keyboard.press('Tab');
  const a = await probe(page);
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.keyboard.press('Tab');
  const b = await probe(page);
  console.log('\n== skip link: first stop', a.d, a.name, '| after skip + Tab ->', b.d, b.name);
  await ctx.close();
}
await browser.close();
