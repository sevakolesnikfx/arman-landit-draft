import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
// PHONE drawer
{
  const { ctx, page } = await open(browser, 'phone');
  await page.click('#menu-btn');
  await page.waitForTimeout(400);
  console.log('phone drawer open', await page.getAttribute('#shell', 'data-drawer'), 'focused', await page.evaluate(() => document.activeElement.id || document.activeElement.className));
  await page.click('#trk-btn-council-tax-student');
  await page.waitForTimeout(200);
  await page.shot('drawer-expanded');
  const disc = await page.evaluate(() => { const s = document.getElementById('sidebar'); return s.textContent.includes(window.LANDIT.disclaimer); });
  console.log('drawer contains disclaimer', disc);
  // visible disclaimer anywhere in viewport not covered?
  console.log('drawer box', await page.locator('#sidebar').boundingBox());
  const boxes = await page.evaluate(() => [...document.querySelectorAll('#sidebar .trk-head, #sidebar .check, #sidebar .sb-link, #sidebar .trk-link, #drawer-close')].map(e => { const r = e.getBoundingClientRect(); return (e.id || e.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }));
  console.log('drawer targets', boxes.join('; '));
  // tick a maybe doc
  const maybe = page.locator('#trk-body-council-tax-student input[type=checkbox]').nth(2);
  await maybe.check();
  console.log('docs line', await page.locator('#trk-btn-council-tax-student .trk-docs').innerText());
  // tab trap
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  console.log('after 30 tabs focus inside sidebar', await page.evaluate(() => document.getElementById('sidebar').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('after esc', await page.getAttribute('#shell', 'data-drawer'), 'focus', await page.evaluate(() => document.activeElement.id));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('after reload ticks', await page.evaluate(() => JSON.stringify(window.DUSK.state.checks['council-tax-student'])));
  console.log('after reload expanded state kept?', await page.evaluate(() => document.getElementById('trk-btn-council-tax-student').getAttribute('aria-expanded')));
  await ctx.close();
}
// DESKTOP collapse
{
  const { ctx, page } = await open(browser, 'desktop');
  const w0 = (await page.locator('#sidebar').boundingBox()).width;
  await page.click('#collapse-btn');
  await page.waitForTimeout(400);
  const w1 = (await page.locator('#sidebar').boundingBox()).width;
  await page.shot('sidebar-collapsed');
  console.log('desktop sidebar width', w0, '->', w1, 'collapse aria-expanded', await page.getAttribute('#collapse-btn', 'aria-expanded'), 'label', await page.getAttribute('#collapse-btn', 'aria-label'));
  console.log('rail', await page.evaluate(() => [...document.querySelectorAll('#sidebar a, #sidebar button')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.innerText).trim())));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  console.log('collapsed after reload', await page.getAttribute('#shell', 'data-collapsed'));
  await page.click('#rail-tracked');
  await page.waitForTimeout(300);
  console.log('after rail click', await page.getAttribute('#shell', 'data-collapsed'));
  // phone size: menu label
  console.log('menu-btn label', await page.getAttribute('#menu-btn', 'aria-label'));
  await ctx.close();
}
await browser.close();
