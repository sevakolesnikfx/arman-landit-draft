/* Viewport screenshots of every route at phone and desktop. */
import { chromium, open, shot } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = [
  ['login', 'reset=1', '/login'],
  ['register', 'reset=1', '/register'],
  ['chat', 'demo=1', '/chat'],
  ['benefits', 'demo=1', '/benefits'],
  ['benefit', 'demo=1', '/benefit/railcard-16-25'],
  ['community', 'demo=1', '/community'],
  ['settings', 'demo=1', '/settings'],
];
for (const size of ['phone', 'desktop']) {
  for (const [name, q, h] of routes) {
    const { ctx, page, errors } = await open(browser, size, q, h);
    await shot(page, `${size}-${name}`);
    if (errors.length) console.log(size, name, errors);
    await ctx.close();
  }
  // questions + ack: register first
  const { ctx, page } = await open(browser, size, 'reset=1', '/register');
  await page.fill('#reg-name', 'Tom');
  await page.fill('#reg-email', 't@example.com');
  await page.fill('#reg-password', 'x');
  await page.click('#auth-submit');
  await page.waitForTimeout(500);
  await shot(page, `${size}-questions`);
  await page.click('#q-skip-all');
  await page.waitForTimeout(500);
  await shot(page, `${size}-ack`);
  await page.click('#ack-btn');
  await page.waitForTimeout(600);
  await shot(page, `${size}-chat-new`);
  await page.evaluate(() => { location.hash = '#/benefits'; });
  await page.waitForTimeout(600);
  await shot(page, `${size}-benefits-nostatus`);
  await ctx.close();
}
await browser.close();
console.log('done');
