/* People-lens review, pass 1: viewport screenshots of every route. */
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

async function go(p, url) {
  for (let i = 0; i < 3; i++) {
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(500); if (await p.locator('#root *').count()) return; } catch (e) {}
    await p.waitForTimeout(800);
  }
}
const errsAll = [];
async function shoot(ctxOpts, name, url, before) {
  const c = await browser.newContext(ctxOpts);
  const p = await c.newPage();
  p.on('pageerror', e => errsAll.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errsAll.push(name + ' console: ' + m.text()); });
  await go(p, INDEX + '?reset=1#/login');
  await go(p, url);
  if (before) await before(p);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(HERE, name + '.png') });
  await c.close();
}
const routes = [
  ['login', '?reset=1#/login'],
  ['register', '#/register'],
  ['questions', '#/questions'],
  ['ack', '#/ack'],
  ['chat', '?demo=1#/chat'],
  ['benefits', '?demo=1#/benefits'],
  ['benefit', '?demo=1#/benefit/' + 'student-railcard'],
  ['community', '?demo=1#/community'],
  ['ratings', '?demo=1#/community/ratings'],
  ['settings', '?demo=1#/settings'],
];
// find a real benefit id
{
  const c = await browser.newContext(DESK); const p = await c.newPage();
  await go(p, INDEX + '?demo=1#/benefits');
  const href = await p.locator('.bcard a.stretch').first().getAttribute('href');
  routes[6][1] = '?demo=1' + href;
  console.log('first card', href);
  await c.close();
}
for (const [n, u] of routes) {
  await shoot(PHONE, 'p-' + n, INDEX + u);
  await shoot(DESK, 'd-' + n, INDEX + u);
}
console.log(errsAll.join('\n') || 'no errors');
await browser.close();
