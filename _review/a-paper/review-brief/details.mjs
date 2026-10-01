import fs from 'node:fs';
import { chromium, open, scan, DISC } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page, errs } = await open(browser, 'desktop', '?demo=1#/benefits');
const ids = await page.evaluate(() => LANDIT.benefits.map(b => b.id));
const results = [];
const issueCount = {};
for (const id of ids) {
  await page.evaluate(id => { location.hash = '#/benefit/' + id; }, id);
  await page.waitForFunction(id => document.querySelector('h1.d-title') && location.hash === '#/benefit/' + id, id, { timeout: 4000 }).catch(() => {});
  const r = await page.evaluate((id) => {
    const b = LANDIT.benefitById(id);
    const q = s => { const e = document.querySelector(s); return e ? e.innerText.trim() : null; };
    const qa = s => [...document.querySelectorAll(s)].map(e => e.innerText.trim());
    const dl = {}; document.querySelectorAll('.dl > div').forEach(d => { dl[d.querySelector('dt').innerText.trim()] = d.querySelector('dd').innerText.trim(); });
    const cells = qa('.glance .g-cell');
    const apply = document.querySelector('.apply-row a');
    const srcs = [...document.querySelectorAll('.src-list a')].map(a => a.getAttribute('href'));
    return {
      id, title: q('h1.d-title'), sub: q('.d-sub'), place: q('.d-place'), cat: q('.d-head .cat-label'),
      cells, docs: qa('.d-docs .check-text'), docNone: q('.d-docs .doc-none'), steps: qa('.steps .step-text'), rules: qa('#rules-h + ul li'), dl,
      apply: apply ? apply.getAttribute('href') : null, srcs, notice: q('.notice'), fund: q('.fund-line'), what: q('#what-h ~ .d-text'),
      valueNote: [...document.querySelectorAll('#what-h ~ .d-muted')].map(e => e.innerText).join(' | '),
      boost: qa('#boost-h + ul li'), watch: q('.watch p:not(.watch-h)'),
      text: document.querySelector('#main').innerText,
      expect: { name: b.name, sub: b.sub, regionLabel: b.regionLabel, cat: LANDIT.categories[b.category].label, value: b.value, valueLabel: b.valueLabel, valueKind: b.valueKind, time: b.guide.time, decision: b.guide.decision, cost: b.guide.cost, docs: b.docs.map(d => d.label), docsKnown: b.docsKnown, steps: b.guide.steps, rules: b.rules, applyUrl: b.applyUrl, sources: b.sources, statRate: b.statRate, effortLabel: b.effortLabel, about: b.about, nrpfNote: b.nrpfNote, publicFunds: b.publicFunds, nrpf: b.nrpf, valueNote: b.valueNote, boost: b.guide.boost, strengthen: b.strengthen, watch: b.guide.watch, fmt: LANDIT.formatMoney(b.value) }
    };
  }, id);
  r.hasDisc = r.text.includes(DISC) || (await page.evaluate(d => document.body.innerText.includes(d), DISC));
  r.issues = scan(r.text);
  results.push(r);
}
fs.writeFileSync('details.json', JSON.stringify(results, null, 1));
console.log('pages', results.length, 'errs', errs.length, errs.slice(0, 3));
await browser.close();
