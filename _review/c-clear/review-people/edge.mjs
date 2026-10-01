/* Edge cases: unknown id, all skipped, nothing tracked, untrack last, double Send, typing while the bot writes,
   very long message, blocked storage, reduced motion. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1440, height: 900 } };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);

async function newPage(opts = {}, init) {
  const ctx = await browser.newContext({ ...(opts.size || PHONE), reducedMotion: opts.rm || 'no-preference' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page._errs = errs;
  return { ctx, page };
}

/* 1. Unknown benefit id and unknown route */
{
  const { ctx, page } = await newPage({ size: DESK });
  await page.goto(BASE + '?demo=1#/benefit/not-a-real-id', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  log('unknown id ->', await page.evaluate(() => location.hash), '| h1:', await page.locator('h1').first().innerText(), '| toast:', await page.locator('#toast').innerText());
  await page.screenshot({ path: OUT + 'edge-unknown-id-desktop.png' });
  await page.evaluate(() => { location.hash = '#/nowhere'; });
  await page.waitForTimeout(300);
  log('unknown route ->', await page.evaluate(() => location.hash));
  await page.evaluate(() => { location.hash = '#/benefits/not-a-category'; });
  await page.waitForTimeout(300);
  log('unknown category ->', await page.evaluate(() => location.hash));
  log('errors', page._errs);
  await ctx.close();
}

/* 2. Register, skip every question, benefits with no status */
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '?reset=1#/register', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#f-name', 'Sam');
  await page.fill('#f-email', 'sam@example.com');
  await page.fill('#f-pass', 'x');
  await page.click('#auth-form button[type=submit]');
  await page.waitForTimeout(300);
  log('after register ->', await page.evaluate(() => location.hash));
  await page.screenshot({ path: OUT + 'edge-q1-phone.png' });
  // press Continue without choosing
  await page.click('#q-form button[type=submit]');
  await page.waitForTimeout(150);
  log('continue with nothing chosen ->', await page.locator('#q-msg').innerText());
  await page.click('[data-action=q-skip-all]');
  await page.waitForTimeout(300);
  log('after skip all ->', await page.evaluate(() => location.hash));
  await page.click('[data-action=ack]');
  await page.waitForTimeout(300);
  log('after ack ->', await page.evaluate(() => location.hash));
  await page.screenshot({ path: OUT + 'edge-skipped-chat-phone.png' });
  const starters = await page.$$eval('.starter', els => els.map(e => e.innerText.trim()));
  log('starters with no answers:', starters);
  await page.evaluate(() => { location.hash = '#/benefits'; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + 'edge-skipped-benefits-phone.png' });
  log('benefits no status h1:', await page.locator('h1').innerText(), '| eyebrow:', await page.locator('.eyebrow').innerText());
  log('total shown:', await page.locator('.total').count() ? await page.locator('.total').innerText() : 'none');
  log('blocked btn:', await page.locator('[data-action=blocked-toggle]').count());
  // drawer empty state
  await page.click('[data-action=open-drawer]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + 'edge-empty-drawer-phone.png' });
  log('empty drawer text:', (await page.locator('#apps-list').innerText()).replace(/\s+/g, ' '));
  await page.keyboard.press('Escape');
  // chat reply with no status
  await page.evaluate(() => { location.hash = '#/chat'; });
  await page.waitForTimeout(300);
  await page.fill('#chat-input', 'What can I claim?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  log('no-status reply:', (await page.locator('.msg-bot .msg-body').last().innerText()).replace(/\s+/g, ' ').slice(0, 400));
  log('errors', page._errs);
  await ctx.close();
}

/* 3. Untrack the last tracked item (desktop, sidebar) */
{
  const { ctx, page } = await newPage({ size: DESK });
  await page.goto(BASE + '?demo=1#/benefit/council-tax-student', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('.track-big');
  await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = '#/benefit/uni-hardship-fund'; });
  await page.waitForTimeout(300);
  await page.locator('.track-big').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  log('after untrack last: focus=', await page.evaluate(() => (document.activeElement.innerText || document.activeElement.tagName).trim()), '| sidebar:', (await page.locator('#apps-list').innerText()).replace(/\s+/g, ' ').slice(0, 160), '| count pill:', await page.locator('.side-full [data-apps-count]').innerText());
  log('claim radios checked:', await page.$$eval('input[data-claim]:checked', e => e.length), '| stop-tracking hidden:', await page.locator('[data-untrack]').isHidden());
  await page.screenshot({ path: OUT + 'edge-untracked-desktop.png' });
  // setting a claim status re-tracks
  await page.check('input[data-claim][value="Applied"]');
  await page.waitForTimeout(200);
  log('after choosing Applied:', await page.locator('#claim-saved').innerText(), '| tracked count:', await page.locator('.side-full [data-apps-count]').innerText());
  log('errors', page._errs);
  await ctx.close();
}

/* 4. Rapid double click on Send, typing while the bot writes, very long message */
{
  const { ctx, page } = await newPage({ size: DESK });
  await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#chat-input', 'What can I claim?');
  await page.dblclick('.send-btn');
  await page.waitForTimeout(80);
  // type a second question straight away and press Enter while Landit is writing
  await page.fill('#chat-input', 'Help with travel costs');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('landit-c:state')).chat.map(m => m.who + ':' + (m.text || (m.r && m.r.paragraphs && m.r.paragraphs[0] || '').slice(0, 40))));
  log('double send + type-while-writing -> chat:', st, '| input now:', JSON.stringify(await page.inputValue('#chat-input')), '| me bubbles:', await page.locator('.msg-me').count());
  // long message
  const long = 'Please help '.repeat(250) + 'https://example.com/' + 'a'.repeat(400);
  await page.fill('#chat-input', long);
  const taH = await page.evaluate(() => document.getElementById('chat-input').getBoundingClientRect().height);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bubbleW: Math.round([...document.querySelectorAll('.msg-me')].pop().getBoundingClientRect().width), bubbleH: Math.round([...document.querySelectorAll('.msg-me')].pop().getBoundingClientRect().height) }));
  log('long msg: textarea h', Math.round(taH), JSON.stringify(ov), '| reply:', (await page.locator('.msg-bot .msg-body').last().innerText()).replace(/\s+/g, ' ').slice(0, 200));
  await page.screenshot({ path: OUT + 'edge-long-desktop.png' });
  log('errors', page._errs);
  await ctx.close();
}
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#chat-input', 'x'.repeat(1500));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  log('phone long unbroken msg overflow:', JSON.stringify(ov));
  await ctx.close();
}

