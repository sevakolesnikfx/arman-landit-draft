import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size);
  const log = (...a) => console.log(`[${size}]`, ...a);
  log('speech', await page.evaluate(() => ({ synth: 'speechSynthesis' in window, rec: !!(window.SpeechRecognition || window.webkitSpeechRecognition), canRead: window.DUSK.canRead() })));
  log('seeded msgs', await page.locator('.msg').count(), 'read btns', await page.locator('.msg .read-btn').count(), 'chips', await page.locator('.chip').count());
  log('composer note is disclaimer', await page.evaluate(() => document.querySelector('.composer-note').textContent === window.LANDIT.disclaimer));
  const noteBox = await page.locator('.composer-note').boundingBox();
  log('composer note box', noteBox, 'font', await page.evaluate(() => getComputedStyle(document.querySelector('.composer-note')).fontSize));
  await page.shot('chat-seeded');
  // Ask council tax question
  await page.fill('#chat-input', 'Council tax as a student');
  await page.press('#chat-input', 'Enter');
  await page.waitForFunction(() => !document.getElementById('typing') && document.querySelectorAll('.msg-bot').length >= 2, null, { timeout: 5000 });
  const cards = await page.evaluate(() => [...document.querySelectorAll('.msg-bot')].pop().querySelectorAll('.bcard').length);
  const cardTexts = await page.evaluate(() => [...[...document.querySelectorAll('.msg-bot')].pop().querySelectorAll('.bcard')].map(c => c.innerText.replace(/\n+/g, ' | ')));
  log('council tax cards', cards, cardTexts);
  await page.shot('chat-counciltax');
  // Click track on the CTR card
  const ctrTrack = page.locator('.bcard [data-track="council-tax-reduction"]').last();
  if (await ctrTrack.count()) {
    await ctrTrack.click();
    log('tracked blocked CTR from chat?', await page.evaluate(() => window.DUSK.isTracked('council-tax-reduction')));
    const sb = await page.evaluate(() => document.getElementById('sidebar').innerText.includes('Council Tax Reduction'));
    log('CTR in sidebar', sb);
  }
  // Suggested reply chip
  const chip = page.locator('.msg-bot').last().locator('.chip').first();
  const chipText = await chip.innerText();
  await chip.click();
  await page.waitForFunction(n => document.querySelectorAll('.msg-bot:not(.typing)').length > n, 2, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1600);
  log('chip sent:', chipText, 'last user msg:', await page.locator('.msg-user').last().innerText());
  // read aloud click
  const rb = page.locator('.msg-bot').last().locator('.read-btn');
  if (await rb.count()) { await rb.click(); await page.waitForTimeout(200); log('read btn after click', await rb.innerText(), await rb.getAttribute('aria-pressed')); await rb.click(); }
  // mic
  await page.click('#mic-btn');
  await page.waitForTimeout(300);
  log('listening line', await page.evaluate(() => { const l = document.getElementById('listening'); return { hidden: l.hidden, text: l.innerText }; }), 'mic pressed', await page.getAttribute('#mic-btn', 'aria-pressed'));
  await page.waitForTimeout(2500);
  log('input after voice', await page.inputValue('#chat-input'));
  // mic button size
  for (const sel of ['#mic-btn', '#send-btn', '.msg .read-btn', '.chip', '.bcard .btn', '#menu-btn', '#avatar-btn', '#collapse-btn']) {
    const bx = await page.locator(sel).first().boundingBox().catch(() => null);
    log('size', sel, bx && Math.round(bx.width) + 'x' + Math.round(bx.height));
  }
  // Danger -> help now
  await page.fill('#chat-input', 'I am in danger');
  await page.press('#chat-input', 'Enter');
  await page.waitForTimeout(1700);
  log('help-now button', await page.locator('[data-action="help-now"]').count());
  // Share from chat card
  await page.locator('.bcard [data-action="share"]').first().click();
  await page.waitForTimeout(400);
  log('share dialog', await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.innerText.replace(/\n+/g, ' | '); }), await page.inputValue('#share-link').catch(() => null));
  log('dialog has disclaimer', await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.textContent.includes(window.LANDIT.disclaimer); }));
  await page.shot('chat-share');
  await page.keyboard.press('Escape');
  // Is there a "New chat" / clear chat option?
  log('new chat control', await page.evaluate(() => [...document.querySelectorAll('button,a')].filter(b => /new chat|clear chat|start again/i.test(b.innerText + (b.getAttribute('aria-label') || ''))).map(b => b.innerText || b.getAttribute('aria-label'))));
  log('errors', page.errs);
  await ctx.close();
}
await browser.close();
