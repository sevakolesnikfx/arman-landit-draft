import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
const log = (k, v) => { out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))); };
for (const size of ['phone', 'desktop']) {
  const { ctx, page, errs } = await open(browser, size, '?demo=1#/community');
  await page.screenshot({ path: SHOTS + 'community-' + size + '.png' });
  const c0 = await page.evaluate(() => ({ posts: document.querySelectorAll('.post').length, first: document.querySelector('.post')?.innerText.slice(0, 300), tabs: [...document.querySelectorAll('.tabs a')].map(a => a.innerText) }));
  log(size + ' community', c0);
  // write a post
  await page.click('[data-act="compose-open"]'); await page.waitForTimeout(300);
  await page.fill('#p-title', 'My railcard');
  await page.fill('#p-body', 'It took ten minutes online.');
  await page.selectOption('#p-tag', 'railcard-16-25');
  await page.click('#post-form button[type=submit]'); await page.waitForTimeout(400);
  log(size + ' after post', await page.evaluate(() => ({ posts: document.querySelectorAll('.post').length, first: document.querySelector('.post').innerText.slice(0, 200), toast: document.getElementById('toast').innerText })));
  // empty post validation
  await page.click('[data-act="compose-open"]'); await page.waitForTimeout(200);
  await page.click('#post-form button[type=submit]'); await page.waitForTimeout(200);
  log(size + ' empty post', await page.evaluate(() => ({ err: !document.getElementById('post-err').hidden, focus: document.activeElement.id })));
  await page.click('[data-act="compose-cancel"]'); await page.waitForTimeout(200);
  // comment on a sample post
  const post = page.locator('.post').nth(1);
  const cbtn = post.locator('[data-act=comments]');
  const before = await cbtn.innerText();
  await cbtn.click(); await page.waitForTimeout(300);
  const post2 = page.locator('.post').nth(1);
  await post2.locator('input').fill('Thanks, this helped.');
  await post2.locator('form button[type=submit]').click(); await page.waitForTimeout(400);
  log(size + ' comment', { before, after: await page.locator('.post').nth(1).locator('[data-act=comments]').innerText(), last: await page.locator('.post').nth(1).locator('.comment').last().innerText() });
  // ratings tab
  await page.click('.tabs a:has-text("Ratings")'); await page.waitForTimeout(400);
  const rt = await page.evaluate(() => [...document.querySelectorAll('.rcard')].slice(0, 2).map(r => r.innerText.replace(/\n+/g, ' / ')));
  log(size + ' ratings', rt);
  await page.screenshot({ path: SHOTS + 'ratings-' + size + '.png', fullPage: false });
  // rate a scheme (council-tax-student)
  await page.click('.rate-cta [data-act=rate]'); await page.waitForTimeout(400);
  const dlg = await page.evaluate((D) => { const d = document.querySelector('dialog[open]'); return { title: d.querySelector('.dlg-title').innerText, sel: d.querySelector('#r-scheme').value, opts: [...d.querySelectorAll('.rate-opt')].map(o => o.innerText), hasDisc: d.innerText.includes(D) }; }, DISC);
  log(size + ' rate dialog', dlg);
  await page.selectOption('#r-scheme', 'council-tax-student');
  await page.click('.rate-set:nth-of-type(1) .rate-opt:has-text("Very")');
  await page.click('.rate-opt:has-text("Quick")');
  await page.click('.rate-opt:has-text("Easy")');
  await page.screenshot({ path: SHOTS + 'rate-dialog-' + size + '.png' });
  await page.click('dialog[open] button[type=submit]'); await page.waitForTimeout(400);
  const after = await page.evaluate(() => [...document.querySelectorAll('.rcard')].find(r => r.querySelector('a[href="#/benefit/council-tax-student"]'))?.innerText.replace(/\n+/g, ' / '));
  log(size + ' after rate', after);
  const sample = await page.evaluate(() => JSON.stringify(LANDIT.community.ratings['council-tax-student']));
  log(size + ' sample counts', sample);
  // check rating counts sentences vs data for every rcard
  const chk = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.rcard').forEach(r => {
      const id = r.querySelector('h3 a').getAttribute('href').split('/').pop();
      const counts = PAPER.ratingCounts(id);
      r.querySelectorAll('.rscale').forEach((s, i) => {
        const key = ['worth', 'speed', 'ease'][i]; const arr = counts[key]; const tot = arr.reduce((a, b) => a + b, 0);
        const txt = s.innerText;
        if (tot && !txt.includes(' of ' + tot + ' ')) bad.push(id + ' ' + key + ' ' + txt.replace(/\n/g, ' '));
        LANDIT.community.ratingScales[key].options.forEach((o, j) => { if (tot && !txt.includes(o + ' ' + arr[j])) bad.push(id + ' ' + key + ' missing ' + o + ' ' + arr[j]); });
      });
    });
    return bad;
  });
  log(size + ' rating count check', chk);
  // detail page snapshot
  await page.evaluate(() => { location.hash = '#/benefit/council-tax-student'; }); await page.waitForTimeout(500);
  log(size + ' detail snapshot', await page.evaluate(() => document.querySelector('.snap')?.innerText.replace(/\n+/g, ' / ')));
  // ties: sample with tie
  log(size + ' errs', errs);
  await ctx.close();
}
console.log(out.join('\n'));
await browser.close();
