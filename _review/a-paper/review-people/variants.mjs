/* People-lens review: RTL, themes, text size at 360px, reduced motion, storage blocked. */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../../a-paper/index.html')).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESK = { viewport: { width: 1440, height: 900 } };
const log = (...a) => console.log(...a);
async function go(p, url) {
  for (let i = 0; i < 3; i++) {
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(500); if (await p.locator('#root *').count()) return; } catch (e) {}
    await p.waitForTimeout(800);
  }
}
async function open(dev, url, init) {
  const c = await browser.newContext(dev);
  if (init) await c.addInitScript(init);
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await go(p, url);
  return { c, p, errs };
}
const shot = (p, n) => p.screenshot({ path: path.join(HERE, n + '.png') });
const overflow = p => p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('[hidden]') || el.closest('.chip-scroll') || el.closest('.sr-only') || el.classList.contains('skip-link')) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' && el.closest('.sb')) return;
    if (r.right > vw + 1 || r.left < -1) bad.push(el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + '] "' + (el.textContent || '').trim().slice(0, 30) + '"');
    // text clipped inside its box
    if ((s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0) bad.push('CLIPPED ' + el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') + ' "' + el.textContent.trim().slice(0, 40) + '"');
  });
  return { sw: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 15) };
});

/* RTL Arabic, phone and desktop */
for (const [n, dev] of [['p', PHONE], ['d', DESK]]) {
  for (const r of ['chat', 'benefits', 'benefit/council-tax-student', 'settings', 'community']) {
    const { c, p, errs } = await open(dev, INDEX + '?demo=1&lang=ar#/' + r);
    const info = await p.evaluate(() => {
      const sb = document.getElementById('sidebar'); const main = document.getElementById('main');
      const back = document.querySelector('.back-link svg');
      return { dir: document.documentElement.dir, lang: document.documentElement.lang,
        sbLeft: sb ? Math.round(sb.getBoundingClientRect().left) : null, mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
        backFlip: back ? getComputedStyle(back).transform : null,
        navText: Array.from(document.querySelectorAll('.sb-nav a')).map(a => a.textContent.trim()).join(' / '),
        h1: (document.querySelector('h1') || {}).textContent };
    });
    const ov = await overflow(p);
    log('ar ' + n + ' ' + r + ': ' + JSON.stringify(info) + ' overflow sw=' + ov.sw + ' vw=' + ov.vw + (ov.bad.length ? '\n   ' + ov.bad.join('\n   ') : '') + (errs.length ? ' ERR ' + errs.join('|') : ''));
    await shot(p, 'ar-' + n + '-' + r.replace(/\//g, '_'));
    if (n === 'p' && r === 'chat') {
      await p.click('.menu-btn'); await p.waitForTimeout(400); await shot(p, 'ar-p-drawer');
    }
    await c.close();
  }
}
/* Every theme at phone: benefits + detail + chat */
for (const t of ['paper', 'sage', 'mist', 'evening']) {
  for (const r of ['benefits', 'benefit/council-tax-student', 'chat']) {
    const { c, p } = await open(PHONE, INDEX + '?demo=1&theme=' + t + '#/' + r);
    if (r === 'benefits') await p.evaluate(() => window.scrollTo(0, 700));
    if (r.startsWith('benefit/')) await p.evaluate(() => window.scrollTo(0, 500));
    await p.waitForTimeout(200);
    await shot(p, 'theme-' + t + '-' + r.replace(/\//g, '_'));
    await c.close();
  }
}
/* Text xlarge at 360 wide */
const XL = { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
for (const r of ['?reset=1&text=xlarge#/login', '?reset=1&text=xlarge#/questions', '?demo=1&text=xlarge#/chat', '?demo=1&text=xlarge#/benefits', '?demo=1&text=xlarge#/benefit/council-tax-student', '?demo=1&text=xlarge#/community', '?demo=1&text=xlarge#/community/ratings', '?demo=1&text=xlarge#/settings']) {
  const { c, p, errs } = await open(XL, INDEX + r);
  const ov = await overflow(p);
  const name = 'xl360-' + r.split('#/')[1].replace(/\//g, '_');
  log('xl360 ' + r + ': sw=' + ov.sw + ' vw=' + ov.vw + (ov.bad.length ? '\n   ' + ov.bad.join('\n   ') : '') + (errs.length ? ' ERR ' + errs.join('|') : ''));
  await shot(p, name);
  if (r.includes('benefits')) {
    await p.evaluate(() => window.scrollTo(0, 1100)); await p.waitForTimeout(200); await shot(p, name + '-2');
  }
  if (r.includes('settings')) {
    await p.evaluate(() => document.getElementById('s-prefs').scrollIntoView()); await p.waitForTimeout(200); await shot(p, name + '-prefs');
  }
  if (r.includes('chat')) {
    await p.click('.menu-btn'); await p.waitForTimeout(400); await shot(p, name + '-drawer');
  }
  await c.close();
}
/* Reduced motion */
{
  const { c, p, errs } = await open({ ...PHONE, reducedMotion: 'reduce' }, INDEX + '?demo=1#/chat');
  await p.click('.chip >> nth=1');
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => ({ bots: document.querySelectorAll('.msg.bot').length, typing: !!document.getElementById('typing'),
    anims: Array.from(document.querySelectorAll('*')).filter(el => { const s = getComputedStyle(el); return (parseFloat(s.animationDuration) > 0.02 && s.animationName !== 'none') || parseFloat(s.transitionDuration) > 0.05; }).length }));
  log('reduced motion:', JSON.stringify(r), errs.join('|') || 'no errors');
  await c.close();
}
/* Storage blocked */
{
  const init = () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); };
  const { c, p, errs } = await open(PHONE, INDEX + '?reset=1#/register', init);
  const has = await p.evaluate(() => !!document.querySelector('#reg-name'));
  await p.fill('#reg-name', 'Bo'); await p.fill('#reg-email', 'bo@example.com'); await p.fill('#reg-pass', 'x');
  await p.click('button[type=submit]'); await p.waitForTimeout(500);
  const route1 = await p.evaluate(() => location.hash);
  await p.click('[data-act="q-skip-all"]'); await p.waitForTimeout(400);
  await p.click('[data-act="ack"]'); await p.waitForTimeout(400);
  const route2 = await p.evaluate(() => location.hash);
  await p.click('.chip >> nth=0'); await p.waitForTimeout(1600);
  const bots = await p.evaluate(() => document.querySelectorAll('.msg.bot').length);
  await shot(p, 'nostorage-chat');
  // reload: what happens?
  await p.reload(); await p.waitForTimeout(600);
  const afterReload = await p.evaluate(() => location.hash + ' ' + (document.querySelector('h1,h2') || {}).textContent);
  log('storage blocked: register rendered=' + has + ' after register=' + route1 + ' after ack=' + route2 + ' bot replies=' + bots + ' after reload=' + afterReload + ' errors=' + (errs.join('|') || 'none'));
  await c.close();
  const o2 = await open(DESK, INDEX + '?demo=1#/benefits', init);
  log('storage blocked demo benefits h1:', await o2.p.evaluate(() => (document.querySelector('h1') || {}).textContent), o2.errs.join('|') || 'no errors');
  await shot(o2.p, 'nostorage-benefits-d');
  await o2.c.close();
}
await browser.close();
