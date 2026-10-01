#!/usr/bin/env node
/* Design A: render every benefit page for three profiles (demo Student
   visa, refugee, no status) and check: no errors, the disclaimer is
   shown, no dash characters, no banned words, no "Not listed", amounts
   only with their qualifier, the certainty tag only on possible schemes,
   and for schemes the person cannot get: no primary apply button, no
   claim status, no Improve your chances.
   Usage: node _review/a-paper/verify/details.mjs */
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
import { findBanned, DASHES } from '../../../tools/content-rules.mjs';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const INDEX = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/a-paper/index.html').href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(INDEX + '?demo=1#/chat', { waitUntil: 'networkidle' });
const PROFILES = {
  student: null,
  refugee: { status: 'refugee', nation: 'England' },
  none: {},
};
let bad = 0, pages = 0;
for (const [name, prof] of Object.entries(PROFILES)) {
  if (prof) await page.evaluate(p => { window.PAPER.state.profile = p; window.PAPER.save(); }, prof);
  const ids = await page.evaluate(() => window.LANDIT.benefits.map(b => b.id));
  const stats = { blocked: 0, possibleTags: 0 };
  for (const id of ids) {
    await page.evaluate(id => { location.hash = '#/benefit/' + id; }, id);
    await page.waitForFunction(id => document.querySelector('h1.d-title') && location.hash.endsWith(id), id);
    const r = await page.evaluate(id => {
      const L = window.LANDIT, P = window.PAPER, m = P.match(), b = L.benefitById(id);
      const text = document.querySelector('#main').innerText;
      const st = P.standing(id);
      const gated = !!(m.known && m.nrpf && (b.publicFunds || b.nrpf === 'no'));
      const blocked = st.state === 'blocked' || (st.state === 'hidden' && gated);
      const v = L.valueParts(b);
      return {
        text, blocked,
        disc: text.includes(L.disclaimer),
        primaryApply: !!document.querySelector('.apply-row .btn.primary'),
        claim: !!document.querySelector('input[name="claim"]'),
        boost: !!document.querySelector('#acc-boost'),
        tag: !!document.querySelector('.d-head .fit-tag'),
        fit: m.fit[id] || null,
        amountOk: b.valueKind !== 'amount' || !v.amount || !v.label || (text.includes(v.amount) && document.querySelector('.glance').innerText.length > 0),
      };
    }, id);
    pages++;
    const problems = [];
    if (!r.disc) problems.push('no disclaimer');
    for (const m of r.text.matchAll(DASHES)) problems.push('dash');
    for (const h of findBanned(r.text)) problems.push('banned ' + h.term);
    if (/Not listed/.test(r.text)) problems.push('Not listed');
    if ((r.fit === 'possible') !== r.tag) problems.push('tag ' + r.fit + '/' + r.tag);
    if (r.blocked && (r.primaryApply || r.claim || r.boost)) problems.push('blocked page nudges');
    if (!r.amountOk) problems.push('amount without qualifier');
    if (r.blocked) stats.blocked++;
    if (r.tag) stats.possibleTags++;
    if (problems.length) { bad++; console.log(name, id, problems.join(', ')); }
  }
  console.log(`${name}: ${ids.length} pages, ${stats.blocked} shown as not open, ${stats.possibleTags} with "Depends on your situation"`);
}
console.log(`\n${pages} pages checked, ${bad} with problems, ${errs.length} console/page errors`);
errs.slice(0, 5).forEach(e => console.log('  ' + e));
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
