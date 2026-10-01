/* Text sweep of every route, phone and desktop. Read-only review script. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
import { findBanned, DASHES } from '../../../tools/content-rules.mjs';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const HERE = '/Users/armanbayatmaku/Desktop/landit-test/_review/b-dusk/review-brief';
const PAGE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/b-dusk/index.html').href;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const JARGON = [/NRPF/g, /means-tested/gi, /composition/gi, /gated/gi, /UC-gated/gi, /public-funds schemes/gi, /\bcatalog\b/gi, /\bpassported\b/gi, /\bdiscretionary\b/gi, /\bnon-repayable\b/gi, /\bentitled\b/gi, /\bentitlement\b/gi, /\bguaranteed?\b/gi, /\bwill get\b/gi, /\byou qualify\b/gi, /\bowed\b/gi, /\bFree\b/g, /\burgent\b/gi, /\bwarning\b/gi, /\brisk\b/gi];
const out = {};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['phone', 'desktop']) {
  const ctx = await browser.newContext(SIZES[size]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(PAGE + '?demo=1#/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const nrpfNotes = await page.evaluate(() => window.LANDIT.benefits.map(b => b.nrpfNote).filter(Boolean));
  const disc = await page.evaluate(() => window.LANDIT.disclaimer);
  const routes = ['#/chat', '#/benefits', '#/benefit/council-tax-student', '#/benefit/pip', '#/benefit/free-courses-for-jobs', '#/benefit/gp-registration', '#/community', '#/settings'];
  for (const r of routes) {
    await page.evaluate(h => { location.hash = h; }, r);
    await page.waitForTimeout(500);
    // open all tabs in detail panel to read text
    let txt = await page.evaluate(() => document.body.innerText);
    if (r.startsWith('#/benefit/')) {
      for (const t of ['apply', 'community']) {
        await page.click('#tab-' + t).catch(() => {});
        await page.waitForTimeout(150);
        txt += '\n[TAB ' + t + ']\n' + await page.evaluate(() => document.getElementById('bf-panel').innerText);
      }
      await page.click('#tab-overview').catch(() => {});
    }
    if (r === '#/benefits') {
      await page.click('#blocked-toggle'); await page.waitForTimeout(150);
      await page.click('[data-action="bars-more"]').catch(() => {}); await page.waitForTimeout(150);
      txt = await page.evaluate(() => document.body.innerText);
      await page.screenshot({ path: path.join(HERE, 'shots', `${size}-benefits-full.png`), fullPage: true });
    }
    if (r === '#/community' && size === 'phone') {
      await page.click('#cm-tab-ratings'); await page.waitForTimeout(150);
      txt += '\n[RATINGS]\n' + await page.evaluate(() => document.body.innerText);
      await page.click('#cm-tab-posts');
    }
    const key = size + ' ' + r;
    const dashes = [...txt.matchAll(DASHES)].map(m => txt.slice(Math.max(0, m.index - 30), m.index + 30));
    const banned = findBanned(txt).map(h => h.term + ': ' + txt.slice(Math.max(0, h.index - 40), h.index + 40).replace(/\n/g, ' '));
    const leaks = nrpfNotes.filter(n => txt.includes(n.slice(0, 40)));
    const jargon = [];
    for (const re of JARGON) for (const m of txt.matchAll(re)) jargon.push(m[0] + ' :: ' + txt.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\n/g, ' '));
    const pounds = [...txt.matchAll(/£[\d,.]+/g)].map(m => txt.slice(Math.max(0, m.index - 40), m.index + 50).replace(/\n/g, ' | '));
    out[key] = { hasDisclaimer: txt.includes(disc), dashes, banned, leaks, jargon, pounds };
    fs.writeFileSync(path.join(HERE, 'text', `${size}${r.replace(/[#/]+/g, '-')}.txt`), txt);
  }
  out[size + ' errors'] = errs;
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(HERE, 'sweep.json'), JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) {
  if (Array.isArray(v)) { console.log(k, v); continue; }
  console.log('\n==', k, 'disclaimer:', v.hasDisclaimer, 'dashes:', v.dashes.length, 'banned:', v.banned.length, 'leaks:', v.leaks.length);
  v.dashes.forEach(x => console.log('  DASH', x)); v.banned.forEach(x => console.log('  BAN', x)); v.leaks.forEach(x => console.log('  LEAK', x));
  v.jargon.forEach(x => console.log('  J', x));
}
