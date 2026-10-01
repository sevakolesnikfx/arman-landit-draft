/* People-lens review: walk the flows and edge cases, screenshot viewports. */
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
    try { await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(400); if (await p.locator('#root *').count()) return; } catch (e) {}
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

/* 1. Phone: benefits scrolled to first cards; groups order */
{
  const { c, p } = await open(PHONE, INDEX + '?demo=1#/benefits');
  const firstCardTop = await p.evaluate(() => { const e = document.querySelector('.bcard'); return e ? Math.round(e.getBoundingClientRect().top) : null; });
  log('phone benefits: first card top y =', firstCardTop, 'viewport h 844');
  const groups = await p.evaluate(() => Array.from(document.querySelectorAll('.cat-group')).map(g => g.querySelector('.group-h').textContent.trim() + ': ' + Array.from(g.querySelectorAll('.bcard')).map(b => b.querySelector('.bcard-name').textContent.trim() + ' [' + (b.querySelector('.val-amt') ? b.querySelector('.val-amt').textContent : (b.querySelector('.val-text,.val-none') || {}).textContent) + ']').join(', ')));
  log('groups in order (sort=value):\n  ' + groups.join('\n  '));
  const notListed = await p.evaluate(() => Array.from(document.querySelectorAll('.fact')).filter(f => /Not listed/.test(f.textContent)).length);
  const facts = await p.evaluate(() => document.querySelectorAll('.fact').length);
  log('visible Not listed pills:', notListed, 'of', facts, 'fact pills');
  await p.evaluate(() => window.scrollTo(0, 844));
  await p.waitForTimeout(200);
  await shot(p, 'p-benefits-2');
  await p.evaluate(() => window.scrollTo(0, 1688));
  await p.waitForTimeout(200);
  await shot(p, 'p-benefits-3');
  // blocked open
  await p.evaluate(() => { const d = document.getElementById('blocked'); d.open = true; d.scrollIntoView(); });
  await p.waitForTimeout(200);
  await shot(p, 'p-blocked');
  await c.close();
}
/* 2. Phone drawer + account menu */
{
  const { c, p } = await open(PHONE, INDEX + '?demo=1#/chat');
  await p.click('.menu-btn');
  await p.waitForTimeout(400);
  await shot(p, 'p-drawer');
  await p.click('.trk-btn >> nth=0');
  await p.waitForTimeout(300);
  await shot(p, 'p-drawer-expanded');
  await p.click('#acct-btn');
  await p.waitForTimeout(300);
  await shot(p, 'p-acct-menu');
  await c.close();
}
/* 3. Desktop: tracked expanded, collapsed rail, account menu */
{
  const { c, p } = await open(DESK, INDEX + '?demo=1#/chat');
  await p.click('.trk-btn >> nth=0');
  await p.waitForTimeout(300);
  await shot(p, 'd-tracked-expanded');
  await p.click('#acct-btn');
  await p.waitForTimeout(300);
  await shot(p, 'd-acct-menu');
  await p.keyboard.press('Escape');
  await p.click('.sb-collapse');
  await p.waitForTimeout(400);
  await shot(p, 'd-rail');
  await p.click('.sb-collapse');
  await c.close();
}
/* 4. Chat conversation at phone: ask a starter, look at the reply */
{
  const { c, p, errs } = await open(PHONE, INDEX + '?demo=1#/chat');
  await p.click('.chip >> nth=0');
  await p.waitForTimeout(1800);
  await shot(p, 'p-chat-reply');
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, 'p-chat-reply-top');
  const txt = await p.evaluate(() => Array.from(document.querySelectorAll('.msg.bot .bot-text p')).map(x => x.textContent));
  log('bot reply paragraphs:', JSON.stringify(txt));
  // rapid double clicks on send
  await p.fill('#chat-input', 'Help with bills');
  await p.evaluate(() => { const b = document.querySelector('#composer .send'); b.click(); b.click(); b.click(); });
  await p.waitForTimeout(1800);
  const counts = await p.evaluate(() => ({ user: document.querySelectorAll('.msg.user').length, bot: document.querySelectorAll('.msg.bot:not(.typing)').length }));
  log('after triple send click: ', JSON.stringify(counts));
  // Enter pressed twice quickly
  await p.fill('#chat-input', 'What can I claim?');
  await p.press('#chat-input', 'Enter'); await p.press('#chat-input', 'Enter');
  await p.waitForTimeout(1800);
  const counts2 = await p.evaluate(() => ({ user: document.querySelectorAll('.msg.user').length, bot: document.querySelectorAll('.msg.bot:not(.typing)').length }));
  log('after double Enter: ', JSON.stringify(counts2));
  // very long message
  const long = 'I would like to know '.repeat(60) + 'Supercalifragilisticexpialidocious_no_spaces_' + 'x'.repeat(200);
  await p.fill('#chat-input', long);
  await p.waitForTimeout(200);
  const ta = await p.evaluate(() => { const t = document.getElementById('chat-input'); return { h: t.offsetHeight, sh: t.scrollHeight }; });
  log('textarea with long text:', JSON.stringify(ta));
  await shot(p, 'p-chat-longdraft');
  await p.press('#chat-input', 'Enter');
  await p.waitForTimeout(2000);
  const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, bubbleW: Math.round(Array.from(document.querySelectorAll('.msg.user .bubble')).pop().getBoundingClientRect().width) }));
  log('after long message overflow:', JSON.stringify(ov));
  await shot(p, 'p-chat-long');
  // chips during busy
  log('errors:', errs.join(' | ') || 'none');
  await c.close();
}
/* 5. Questions: skip all, then benefits without a status */
{
  const { c, p, errs } = await open(PHONE, INDEX + '?reset=1#/register');
  await p.fill('#reg-name', 'Ola');
  await p.fill('#reg-email', 'ola@example.com');
  await p.fill('#reg-pass', 'x');
  await p.click('button[type=submit]');
  await p.waitForTimeout(500);
  const skipY = await p.evaluate(() => { const b = document.querySelector('[data-act="q-skip"]'); return Math.round(b.getBoundingClientRect().top); });
  const contY = await p.evaluate(() => { const b = document.getElementById('q-next'); return Math.round(b.getBoundingClientRect().top); });
  log('Q1 phone: Continue at y=', contY, ' Skip this question at y=', skipY, '(viewport 844)');
  await p.click('[data-act="q-skip-all"]');
  await p.waitForTimeout(500);
  log('after skip all, route =', await p.evaluate(() => location.hash));
  await p.click('[data-act="ack"]');
  await p.waitForTimeout(500);
  log('after ack, route =', await p.evaluate(() => location.hash));
  await shot(p, 'p-chat-new-user');
  const starters = await p.evaluate(() => Array.from(document.querySelectorAll('.chip')).map(c => c.textContent));
  log('starters with no answers:', JSON.stringify(starters));
  await p.click('.menu-btn');
  await p.waitForTimeout(400);
  await shot(p, 'p-drawer-empty');
  await p.click('.sb-nav a[data-nav="benefits"]');
  await p.waitForTimeout(500);
  await shot(p, 'p-benefits-nostatus');
  const h = await p.evaluate(() => document.querySelector('h1').textContent);
  log('no-status benefits h1:', h);
  log('errors:', errs.join(' | ') || 'none');
  await c.close();
}
/* 6. Unknown benefit id */
{
  const { c, p, errs } = await open(PHONE, INDEX + '?demo=1#/benefit/does-not-exist');
  await shot(p, 'p-unknown-benefit');
  log('unknown id title:', await p.title(), 'errors:', errs.join('|') || 'none');
  await c.close();
}
/* 7. Untrack the last item (desktop) */
{
  const { c, p, errs } = await open(DESK, INDEX + '?demo=1#/benefit/uni-hardship-fund');
  await p.click('.d-actions [data-act="track"]');
  await p.waitForTimeout(300);
  await go(p, INDEX + '#/benefit/council-tax-student');
  await p.click('.d-actions [data-act="track"]');
  await p.waitForTimeout(500);
  await shot(p, 'd-untracked-all');
  const sb = await p.evaluate(() => document.getElementById('trk-list').innerText);
  const claim = await p.evaluate(() => Array.from(document.querySelectorAll('input[name=claim]')).map(i => i.value + ':' + i.checked).join(', '));
  const focus = await p.evaluate(() => document.activeElement && (document.activeElement.outerHTML || '').slice(0, 120));
  log('sidebar after untracking all:', JSON.stringify(sb));
  log('claim radios after untrack:', claim);
  log('focus after untrack:', focus);
  log('errors:', errs.join('|') || 'none');
  await c.close();
}
await browser.close();
