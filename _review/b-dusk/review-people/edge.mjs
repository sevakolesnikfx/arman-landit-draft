/* xlarge at 360, overflow checks, storage blocked, reduced motion, edge cases. */
import { chromium, open, shot, PAGE } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

const overflow = page => page.evaluate(() => {
  const W = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('[hidden], .sr-only, dialog:not([open]), [inert]')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = getComputedStyle(el);
    if (s.position === 'fixed' && el.closest('.sidebar')) return;
    if (r.right > W + 1 || r.left < -1) out.push((el.tagName + '.' + (el.className && el.className.baseVal === undefined ? el.className : '')).slice(0, 60) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
    // clipped text: scrollWidth > clientWidth with overflow hidden
    if ((s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && el.textContent.trim())
      out.push('CLIP ' + el.tagName + '.' + el.className + ' "' + el.textContent.trim().slice(0, 50) + '" ' + el.scrollWidth + '>' + el.clientWidth);
  });
  return { W, docW: document.documentElement.scrollWidth, items: [...new Set(out)].slice(0, 25) };
});

// 1. xlarge at 360
for (const [name, h] of [['chat', '/chat'], ['benefits', '/benefits'], ['benefit', '/benefit/railcard-16-25'], ['community', '/community'], ['settings', '/settings']]) {
  const { ctx, page } = await open(browser, 'narrow', 'demo=1&text=xlarge', h);
  await shot(page, `xl360-${name}`);
  const o = await overflow(page);
  console.log('xlarge360', name, JSON.stringify(o));
  if (name === 'benefits') {
    await page.evaluate(() => document.querySelector('.bf-tools').scrollIntoView()); await page.waitForTimeout(150); await shot(page, 'xl360-benefits-list');
    await page.evaluate(() => document.getElementById('blocked-toggle').scrollIntoView()); await page.waitForTimeout(150); await shot(page, 'xl360-benefits-blocked');
  }
  if (name === 'chat') { await page.click('#menu-btn'); await page.waitForTimeout(300); await shot(page, 'xl360-drawer'); }
  await ctx.close();
}
// xlarge 360 auth + questions
{
  const { ctx, page } = await open(browser, 'narrow', 'reset=1&text=xlarge', '/register');
  await shot(page, 'xl360-register');
  console.log('xlarge360 register', JSON.stringify(await overflow(page)));
  await page.fill('#reg-email', 'x@y.z'); await page.click('#auth-submit'); await page.waitForTimeout(400);
  await shot(page, 'xl360-questions');
  console.log('xlarge360 questions', JSON.stringify(await overflow(page)));
  await ctx.close();
}

// 2. storage blocked
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    const thrower = { get() { throw new DOMException('blocked', 'SecurityError'); } };
    Object.defineProperty(window, 'localStorage', thrower);
    Object.defineProperty(window, 'sessionStorage', thrower);
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(PAGE + '#/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const h1 = await page.locator('h1').first().innerText().catch(() => 'NO H1');
  await shot(page, 'storage-blocked-register');
  await page.fill('#reg-email', 'x@y.z'); await page.click('#auth-submit'); await page.waitForTimeout(400);
  await page.click('#q-skip-all'); await page.waitForTimeout(300);
  await page.click('#ack-btn'); await page.waitForTimeout(400);
  const hash = await page.evaluate(() => location.hash);
  await page.fill('#chat-input', 'What can I claim?'); await page.press('#chat-input', 'Enter'); await page.waitForTimeout(1800);
  const bots = await page.locator('.msg-bot:not(.typing)').count();
  await shot(page, 'storage-blocked-chat');
  console.log('storage blocked:', { h1, hash, bots, errs });
  // with demo
  const p2 = await ctx.newPage(); const e2 = [];
  p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(PAGE + '?demo=1#/benefits', { waitUntil: 'networkidle' }); await p2.waitForTimeout(400);
  console.log('storage blocked demo benefits rows:', await p2.locator('.brow').count(), e2);
  await ctx.close();
}

// 3. reduced motion
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '/chat', { reducedMotion: 'reduce' });
  const before = await page.locator('.msg').count();
  await page.fill('#chat-input', 'Help with bills');
  await page.press('#chat-input', 'Enter');
  await page.waitForTimeout(100);
  const after = await page.locator('.msg-bot:not(.typing)').count();
  const typing = await page.locator('#typing').count();
  const anim = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return (parseFloat(s.animationDuration) > 0.01 && s.animationName !== 'none') || parseFloat(s.transitionDuration) > 0.01; });
    return els.slice(0, 5).map(e => e.className.toString().slice(0, 40));
  });
  await page.click('#menu-btn'); await page.waitForTimeout(50);
  await shot(page, 'reduced-motion-drawer-50ms');
  console.log('reduced motion:', { before, afterBots: after, typing, longAnims: anim });
  await ctx.close();
}

