import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
const log = (k, v) => { out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
async function lastBot(page) { return page.evaluate(() => { const m = [...document.querySelectorAll('.msg.bot:not(.typing)')].pop(); return m ? { text: m.querySelector('.bot-text').innerText, cards: [...m.querySelectorAll('.ccard')].map(c => c.innerText.replace(/\n+/g, ' / ')), chips: [...m.querySelectorAll('.chip')].map(c => c.innerText), speak: !!m.querySelector('[data-act=speak]'), help: !!m.querySelector('[data-act=help-now]') } : null; }); }
async function send(page, text) {
  const n = await page.locator('.msg.bot:not(.typing)').count();
  await page.fill('#chat-input', text); await page.keyboard.press('Enter');
  await page.waitForFunction(n => document.querySelectorAll('.msg.bot:not(.typing)').length > n, n, { timeout: 5000 });
  await page.waitForTimeout(400);
}
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errs } = await open(browser, size, '?demo=1#/chat');
  const starters = await page.evaluate(() => [...document.querySelectorAll('.chip')].map(c => c.innerText));
  log(size + ' starters', starters);
  // click starter chip
  await page.click('.chip:has-text("What can I claim?")');
  await page.waitForFunction(() => document.querySelectorAll('.msg.bot:not(.typing)').length > 0, null, { timeout: 5000 });
  await page.waitForTimeout(500);
  log(size + ' claim reply', await lastBot(page));
  await page.screenshot({ path: SHOTS + 'chat-claim-' + size + '.png' });
  // suggestion chip
  await page.locator('.msg.bot:not(.typing)').last().locator('.chip').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.msg.bot:not(.typing)').length > 1, null, { timeout: 5000 });
  await page.waitForTimeout(500);
  log(size + ' suggestion reply', await lastBot(page));
  for (const q of ['Council tax as a student', 'What does no recourse to public funds mean?', 'Help with travel costs', 'Help with bills', 'railcard', 'universal credit', 'How does tracking work?', 'I am in danger', 'help with health costs', 'food bank', 'asdfgh']) {
    await send(page, q);
    log(size + ' Q[' + q + ']', await lastBot(page));
  }
  // read aloud
  const speakBtn = page.locator('.msg.bot [data-act=speak]').last();
  log(size + ' speak btn count', await page.locator('[data-act=speak]').count());
  if (await speakBtn.count()) {
    await speakBtn.click(); await page.waitForTimeout(200);
    log(size + ' speak pressed', await speakBtn.getAttribute('aria-pressed') + ' ' + await speakBtn.innerText());
    await speakBtn.click();
  }
  // mic
  await page.fill('#chat-input', '');
  await page.click('#composer .mic');
  await page.waitForTimeout(300);
  log(size + ' mic state', await page.evaluate(() => ({ pressed: document.querySelector('#composer .mic').getAttribute('aria-pressed'), listen: document.getElementById('listen').innerText, hidden: document.getElementById('listen').hidden })));
  await page.waitForTimeout(2600);
  log(size + ' mic after', await page.evaluate(() => ({ val: document.getElementById('chat-input').value, pressed: document.querySelector('#composer .mic').getAttribute('aria-pressed'), toast: document.getElementById('toast').innerText })));
  // help-now from urgent reply
  const help = page.locator('[data-act=help-now]').last();
  if (await help.count()) {
    await help.click(); await page.waitForTimeout(300);
    const dlg = await page.evaluate((D) => { const d = document.querySelector('dialog[open]'); return d ? { title: d.querySelector('.dlg-title').innerText, text: d.innerText.slice(0, 600), calls: [...d.querySelectorAll('a.call')].map(a => a.getAttribute('href') + ' ' + a.innerText).slice(0, 8), hasDisc: d.innerText.includes(D) } : null; }, DISC);
    log(size + ' help dialog', dlg);
    await page.screenshot({ path: SHOTS + 'help-dialog-' + size + '.png' });
    await page.keyboard.press('Escape');
  }
  // card track + share
  const card = page.locator('.ccard').filter({ hasText: '16-25 Railcard' }).first();
  if (await card.count()) {
    await card.locator('[data-act=track]').click(); await page.waitForTimeout(300);
    log(size + ' tracked after card track', await page.evaluate(() => PAPER.state.tracked.map(t => t.id)));
    await card.locator('[data-act=share]').click(); await page.waitForTimeout(400);
    const sh = await page.evaluate((D) => { const d = document.querySelector('dialog[open]'); return d ? { text: d.innerText, url: d.querySelector('#share-url')?.value, hasDisc: d.innerText.includes(D) } : null; }, DISC);
    log(size + ' share dialog', sh);
    await page.screenshot({ path: SHOTS + 'share-' + size + '.png' });
    await page.keyboard.press('Escape');
  }
  // scroll to a message with cards and check disclaimer visible in viewport
  const cardTop = await page.evaluate(() => { const c = document.querySelector('.ccard'); c.scrollIntoView({ block: 'center' }); return true; });
  await page.waitForTimeout(300);
  log(size + ' disc vis when card centered', await page.evaluate(() => { const d = document.querySelector('.dock-disc'); const r = d.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.bottom <= innerHeight + 1; }));
  // dock overlap measurement: dock height
  log(size + ' dock height', await page.evaluate(() => document.querySelector('.dock').getBoundingClientRect().height));
  log(size + ' errs', errs);
  await ctx.close();
}
console.log(out.join('\n'));
await browser.close();
