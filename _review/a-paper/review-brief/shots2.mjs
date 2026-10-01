import { chromium, open, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
{
  const { ctx, page } = await open(browser, 'phone', '?demo=1#/benefit/council-tax-student');
  await page.screenshot({ path: SHOTS + 'detail-cts-phone-full.png', fullPage: true });
  const tops = await page.evaluate(() => [...document.querySelectorAll('.d-head, .glance, .claim, #what-h, #rules-h, #docs-h, #steps-h, #facts-h, #boost-h, .watch, .apply-row, .snap, #src-h, .page-foot')].map(e => (e.id || e.className) + '@' + Math.round(e.getBoundingClientRect().top + scrollY)));
  console.log('detail section tops (phone):', tops.join(', '), 'docH', await page.evaluate(() => document.documentElement.scrollHeight));
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(500);
  const firstCard = await page.evaluate(() => Math.round(document.querySelector('.bcard').getBoundingClientRect().top + scrollY));
  console.log('phone benefits first card top', firstCard);
  await page.evaluate(() => { const d = document.getElementById('blocked'); d.open = true; d.scrollIntoView(); }); await page.waitForTimeout(300);
  await page.screenshot({ path: SHOTS + 'blocked-phone.png' });
  console.log('blocked text:', await page.evaluate(() => document.getElementById('blocked').innerText));
  await page.evaluate(() => window.scrollTo(0, 1700)); await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + 'benefits-cards-phone.png' });
  await ctx.close();
}
{
  const { ctx, page } = await open(browser, 'desktop', '?demo=1#/benefit/council-tax-student');
  await page.screenshot({ path: SHOTS + 'detail-cts-desktop.png' });
  await page.screenshot({ path: SHOTS + 'detail-cts-desktop-full.png', fullPage: true });
  await page.evaluate(() => { location.hash = '#/benefit/free-courses-for-jobs'; }); await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + 'detail-fcfj-desktop-full.png', fullPage: true });
  await page.evaluate(() => { location.hash = '#/benefit/help-to-save'; }); await page.waitForTimeout(500);
  await page.screenshot({ path: SHOTS + 'detail-hts-desktop.png' });
  await page.evaluate(() => { location.hash = '#/benefits'; }); await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 560)); await page.waitForTimeout(200);
  await page.screenshot({ path: SHOTS + 'benefits-cards-desktop.png' });
  await ctx.close();
}
await browser.close();