// 4. unknown benefit id
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errors } = await open(browser, size, 'demo=1', '/benefit/no-such-thing');
  await shot(page, `${size}-unknown-benefit`);
  console.log('unknown id', size, await page.evaluate(() => ({ title: document.title, h: (document.getElementById('bp-title') || {}).textContent, focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName) })), errors);
  await ctx.close();
}
// unknown route
{
  const { ctx, page } = await open(browser, 'phone', 'demo=1', '/nonsense');
  console.log('unknown route ->', await page.evaluate(() => location.hash));
  await ctx.close();
}

// 5. nothing tracked, untrack the last item
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '/benefit/uni-hardship-fund');
  // untrack both demo items
  await page.evaluate(() => { window.DUSK.untrack('council-tax-student'); });
  await page.waitForTimeout(200);
  const btn = page.locator('.bp-actions [data-action="track"]');
  await btn.click();
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ tracked: window.DUSK.state.tracked.length, sidebar: document.getElementById('sidebar').innerText.replace(/\s+/g, ' ').slice(0, 200), focus: document.activeElement && (document.activeElement.id || document.activeElement.className), claimChecked: [...document.querySelectorAll('input[data-action="claim"]')].filter(x => x.checked).map(x => x.value), hint: (document.getElementById('claim-hint') || {}).textContent, toast: document.getElementById('toast').innerText }));
  console.log('untrack last', size, JSON.stringify(st));
  if (size === 'phone') { await page.click('#menu-btn'); await page.waitForTimeout(300); }
  await shot(page, `${size}-untracked-sidebar`);
  await ctx.close();
}

// 6. untrack from the sidebar? (look for a control)
{
  const { ctx, page } = await open(browser, 'desktop', 'demo=1', '/chat');
  await page.click('#trk-btn-uni-hardship-fund');
  const ctrls = await page.evaluate(() => [...document.querySelectorAll('#trk-body-uni-hardship-fund a, #trk-body-uni-hardship-fund button')].map(e => e.innerText.trim()));
  console.log('sidebar row controls:', ctrls);
  await ctx.close();
}

// 7. rapid double Send, long message
{
  const { ctx, page } = await open(browser, 'phone', 'reset=1', '/register');
  await page.fill('#reg-email', 'x@y.z'); await page.click('#auth-submit'); await page.waitForTimeout(300);
  await page.click('#q-skip-all'); await page.waitForTimeout(300); await page.click('#ack-btn'); await page.waitForTimeout(400);
  await page.fill('#chat-input', 'What can I claim?');
  await page.click('#send-btn'); await page.click('#send-btn', { force: true });
  await page.waitForTimeout(1800);
  const c1 = await page.evaluate(() => ({ user: document.querySelectorAll('.msg-user').length, bot: document.querySelectorAll('.msg-bot:not(.typing)').length }));
  // type while busy then press send twice quickly
  await page.fill('#chat-input', 'Help with bills');
  await page.press('#chat-input', 'Enter');
  await page.fill('#chat-input', 'Help with travel costs');
  await page.press('#chat-input', 'Enter');
  await page.waitForTimeout(100);
  const lost = await page.evaluate(() => ({ inputValue: document.getElementById('chat-input').value, user: document.querySelectorAll('.msg-user').length }));
  await page.waitForTimeout(1800);
  const c2 = await page.evaluate(() => ({ user: document.querySelectorAll('.msg-user').length, bot: document.querySelectorAll('.msg-bot:not(.typing)').length }));
  // tap a starter/chip twice quickly
  const chips = page.locator('.msg-bot:not(.typing)').last().locator('.chip');
  if (await chips.count()) { await chips.first().click(); await chips.first().click({ force: true }).catch(() => {}); }
  await page.waitForTimeout(1800);
  const c3 = await page.evaluate(() => ({ user: document.querySelectorAll('.msg-user').length, bot: document.querySelectorAll('.msg-bot:not(.typing)').length }));
  console.log('double send:', c1, 'second while busy:', lost, c2, 'chip x2:', c3);
  const long = 'I came to the UK last year with my family and I am not sure what help there is for us. '.repeat(25) + 'Supercalifragilisticexpialidocious'.repeat(8);
  await page.fill('#chat-input', long);
  await page.waitForTimeout(200);
  const ta = await page.evaluate(() => { const t = document.getElementById('chat-input'); const r = t.getBoundingClientRect(); return { h: Math.round(r.height), scrollH: t.scrollHeight, overflowY: getComputedStyle(t).overflowY }; });
  await shot(page, 'long-message-typing');
  await page.press('#chat-input', 'Enter');
  await page.waitForTimeout(1800);
  const o = await overflow(page);
  const bubble = await page.evaluate(() => { const b = [...document.querySelectorAll('.msg-user .bubble')].pop(); const r = b.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), sw: b.scrollWidth, cw: b.clientWidth }; });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.msg-user')].pop(); b.scrollIntoView(); });
  await shot(page, 'long-message-sent');
  console.log('long message:', ta, bubble, JSON.stringify(o));
  await ctx.close();
}
await browser.close();
