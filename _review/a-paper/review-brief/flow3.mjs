import { chromium, open, scan, DISC, SHOTS, INDEX } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
const log = (k, v) => { out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errs } = await open(browser, size, '?demo=1#/chat');
  const phone = size === 'phone';
  if (phone) {
    const menu = page.locator('.menu-btn');
    log('phone menu btn', { label: await menu.getAttribute('aria-label'), box: await menu.boundingBox() });
    await menu.click(); await page.waitForTimeout(500);
    const st = await page.evaluate((D) => ({ open: document.getElementById('app').classList.contains('drawer-open'), focus: document.activeElement.getAttribute('aria-label'), colInert: document.getElementById('col').inert, sbText: document.getElementById('sidebar').innerText, discInDrawer: document.getElementById('sidebar').innerText.includes(D), sbRect: document.getElementById('sidebar').getBoundingClientRect().toJSON() }), DISC);
    log('phone drawer', st);
    await page.screenshot({ path: SHOTS + 'drawer-' + size + '.png' });
  } else {
    const col = page.locator('.sb-collapse');
    log('desk collapse btn', { label: await col.getAttribute('aria-label'), exp: await col.getAttribute('aria-expanded') });
    await col.click(); await page.waitForTimeout(500);
    const st = await page.evaluate(() => ({ collapsed: document.getElementById('app').classList.contains('is-collapsed'), sbw: document.getElementById('sidebar').getBoundingClientRect().width, label: document.querySelector('.sb-collapse').getAttribute('aria-label'), visibleBtns: [...document.querySelectorAll('#sidebar button, #sidebar a')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => (e.getAttribute('aria-label') || e.innerText).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)) }));
    log('desk collapsed', st);
    await page.screenshot({ path: SHOTS + 'collapsed-' + size + '.png' });
    // reload keeps collapsed?
    await page.reload(); await page.waitForTimeout(600);
    log('desk collapsed after reload', await page.evaluate(() => document.getElementById('app').classList.contains('is-collapsed')));
    await page.click('.rail-tracked'); await page.waitForTimeout(400);
    log('desk rail tracked -> expanded', await page.evaluate(() => !document.getElementById('app').classList.contains('is-collapsed') && document.activeElement.id));
  }
  // expand tracked row
  const row = page.locator('.trk-btn[data-id="council-tax-student"]');
  await row.click(); await page.waitForTimeout(300);
  const panel = await page.evaluate(() => { const p = document.getElementById('trk-p-council-tax-student'); return { hidden: p.hidden, text: p.innerText, boxes: [...p.querySelectorAll('input[type=checkbox]')].map(i => i.getAttribute('data-doc') + '=' + i.checked), exp: document.querySelector('.trk-btn[data-id="council-tax-student"]').getAttribute('aria-expanded') }; });
  log(size + ' tracked panel', panel);
  await page.screenshot({ path: SHOTS + 'trk-expanded-' + size + '.png' });
  // tick the first unticked
  const box = page.locator('#trk-p-council-tax-student input[type=checkbox]').first();
  const boxBox = await page.locator('#trk-p-council-tax-student label.check').first().boundingBox();
  log(size + ' check label box', boxBox);
  await page.locator('#trk-p-council-tax-student label.check').first().click(); await page.waitForTimeout(300);
  log(size + ' after tick', await page.evaluate(() => ({ ticked: PAPER.state.tracked.find(t => t.id === 'council-tax-student').ticked, meta: document.querySelector('.trk-btn[data-id="council-tax-student"] .trk-meta').innerText })));
  await page.reload(); await page.waitForTimeout(700);
  if (phone) { await page.click('.menu-btn'); await page.waitForTimeout(400); }
  log(size + ' after reload', await page.evaluate(() => ({ ticked: PAPER.state.tracked.find(t => t.id === 'council-tax-student').ticked, meta: document.querySelector('.trk-btn[data-id="council-tax-student"] .trk-meta').innerText, expanded: document.querySelector('.trk-btn[data-id="council-tax-student"]').getAttribute('aria-expanded') })));
  // uni hardship panel: docs needed vs maybe
  await page.locator('.trk-btn[data-id="uni-hardship-fund"]').click(); await page.waitForTimeout(200);
  log(size + ' uni panel', await page.evaluate(() => document.getElementById('trk-p-uni-hardship-fund').innerText));
  // go to detail via Open details
  await page.locator('.trk-btn[data-id="council-tax-student"]').click(); await page.waitForTimeout(200);
  await page.locator('#trk-p-council-tax-student .trk-open').click(); await page.waitForTimeout(600);
  log(size + ' open details hash', await page.evaluate(() => location.hash + ' drawerOpen=' + document.getElementById('app').classList.contains('drawer-open')));
  // change claim status
  await page.locator('.seg-opt:has-text("Applied")').click(); await page.waitForTimeout(400);
  log(size + ' claim change', await page.evaluate(() => ({ st: PAPER.state.tracked.find(t => t.id === 'council-tax-student').status, pill: document.querySelector('.trk-btn[data-id="council-tax-student"] .status-pill').innerText, note: document.getElementById('claim-note').innerText })));
  // claim status on untracked benefit
  await page.evaluate(() => { location.hash = '#/benefit/gp-registration'; }); await page.waitForTimeout(500);
  await page.locator('.seg-opt:has-text("Approved")').click(); await page.waitForTimeout(400);
  log(size + ' claim on untracked', await page.evaluate(() => ({ tracked: PAPER.state.tracked.map(t => t.id + ':' + t.status), btn: document.querySelector('[data-fk="d-track"]').innerText, note: document.getElementById('claim-note')?.innerText })));
  // doc tick on detail page mirrors in sidebar
  await page.evaluate(() => { location.hash = '#/benefit/railcard-16-25'; }); await page.waitForTimeout(500);
  await page.locator('.d-docs label.check').first().click(); await page.waitForTimeout(300);
  log(size + ' detail tick untracked', await page.evaluate(() => ({ tracked: PAPER.state.tracked.map(t => t.id + ':' + t.ticked.length) })));
  // untrack
  await page.locator('[data-fk="d-track"]').click(); await page.waitForTimeout(300);
  log(size + ' untrack', await page.evaluate(() => PAPER.state.tracked.map(t => t.id)));
  // drawer check on a benefit page via phone: drawer shows names, check disclaimer
  if (phone) {
    await page.click('.menu-btn'); await page.waitForTimeout(400);
    await page.screenshot({ path: SHOTS + 'drawer-detail-phone.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    log('phone esc closes drawer', await page.evaluate(() => !document.getElementById('app').classList.contains('drawer-open') && document.activeElement.className));
  }
  log(size + ' errs', errs);
  await ctx.close();
}
console.log(out.join('\n'));
await browser.close();
