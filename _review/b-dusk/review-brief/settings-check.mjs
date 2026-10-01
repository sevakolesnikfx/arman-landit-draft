import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '#/settings');
  const log = (...a) => console.log(`[${size}]`, ...a);
  log('sections', await page.evaluate(() => [...document.querySelectorAll('.st-sec h2')].map(h => h.innerText)));
  log('details', (await page.locator('#drows').innerText()).replace(/\n+/g, ' | '));
  await page.click('#ra-switch');
  log('ra now', await page.getAttribute('#ra-switch', 'aria-checked'));
  await page.go('#/chat');
  log('read buttons in chat with RA off', await page.locator('.read-btn').count());
  await page.go('#/benefit/railcard-16-25');
  log('read buttons in detail with RA off', await page.locator('.read-btn').count());
  await page.go('#/settings');
  await page.click('#ra-switch');
  // Edit nation to Scotland
  await page.click('#dbtn-nation');
  await page.click('label[for="st-nation-Scotland"]');
  await page.click('#dsave-nation');
  await page.waitForTimeout(300);
  log('toast', await page.locator('#toast').innerText(), 'result', await page.locator('#st-result').innerText());
  await page.go('#/benefits');
  log('benefits head', (await page.locator('#bf-title').innerText()));
  // Help now in settings shows Scotland numbers?
  await page.go('#/settings');
  log('safety lead', await page.locator('.safety-lead').innerText());
  log('safety sub', await page.locator('#st-safety .card-sub').innerText());
  // theme
  await page.click('label[for="theme-sand"]');
  log('theme', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));
  await page.click('label[for="ts-xlarge"]');
  log('font size', await page.evaluate(() => document.documentElement.style.fontSize));
  await page.shot('settings-sand-xlarge');
  // Clear answer for status
  await page.click('#dbtn-status');
  await page.click('[data-action="d-clear"][data-q="status"]');
  await page.waitForTimeout(200);
  log('after clear status', await page.locator('#st-result').innerText());
  // delete account dialog text
  await page.click('#st-delete');
  log('delete dialog', (await page.locator('dialog[open]').innerText()).replace(/\n+/g, ' | '));
  await page.click('#confirm-yes');
  await page.waitForTimeout(400);
  log('after delete', await page.evaluate(() => location.hash), 'prefs kept?', await page.evaluate(() => document.documentElement.getAttribute('data-theme') + ' ' + document.documentElement.style.fontSize));
  await ctx.close();
}
await browser.close();
