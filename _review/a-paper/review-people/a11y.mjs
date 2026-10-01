/* People-lens review: names, headings, dialogs, Escape and focus return. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const log = (...a) => console.log(...a);
async function go(p, url) {
  for (let i = 0; i < 3; i++) {
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(400); if (await p.locator('#root *').count()) return; } catch (e) {}
    await p.waitForTimeout(800);
  }
}
const active = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.tagName + ' ' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)) : 'none'; });

/* Headings and unnamed controls per route */
const routes = ['?reset=1#/login', '?reset=1#/questions', '?reset=1#/ack', '?demo=1#/chat', '?demo=1#/benefits', '?demo=1#/benefit/council-tax-student', '?demo=1#/community', '?demo=1#/community/ratings', '?demo=1#/settings'];
for (const r of []) {
  const c = await browser.newContext(DESK); const p = await c.newPage();
  await go(p, INDEX + r);
  const res = await p.evaluate(() => {
    const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4')).filter(h => !h.closest('[hidden]')).map(h => h.tagName + ':' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 40));
    const h1s = hs.filter(h => h.startsWith('H1')).length;
    const unnamed = [];
    document.querySelectorAll('button, a[href], input, select, textarea, [role=switch]').forEach(el => {
      if (el.closest('[hidden]')) return;
      let name = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || el.textContent.trim();
      if (!name && el.id) { const l = document.querySelector('label[for="' + el.id + '"]'); if (l) name = l.textContent.trim(); }
      if (!name && el.closest('label')) name = el.closest('label').textContent.trim();
      if (!name && el.title) name = el.title;
      if (!name) unnamed.push(el.outerHTML.slice(0, 120));
    });
    const landmarks = { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length, banner: document.querySelectorAll('header').length };
    return { hs, h1s, unnamed, landmarks, lang: document.documentElement.lang, title: document.title };
  });
  log('\n== ' + r + ' title="' + res.title + '" h1 count=' + res.h1s + ' main=' + res.landmarks.main);
  log('  headings: ' + res.hs.slice(0, 18).join(' > '));
  if (res.unnamed.length) log('  UNNAMED: ' + res.unnamed.join('\n     '));
  await c.close();
}

/* Accessible name snapshot of the sidebar and a card */
{
  const c = await browser.newContext(DESK); const p = await c.newPage();
  await go(p, INDEX + '?demo=1#/benefits');
  log('\ncard aria:\n' + (await p.locator('.bcard').first().ariaSnapshot()));
  log('\nsidebar aria:\n' + (await p.locator('#sidebar').ariaSnapshot()).slice(0, 1600));
  await c.close();
}

/* Dialogs: Share, Rate, Help, Lang, Edit answer, New chat confirm, Delete: Escape and focus return */
{
  const c = await browser.newContext(DESK); const p = await c.newPage();
  await go(p, INDEX + '?demo=1#/benefit/council-tax-student');
  await p.focus('.d-actions [data-act="share"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  log('\nshare dialog open, focus:', await active(p));
  await p.screenshot({ path: path.join(HERE, 'd-share.png') });
  // tab cycling inside dialog
  const seq = [];
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); seq.push(await active(p)); }
  log('tab inside share dialog:', seq.join(' | '));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  log('after Escape focus:', await active(p), 'dialogs open:', await p.locator('dialog[open]').count());
  // rate dialog
  await p.focus('[data-act="rate"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(HERE, 'd-rate.png') });
  log('rate dialog focus:', await active(p));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  log('after Escape focus:', await active(p));
  // account menu by keyboard
  await p.focus('#acct-btn');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  log('menu open focus:', await active(p));
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  log('menu after 3 down:', await active(p));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  log('help dialog focus:', await active(p), 'open:', await p.locator('dialog[open]').count());
  await p.screenshot({ path: path.join(HERE, 'd-help.png') });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  log('after Escape from help, focus:', await active(p));
  await c.close();
}
/* Phone drawer: Tab trap and Escape */
{
  const c = await browser.newContext(PHONE); const p = await c.newPage();
  await go(p, INDEX + '?demo=1#/benefits');
  await p.focus('.menu-btn');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  log('\ndrawer open focus:', await active(p));
  const seq = [];
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seq.push(await active(p)); }
  log('drawer tab sequence:', seq.join(' | '));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  log('after Escape focus:', await active(p));
  // Nav link in drawer: does choosing Benefits close the drawer and focus the h1?
  await p.click('.menu-btn');
  await p.waitForTimeout(300);
  await p.click('.sb-nav a[data-nav="community"]');
  await p.waitForTimeout(500);
  log('after nav from drawer: drawer open?', await p.evaluate(() => document.getElementById('app').classList.contains('drawer-open')), 'focus:', await active(p));
  await c.close();
}
/* Settings: edit answer dialog + delete confirm */
{
  const c = await browser.newContext(DESK); const p = await c.newPage();
  await go(p, INDEX + '?demo=1#/settings');
  await p.focus('[data-act="edit-answer"][data-q="status"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  log('\nedit status dialog focus:', await active(p));
  await p.screenshot({ path: path.join(HERE, 'd-edit-status.png') });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  log('after Escape:', await active(p));
  await p.focus('[data-act="delete-account"]');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  log('delete confirm focus:', await active(p));
  await p.screenshot({ path: path.join(HERE, 'd-delete.png') });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  log('after Escape:', await active(p));
  await c.close();
}
await browser.close();
