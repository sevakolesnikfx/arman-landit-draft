/* Edge checks for design A: no storage, reduced motion, keyboard. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
async function ctx(opts, init) {
  const c = await browser.newContext(opts);
  if (init) await c.addInitScript(init);
  const p = await c.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(e.message));
  return { c, p, errs };
}
/* 1. Storage blocked */
{
  const { c, p, errs } = await ctx({ viewport: { width: 1440, height: 900 } }, () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await p.goto(INDEX + '?demo=1#/benefits', { waitUntil: 'networkidle' });
  const h = await p.locator('h1').first().innerText();
  await p.locator('.fchip[data-cat="health"]').click();
  const cats = await p.locator('.bcard').evaluateAll(cs => [...new Set(cs.map(c => c.dataset.cat))]);
  const meta = await p.locator('.ben-meta').innerText();
  out.push(['no storage: benefits render and filter', /benefits/.test(h) && /Student visa/.test(meta) && cats.length === 1 && cats[0] === 'health' && !errs.length, errs.join(' | ') + ' ' + cats.join(',')]);
  await c.close();
}
/* 2. Reduced motion: reply appears at once, no typing dots */
{
  const { c, p, errs } = await ctx({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(INDEX + '?demo=1#/chat', { waitUntil: 'networkidle' });
  await p.fill('#chat-input', 'hello');
  await p.keyboard.press('Enter');
  const now = await p.evaluate(() => ({ bots: document.querySelectorAll('.msg.bot').length, typing: !!document.getElementById('typing') }));
  out.push(['reduced motion: instant reply', now.bots === 1 && !now.typing && !errs.length, JSON.stringify(now)]);
  await c.close();
}
/* 3. Keyboard: drawer, menu, dialog */
{
  const { c, p, errs } = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto(INDEX + '?demo=1#/benefits', { waitUntil: 'networkidle' });
  await p.keyboard.press('Tab'); // skip link
  const skip = await p.evaluate(() => document.activeElement.textContent);
  await p.keyboard.press('Tab'); // menu button
  const menuLabel = await p.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(350);
  const inDrawer = await p.evaluate(() => !!document.activeElement.closest('#sidebar'));
  const colInert = await p.evaluate(() => document.getElementById('col').inert);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(350);
  const back = await p.evaluate(() => document.activeElement.getAttribute('aria-label'));
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth);
  out.push(['keyboard: drawer opens, traps, Escape returns focus', /Skip/.test(skip) && /menu/.test(menuLabel) && inDrawer && colInert && /menu/.test(back), [skip, menuLabel, inDrawer, colInert, back, ring].join(' / ')]);
  // focus a share button on a card and open the dialog with keyboard
  await p.locator('.bcard [data-act="share"]').first().focus();
  await p.keyboard.press('Enter');
  await p.waitForSelector('dialog[open]');
  const inDialog = await p.evaluate(() => !!document.activeElement.closest('dialog'));
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
  const stillIn = await p.evaluate(() => !!document.activeElement.closest('dialog') || document.activeElement === document.body);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  const ret = await p.evaluate(() => document.activeElement.getAttribute('data-act'));
  out.push(['keyboard: dialog focus inside, Escape returns to Share', inDialog && stillIn && ret === 'share' && !errs.length, [inDialog, stillIn, ret, errs.join('|')].join(' / ')]);
  await c.close();
}
/* 4. Desktop account menu keyboard */
{
  const { c, p, errs } = await ctx({ viewport: { width: 1440, height: 900 } });
  await p.goto(INDEX + '?demo=1#/chat', { waitUntil: 'networkidle' });
  await p.locator('#acct-btn').focus();
  await p.keyboard.press('Enter');
  const first = await p.evaluate(() => document.activeElement.textContent.trim());
  await p.keyboard.press('ArrowDown');
  const second = await p.evaluate(() => document.activeElement.textContent.trim());
  await p.keyboard.press('Escape');
  const back = await p.evaluate(() => document.activeElement.id);
  await p.keyboard.press('Enter');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter'); // Help now (third item: Language, Text size, Help now, Sign out)
  await p.waitForSelector('dialog[open]');
  const helpTitle = await p.locator('dialog[open] .dlg-title').innerText();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  const back2 = await p.evaluate(() => document.activeElement.id);
  out.push(['keyboard: quick menu arrows, Escape, Help now', /Language/.test(first) && /Text size/.test(second) && back === 'acct-btn' && /Help now/.test(helpTitle) && back2 === 'acct-btn' && !errs.length, [first, second, back, helpTitle, back2].join(' / ')]);
  /* The account row itself is a link straight to Settings */
  await p.locator('#acct-link').focus();
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash === '#/settings');
  await p.waitForSelector('#acct-link[aria-current="page"]', { timeout: 3000 }).catch(() => {});
  const cur = await p.evaluate(() => document.getElementById('acct-link').getAttribute('aria-current'));
  out.push(['keyboard: account row opens Settings and is marked current', cur === 'page' && !errs.length, String(cur)]);
  await c.close();
}
/* 5. Collapsed rail: each icon names itself on keyboard focus */
{
  const { c, p, errs } = await ctx({ viewport: { width: 1440, height: 900 } });
  await p.goto(INDEX + '?demo=1#/chat', { waitUntil: 'networkidle' });
  await p.locator('.sb-collapse').click();
  await p.waitForTimeout(450);
  await p.locator('.sb-nav a[data-nav="benefits"]').focus();
  await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
  await p.waitForTimeout(300);
  const tip = await p.evaluate(() => { const a = document.activeElement; const st = getComputedStyle(a, '::after'); return [st.content, st.visibility, st.opacity]; });
  await p.reload({ waitUntil: 'networkidle' });
  const still = await p.evaluate(() => document.getElementById('app').classList.contains('is-collapsed'));
  out.push(['rail: tooltip shows on focus; collapse is remembered', /Benefits/.test(tip[0]) && tip[1] === 'visible' && still && !errs.length, tip.join(' / ') + ' / remembered ' + still]);
  await c.close();
}
await browser.close();
let bad = 0;
for (const [name, ok, info] of out) { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  [' + info + ']' : '')); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
