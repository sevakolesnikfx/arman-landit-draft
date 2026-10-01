import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
const log = (k, v) => { out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errs } = await open(browser, size, '?reset=1');
  log(size + ' start hash', await page.evaluate(() => location.hash));
  await page.fill('#reg-name', 'Test Person');
  await page.fill('#reg-email', 'test@example.com');
  await page.fill('#reg-pass', 'x');
  await page.click('form[data-form="register"] button[type=submit]');
  await page.waitForTimeout(400);
  log(size + ' after register', await page.evaluate(() => location.hash));
  await page.screenshot({ path: SHOTS + 'q1-' + size + '.png' });
  const q1 = await page.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, count: document.querySelector('.q-count')?.innerText, next: document.getElementById('q-next')?.disabled, buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean), opts: document.querySelectorAll('.opt').length, focus: document.activeElement?.tagName + '.' + document.activeElement?.className }));
  log(size + ' q1', q1);
  // skip q1
  await page.click('text=Skip this question');
  await page.waitForTimeout(300);
  log(size + ' after skip', await page.evaluate(() => location.hash + ' ' + document.querySelector('h1')?.innerText));
  // answer q2: England
  await page.click('.opt:has-text("England")');
  await page.click('#q-next');
  await page.waitForTimeout(300);
  log(size + ' after answer', await page.evaluate(() => location.hash + ' ' + document.querySelector('h1')?.innerText));
  // back button test
  await page.click('a:has-text("Back")');
  await page.waitForTimeout(300);
  log(size + ' back', await page.evaluate(() => location.hash + ' checked=' + document.querySelector('input[name=answer]:checked')?.value));
  await page.click('#q-next'); await page.waitForTimeout(300);
  // skip all
  await page.click('text=Skip all');
  await page.waitForTimeout(300);
  log(size + ' after skip all', await page.evaluate(() => location.hash));
  log(size + ' profile', await page.evaluate(() => PAPER.state.profile));
  const ack = await page.evaluate((D) => ({ text: document.body.innerText.includes(D), btn: [...document.querySelectorAll('button')].map(b => b.innerText) }), DISC);
  log(size + ' ack', ack);
  await page.screenshot({ path: SHOTS + 'ack-' + size + '.png' });
  await page.click('[data-act="ack"]');
  await page.waitForTimeout(500);
  log(size + ' after ack', await page.evaluate(() => location.hash));
  await page.screenshot({ path: SHOTS + 'chat-empty-' + size + '.png' });
  const chatEmpty = await page.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, chips: [...document.querySelectorAll('.chip')].map(c => c.innerText), disc: document.querySelector('.dock-disc')?.innerText, dockPos: getComputedStyle(document.querySelector('.dock')).position }));
  log(size + ' chat empty', chatEmpty);
  // type a message
  await page.fill('#chat-input', 'What can I claim?');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.msg.bot:not(.typing)', { timeout: 5000 });
  await page.waitForTimeout(600);
  const r1 = await page.evaluate(() => { const m = [...document.querySelectorAll('.msg.bot')].pop(); return { text: m.innerText, cards: m.querySelectorAll('.ccard').length, chips: [...m.querySelectorAll('.chip')].map(c => c.innerText) }; });
  log(size + ' reply no-status', r1);
  await page.screenshot({ path: SHOTS + 'chat-r1-' + size + '.png' });
  // disclaimer visible in viewport?
  const discVis = await page.evaluate(() => { const d = document.querySelector('.dock-disc'); const r = d.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight, visible: r.top < innerHeight && r.bottom > 0, h: r.height }; });
  log(size + ' dock disc rect', discVis);
  log(size + ' errs', errs);
  await ctx.close();
}
console.log(out.join('\n'));
await browser.close();
