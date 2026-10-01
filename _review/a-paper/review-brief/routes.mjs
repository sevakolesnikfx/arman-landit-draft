import fs from 'node:fs';
import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = ['login', 'register', 'questions', 'questions/2', 'ack', 'chat', 'benefits', 'benefit/council-tax-student', 'benefit/universal-credit', 'benefit/nino', 'community', 'community/ratings', 'settings'];
const report = {};
for (const size of ['phone', 'desktop']) {
  for (const r of routes) {
    const pub = ['login', 'register', 'questions', 'questions/2', 'ack'].some(x => r === x);
    const url = (pub && r !== 'questions' && r !== 'questions/2' ? '?reset=1' : '?demo=1') + '#/' + r;
    const { ctx, page, errs } = await open(browser, size, url);
    if (r === 'ack') { /* reset leads to register; force ack */ await page.evaluate(() => { location.hash = '#/ack'; }); await page.waitForTimeout(400); }
    const txt = await page.evaluate(() => document.body.innerText);
    const hash = await page.evaluate(() => location.hash);
    const hasDisc = txt.includes(DISC);
    const issues = scan(txt);
    const sw = await page.evaluate(() => [document.scrollingElement.scrollWidth, innerWidth]);
    report[size + ' ' + r] = { hash, hasDisc, issues, errs, sw };
    fs.writeFileSync(SHOTS + '../text-' + size + '-' + r.replace(/\//g, '_') + '.txt', txt);
    await ctx.close();
  }
}
for (const [k, v] of Object.entries(report)) console.log(k, v.hash, 'disc=' + v.hasDisc, 'sw=' + v.sw, v.errs.join(';'), '\n   ' + v.issues.join('\n   '));
await browser.close();
