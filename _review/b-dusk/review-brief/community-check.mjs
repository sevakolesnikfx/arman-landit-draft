import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const { ctx, page } = await open(browser, size, 'demo=1', '#/community');
  const log = (...a) => console.log(`[${size}]`, ...a);
  await page.shot('community-top');
  const before = await page.evaluate(() => JSON.stringify(window.DUSK.ratingsFor('council-tax-student')));
  if (size === 'phone') await page.click('#cm-tab-ratings');
  await page.click('#rate-open');
  await page.waitForTimeout(200);
  log('rate dialog', (await page.locator('dialog[open]').innerText()).replace(/\n+/g, ' | ').slice(0, 400));
  log('preselected', await page.inputValue('#rate-benefit'));
  await page.selectOption('#rate-benefit', 'council-tax-student');
  await page.click('label[for="rate-worth-0"]'); await page.click('label[for="rate-speed-2"]'); await page.click('label[for="rate-ease-2"]');
  await page.click('#rate-save'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => JSON.stringify(window.DUSK.ratingsFor('council-tax-student')));
  log('ratings before', before, '\n   after', after);
  const block = page.locator('.rt').filter({ hasText: 'Council Tax student exemption' }).first();
  log('block text', (await block.innerText()).replace(/\n+/g, ' | '));
  await page.shot('community-ratings');
  if (size === 'phone') await page.click('#cm-tab-posts');
  // post and comment counts
  const nPosts = await page.locator('.feed .post').count();
  await page.fill('#cm-text', 'Test post about the railcard.');
  await page.click('#cm-post'); await page.waitForTimeout(300);
  log('posts', nPosts, '->', await page.locator('.feed .post').count(), 'filter label', (await page.locator('#cm-filter option').first().innerText()));
  const cb = page.locator('[data-action="cm-comments"]').nth(1);
  const label0 = await cb.innerText();
  await cb.click();
  const pid = await cb.getAttribute('data-pid');
  await page.fill('#cm-in-' + pid, 'Thanks for sharing.');
  await page.locator('#cm-c-' + pid + ' button[type=submit]').click(); await page.waitForTimeout(300);
  log('comments label', label0, '->', await page.locator('#cm-cbtn-' + pid).innerText());
  // empty post
  await page.fill('#cm-text', ''); await page.click('#cm-post');
  log('empty post error visible', await page.isVisible('#cm-err'));
  await ctx.close();
}
await browser.close();
