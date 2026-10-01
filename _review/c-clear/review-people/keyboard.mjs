/* Keyboard-only pass: tab order, visible focus, focus obscured by sticky bars, traps, Escape, focus return.
   node keyboard.mjs phone|desktop */
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const size = process.argv[2] || 'desktop';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ...SIZES[size], reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
await page.waitForTimeout(300);

const desc = () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { d: 'BODY' };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 35);
  const visibleFocus = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow && cs.boxShadow !== 'none');
  // is it hidden behind something (sticky composer, tab bar, top bar)?
  let obscured = '';
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), cy = r.top + Math.min(r.height / 2, 12);
  if (cy > 0 && cy < innerHeight) {
    const top = document.elementFromPoint(cx, cy);
    if (top && top !== el && !el.contains(top) && !top.contains(el)) obscured = (top.closest('.tabbar') ? 'tabbar' : top.closest('.composer') ? 'composer' : top.closest('.topbar') ? 'topbar' : top.tagName.toLowerCase() + '.' + (top.className || '').toString().split(' ')[0]);
  } else obscured = 'offscreen y=' + Math.round(cy);
  // label-wrapped inputs: check the visual box
  let boxFocus = '';
  if (el.matches('input[type=radio],input[type=checkbox]')) {
    const lab = el.closest('label');
    const box = lab && lab.querySelector('.opt-box,.tick-box,.claim-box,.theme-box,.size-box,.lang-box,span');
    if (box) { const bs = getComputedStyle(box); boxFocus = (bs.outlineStyle !== 'none' && parseFloat(bs.outlineWidth) >= 2) || (bs.boxShadow && bs.boxShadow !== 'none') ? 'boxfocus' : 'NO-BOX-FOCUS'; }
  }
  return { d: `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} "${name}"`, vf: visibleFocus || boxFocus === 'boxfocus', obscured, boxFocus, w: Math.round(r.width), h: Math.round(r.height) };
});

async function tabRun(hash, n, label) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  const seq = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(30);
    const d = await desc();
    seq.push(d);
    if (d.d === 'BODY') break;
  }
  const noFocus = seq.filter(s => s.d !== 'BODY' && !s.vf).map(s => s.d);
  const obsc = seq.filter(s => s.obscured).map(s => s.d + ' <' + s.obscured + '>');
  console.log(`\n== ${label || hash}: ${seq.length} stops`);
  console.log('  order:', seq.slice(0, 22).map(s => s.d).join(' > '));
  if (noFocus.length) console.log('  NO VISIBLE FOCUS:', [...new Set(noFocus)].join(' | '));
  if (obsc.length) console.log('  OBSCURED:', [...new Set(obsc)].slice(0, 10).join(' | '));
  return seq;
}

await tabRun('#/chat', 30);
// chat with a conversation, tab through the log
await page.fill('#chat-input', 'What can I claim?');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await tabRun('#/chat', 40, 'chat with reply');
await tabRun('#/benefits', 30);
await tabRun('#/benefits/all', 30);
await tabRun('#/benefit/council-tax-student', 45);
await tabRun('#/community', 25);
await tabRun('#/community/ratings', 15);
await tabRun('#/settings', 60);
await tabRun('#/settings/help', 15);
await tabRun('#/settings/answer/status', 20);
await tabRun('#/login', 15);
await tabRun('#/questions', 20);
await tabRun('#/ack', 5);

// skip link
await page.evaluate(h => { location.hash = h; }, '#/benefits');
await page.waitForTimeout(300);
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.keyboard.press('Tab');
console.log('\nfirst tab on benefits:', (await desc()).d);
await page.keyboard.press('Enter');
console.log('after skip Enter:', await page.evaluate(() => document.activeElement.id || document.activeElement.tagName));
await page.keyboard.press('Tab');
console.log('next tab after skip:', (await desc()).d);

// dialogs: share, rate, write post, delete
async function dlgTest(hash, sel, label) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
  const btn = page.locator(sel).first();
  await btn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const inDlg = await page.evaluate(() => !!document.activeElement.closest('dialog'));
  const first = (await desc()).d;
  // tab 25 times and check focus stays in dialog
  let escaped = false;
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); const ok = await page.evaluate(() => !!document.activeElement.closest('dialog')); if (!ok) { escaped = (await desc()).d; break; } }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => !!document.querySelector('dialog[open]'));
  const back = (await desc()).d;
  console.log(`dialog ${label}: focusInside=${inDlg} first=${first} escapedTo=${escaped} openAfterEsc=${open} focusAfter=${back}`);
}
await dlgTest('#/benefit/council-tax-student', '.detail-actions [data-action=share]', 'share');
await dlgTest('#/benefit/council-tax-student', '[data-action=rate]', 'rate');
await dlgTest('#/community', '[data-action=write-post]', 'write-post');
await dlgTest('#/settings', '[data-action=delete-account]', 'delete');

// drawer on phone
if (size === 'phone') {
  await page.evaluate(h => { location.hash = h; }, '#/benefits');
  await page.waitForTimeout(300);
  await page.locator('[data-action=open-drawer]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  console.log('drawer first focus:', (await desc()).d);
  const seen = [];
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); const d = await desc(); seen.push(d.d); }
  const outside = await page.evaluate(() => !document.activeElement.closest('#sidebar'));
  console.log('drawer tab cycle:', seen.slice(0, 12).join(' > '), ' outsideAfter20=', outside);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log('after Escape drawer open?', await page.evaluate(() => !!document.querySelector('.drawer-open')), 'focus:', (await desc()).d);
} else {
  // rail toggle
  await page.evaluate(h => { location.hash = h; }, '#/chat');
  await page.waitForTimeout(300);
  await page.locator('.side-full [data-action=rail]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  console.log('after Hide menu, focus:', (await desc()).d);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  console.log('after Menu, focus:', (await desc()).d);
}
// app toggle via keyboard keeps focus
const apSel = size === 'phone' ? null : '#sidebar .app-toggle';
if (apSel) {
  await page.locator(apSel).first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  console.log('app toggle expanded:', await page.locator(apSel).first().getAttribute('aria-expanded'), 'focus:', (await desc()).d);
  await page.keyboard.press('Tab');
  console.log('next after expand:', (await desc()).d);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  console.log('after Space on checkbox focus:', (await desc()).d);
}
console.log('errors', errs);
await browser.close();
