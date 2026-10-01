import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'reset=1', '');
  const log = (...a) => console.log(`[${size}]`, ...a);
  log('hash', await page.evaluate(() => location.hash), 'h1', await page.locator('h1').first().innerText());
  await page.shot('register');
  // empty submit
  await page.click('#auth-submit');
  await page.waitForTimeout(300);
  log('empty register goes to', await page.evaluate(() => location.hash), 'user', await page.evaluate(() => JSON.stringify(window.DUSK.state.user)));
  if (await page.evaluate(() => location.hash) !== '#/questions') { await page.fill('#reg-name', 'Test'); await page.click('#auth-submit'); }
  await page.waitForTimeout(300);
  await page.shot('questions-top');
  log('q cards', await page.locator('.q-card').count(), 'skip btns', await page.locator('[data-action="q-skip"]').count());
  await page.click('label[for="q-status-worker"]');
  await page.click('#qskip-nation');
  await page.waitForTimeout(150);
  log('nation card', (await page.locator('#qc-nation').innerText()).replace(/\n+/g, ' | '));
  log('progress', (await page.locator('#q-progress').innerText()).replace(/\n+/g, ' | '));
  const skipAllBox = await page.locator('#q-skip-all').boundingBox();
  log('skip all box', skipAllBox, 'visible in viewport', skipAllBox && skipAllBox.y + skipAllBox.height <= (size === 'phone' ? 844 : 900));
  await page.click('#q-skip-all');
  await page.waitForTimeout(300);
  log('after skip all hash', await page.evaluate(() => location.hash), 'profile', await page.evaluate(() => JSON.stringify(window.DUSK.state.profile)));
  await page.shot('ack');
  log('ack text', (await page.locator('main').innerText()).replace(/\n+/g, ' | '));
  await page.click('#ack-btn');
  await page.waitForTimeout(400);
  log('chat empty', (await page.locator('#chat-log').innerText()).replace(/\n+/g, ' | '));
  await page.shot('chat-empty-new');
  // Benefits for this user
  await page.go('#/benefits');
  log('benefits head', (await page.locator('.bf-head').innerText()).replace(/\n+/g, ' | '));
  await ctx.close();
}
// Fully skip-all user
{
  const { ctx, page } = await open(browser, 'desktop', 'reset=1', '');
  await page.fill('#reg-name', 'Sam'); await page.click('#auth-submit'); await page.waitForTimeout(300);
  await page.click('#q-skip-all'); await page.waitForTimeout(300); await page.click('#ack-btn'); await page.waitForTimeout(300);
  await page.go('#/benefits');
  console.log('[skipall] head', (await page.locator('.bf-head').innerText()).replace(/\n+/g, ' | '));
  console.log('[skipall] blocked section', await page.locator('.blocked').count(), 'tiles', (await page.locator('.glance').innerText()).replace(/\n+/g, ' | '));
  await page.shot('benefits-skipall');
  await page.click('#answer-visa');
  await page.waitForTimeout(400);
  console.log('[skipall] answer visa ->', await page.evaluate(() => location.hash), 'focused', await page.evaluate(() => document.activeElement.id));
  // chat reply for unknown
  await page.go('#/chat');
  await page.fill('#chat-input', 'What can I claim?'); await page.press('#chat-input', 'Enter'); await page.waitForTimeout(1800);
  console.log('[skipall] reply', (await page.locator('.msg-bot').last().innerText()).replace(/\n+/g, ' | '));
  // sign out and sign in
  await page.click('#avatar-btn'); await page.click('[data-menu="logout"]'); await page.waitForTimeout(400);
  console.log('[skipall] after logout', await page.evaluate(() => location.hash), 'email prefilled', await page.inputValue('#login-email'));
  await page.click('#auth-submit'); await page.waitForTimeout(400);
  console.log('[skipall] after sign in', await page.evaluate(() => location.hash), 'chat msgs', await page.locator('.msg').count());
  await ctx.close();
}
await browser.close();