/* 5. Blocked storage: every localStorage access throws */
{
  const init = () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); }, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); }, configurable: true });
  };
  const { ctx, page } = await newPage({}, init);
  await page.goto(BASE + '#/login', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  log('blocked storage login h1:', await page.locator('h1').first().innerText().catch(() => 'NONE'));
  await page.goto(BASE + '?demo=1#/benefits', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  log('blocked storage demo ->', await page.evaluate(() => location.hash), '| h1:', await page.locator('h1').first().innerText().catch(() => 'NONE'));
  await page.screenshot({ path: OUT + 'edge-blocked-storage-phone.png' });
  // register flow in memory
  await page.goto(BASE + '#/register', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#f-email', 'a@b.c');
  await page.click('#auth-form button[type=submit]');
  await page.waitForTimeout(300);
  await page.click('[data-action=q-skip-all]');
  await page.waitForTimeout(300);
  await page.click('[data-action=ack]');
  await page.waitForTimeout(300);
  log('blocked storage after register flow ->', await page.evaluate(() => location.hash));
  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForTimeout(300);
  await page.click('#theme-soft-dark', { force: true }).catch(e => log('theme click fail', e.message.split('\n')[0]));
  await page.waitForTimeout(200);
  log('blocked storage theme now:', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));
  log('errors', page._errs);
  await ctx.close();
}

/* 6. Reduced motion: no typing delay, no smooth scroll, drawer has no slide */
{
  const { ctx, page } = await newPage({ rm: 'reduce' });
  await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.fill('#chat-input', 'What can I claim?');
  await page.click('.send-btn');
  await page.waitForTimeout(60);
  log('reduced motion: bot replies within 60ms:', await page.locator('.msg-bot').count(), '| typing hidden:', await page.locator('#typing').isHidden());
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.side')).transitionDuration);
  log('reduced motion drawer transition:', tr);
  log('errors', page._errs);
  await ctx.close();
}
await browser.close();
