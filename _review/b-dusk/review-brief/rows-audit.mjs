import { chromium, open } from './lib.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { ctx, page } = await open(browser, 'desktop', 'demo=1', '#/benefits');
while (await page.locator('[data-action="bf-more"]').count()) { await page.click('[data-action="bf-more"]'); await page.waitForTimeout(100); }
const res = await page.evaluate(() => {
  const L = window.LANDIT, D = window.DUSK, m = D.match();
  const out = { n: document.querySelectorAll('.brow').length, problems: [] };
  const order = [...document.querySelectorAll('.brow')].map(r => r.getAttribute('data-bid'));
  const expect = L.sortBenefits(m.open, 'value').map(b => b.id);
  if (JSON.stringify(order) !== JSON.stringify(expect)) out.problems.push('order differs from sortBenefits value');
  document.querySelectorAll('.brow').forEach(r => {
    const b = L.benefitById(r.getAttribute('data-bid'));
    const worth = r.querySelector('.brow-worth').innerText.replace(/\s+/g, ' ').trim();
    const time = r.querySelector('.brow-time').innerText.trim();
    const docs = r.querySelector('.brow-docs').innerText.trim();
    const eff = r.querySelector('.brow-effort').innerText.replace(/\s+/g, ' ').trim();
    const p = [];
    if (b.valueKind === 'amount' && !(worth.includes(L.formatMoney(b.value)) && worth.includes(b.valueLabel))) p.push('worth ' + worth);
    if (b.valueKind === 'label' && !worth.includes(b.valueLabel)) p.push('label ' + worth);
    if (b.valueKind === 'none' && !worth.includes('No set amount')) p.push('none ' + worth);
    if (!time.includes(b.guide.time || 'Not listed')) p.push('time ' + time + ' vs ' + b.guide.time);
    const n = b.docs.filter(d => d.certainty === 'needed').length, mb = b.docs.filter(d => d.certainty === 'maybe').length;
    const exp = !b.docsKnown ? 'Not listed' : !b.docs.length ? 'None' : [n ? n + ' needed' : '', mb ? mb + ' maybe' : ''].filter(Boolean).join(', ');
    if (!docs.includes(exp)) p.push('docs ' + docs + ' vs ' + exp);
    if (!eff.includes(b.effortLabel || 'Not listed')) p.push('effort ' + eff);
    if (p.length) out.problems.push(b.id + ': ' + p.join(' | '));
  });
  // blocked list
  const bl = [...document.querySelectorAll('.blocked .mini-row')].map(a => a.getAttribute('href').replace('#/benefit/', ''));
  out.blocked = { shown: bl.length, expected: m.blocked.length, same: JSON.stringify(bl.slice().sort()) === JSON.stringify(m.blocked.map(x => x.benefit.id).sort()) };
  // non-docsKnown items with docs (hints) shown as Not listed?
  out.hintOnly = m.open.filter(b => !b.docsKnown && b.docs.length).map(b => b.id + ':' + b.docs.length);
  return out;
});
console.log(JSON.stringify(res, null, 1));
// sort checks
for (const s of ['time', 'docs', 'az']) {
  await page.selectOption('#bf-sort', s); await page.waitForTimeout(200);
  const ok = await page.evaluate(s => { const L = window.LANDIT, D = window.DUSK; const exp = L.sortBenefits(D.match().open, s).slice(0, 20).map(b => b.id); const got = [...document.querySelectorAll('.brow')].slice(0, 20).map(r => r.getAttribute('data-bid')); return JSON.stringify(exp) === JSON.stringify(got) ? 'ok' : got.slice(0, 5).join(',') + ' vs ' + exp.slice(0, 5).join(','); }, s);
  console.log('sort', s, ok);
}
await browser.close();
