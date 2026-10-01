/* Viewport screenshots for the people/accessibility review of design C. */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-people/';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  xl360: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
};
const which = process.argv[2] || 'all';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function shoot(sizeName, query, hash, name, prep) {
  const ctx = await browser.newContext({ ...SIZES[sizeName], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  for (let i = 0; i < 3; i++) {
    try { await page.goto(BASE + query + hash, { waitUntil: 'load' }); break; } catch (e) { await page.waitForTimeout(500); }
  }
  await page.waitForTimeout(400);
  if (prep) await prep(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + name + '.png' });
  if (errs.length) console.log(name, 'ERR', errs.join(' | '));
  await ctx.close();
}

const jobs = [];
const both = (q, h, n, prep) => { jobs.push(['phone', q, h, n + '-phone', prep]); jobs.push(['desktop', q, h, n + '-desktop', prep]); };

if (which === 'all' || which === 'main') {
  both('?reset=1', '#/login', 'login');
  both('?reset=1', '#/register', 'register');
  both('?reset=1', '#/questions', 'q1');
  both('?demo=1', '#/ack', 'ack');
  both('?demo=1', '#/chat', 'chat-empty');
  both('?demo=1', '#/chat', 'chat-reply', async p => {
    await p.fill('#chat-input', 'What can I claim?');
    await p.click('.send-btn');
    await p.waitForTimeout(400);
  });
  both('?demo=1', '#/benefits', 'benefits-top');
  both('?demo=1', '#/benefits/all', 'benefits-all');
  both('?demo=1', '#/benefits/all', 'benefits-all-scroll', async p => { await p.mouse.wheel(0, 800); });
  both('?demo=1', '#/benefits', 'benefits-blocked-open', async p => {
    await p.click('[data-action="blocked-toggle"]'); await p.locator('.blocked-panel').scrollIntoViewIfNeeded();
  });
  both('?demo=1', '#/benefit/council-tax-student', 'detail');
  both('?demo=1', '#/benefit/council-tax-student', 'detail-scroll', async p => { await p.mouse.wheel(0, 900); });
  both('?demo=1', '#/community', 'community');
  both('?demo=1', '#/community/ratings', 'ratings');
  both('?demo=1', '#/settings', 'settings');
  both('?demo=1', '#/settings/help', 'help');
  jobs.push(['phone', '?demo=1', '#/chat', 'drawer-phone', async p => {
    await p.click('[data-action="open-drawer"]'); await p.waitForTimeout(300);
  }]);
  jobs.push(['phone', '?demo=1', '#/chat', 'drawer-expanded-phone', async p => {
    await p.click('[data-action="open-drawer"]'); await p.waitForTimeout(300);
    await p.locator('#sidebar .app-toggle').first().click();
  }]);
  jobs.push(['desktop', '?demo=1', '#/chat', 'rail-desktop', async p => {
    await p.click('.side-full [data-action="rail"]');
  }]);
  jobs.push(['desktop', '?demo=1', '#/chat', 'sidebar-expanded-desktop', async p => {
    await p.locator('#sidebar .app-toggle').first().click();
  }]);
}
if (which === 'all' || which === 'themes') {
  for (const t of ['clear', 'warm', 'sage', 'soft-dark', 'strong']) {
    jobs.push(['phone', '?demo=1&theme=' + t, '#/benefits/all', 'theme-' + t + '-list-phone']);
    jobs.push(['phone', '?demo=1&theme=' + t, '#/chat', 'theme-' + t + '-chat-phone']);
    jobs.push(['phone', '?demo=1&theme=' + t, '#/benefit/council-tax-student', 'theme-' + t + '-detail-phone']);
  }
}
if (which === 'all' || which === 'rtl') {
  both('?demo=1&lang=ar', '#/chat', 'rtl-chat');
  both('?demo=1&lang=ar', '#/benefits', 'rtl-benefits');
  both('?demo=1&lang=ar', '#/benefits/all', 'rtl-list');
  both('?demo=1&lang=ar', '#/benefit/council-tax-student', 'rtl-detail');
  jobs.push(['phone', '?demo=1&lang=ar', '#/chat', 'rtl-drawer-phone', async p => { await p.click('[data-action="open-drawer"]'); await p.waitForTimeout(300); }]);
  both('?demo=1&lang=ar', '#/settings', 'rtl-settings');
}
if (which === 'all' || which === 'xl') {
  for (const r of ['chat', 'benefits', 'benefits/all', 'benefit/council-tax-student', 'community', 'settings']) {
    jobs.push(['xl360', '?demo=1&text=xlarge', '#/' + r, 'xl360-' + r.replace(/\//g, '_')]);
  }
  jobs.push(['xl360', '?reset=1&text=xlarge', '#/questions', 'xl360-q1']);
  jobs.push(['xl360', '?demo=1&text=xlarge', '#/chat', 'xl360-chat-reply', async p => {
    await p.fill('#chat-input', 'What can I claim?'); await p.click('.send-btn'); await p.waitForTimeout(400);
  }]);
}

for (const j of jobs) {
  try { await shoot(...j); } catch (e) { console.log('FAIL', j[3], e.message.split('\n')[0]); }
}
await browser.close();
console.log('done', jobs.length);
