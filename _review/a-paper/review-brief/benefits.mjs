import fs from 'node:fs';
import { chromium, open, scan, DISC, SHOTS } from './common.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const size of ['desktop', 'phone']) {
  const { ctx, page, errs } = await open(browser, size, '?demo=1#/benefits');
  const head = await page.evaluate(() => ({
    h1: document.querySelector('h1').innerText, nrpf: document.querySelector('.nrpf-line')?.innerText, total: document.querySelector('.total-card')?.innerText,
    chips: [...document.querySelectorAll('.fchip')].map(c => c.innerText.replace(/\n/g, ' ')),
    groups: [...document.querySelectorAll('.cat-group')].map(g => g.querySelector('h2').innerText.replace(/\n/g, ' ') + ' shows ' + g.querySelectorAll('.bcard').length),
    legend: document.querySelector('.legend')?.innerText,
    blockedSum: document.querySelector('#blocked summary')?.innerText,
    blocked: [...document.querySelectorAll('#blocked .blocked-group')].map(g => g.innerText.replace(/\n+/g, ' / ')),
    sortOpts: [...document.querySelectorAll('#sort-by option')].map(o => o.textContent),
  }));
  console.log(size, JSON.stringify(head, null, 1));
  await page.screenshot({ path: SHOTS + 'benefits-top-' + size + '.png' });
  // per-sort: open all groups and capture card order
  for (const sort of ['value', 'time', 'docs', 'az']) {
    await page.selectOption('#sort-by', sort);
    await page.waitForTimeout(200);
    // expand all groups
    for (let k = 0; k < 20; k++) {
      const more = page.locator('[data-act="group-more"][aria-expanded="false"]');
      if (!(await more.count())) break;
      await more.first().click(); await page.waitForTimeout(80);
    }
    const res = await page.evaluate((sort) => {
      const m = LANDIT.match(LANDIT.demo.profile);
      const exp = LANDIT.sortBenefits(m.open, sort).map(b => b.id);
      const cards = [...document.querySelectorAll('.bcard')].map(c => c.querySelector('a.stretch').getAttribute('href').split('/').pop());
      const groups = [...document.querySelectorAll('.cat-group h2')].map(h => h.innerText.split('\n')[0]);
      // card fact checks
      const bad = [];
      document.querySelectorAll('.bcard').forEach(c => {
        const id = c.querySelector('a.stretch').getAttribute('href').split('/').pop();
        const b = LANDIT.benefitById(id);
        const val = c.querySelector('.bcard-val').innerText.replace(/\n+/g, ' / ');
        const facts = c.querySelector('.facts').innerText.replace(/\n+/g, ' / ');
        if (b.valueKind === 'amount' && !(val.includes(LANDIT.formatMoney(b.value)) && val.includes(b.valueLabel))) bad.push(id + ' val ' + val);
        if (b.valueKind === 'label' && !val.includes(b.valueLabel)) bad.push(id + ' lab ' + val);
        if (!facts.includes(b.guide.time || 'Not listed')) bad.push(id + ' time ' + facts);
        if (b.docsKnown && !facts.includes(b.docs.length + ' document') && !(b.docs.length === 0 && facts.includes('No documents'))) bad.push(id + ' docs ' + facts);
        if (b.effortLabel && !facts.includes(b.effortLabel)) bad.push(id + ' effort');
      });
      // within-group order vs expected
      const orderOk = groups.every(g => {
        const inG = [...document.querySelectorAll('.cat-group')].find(s => s.querySelector('h2').innerText.split('\n')[0] === g);
        const ids = [...inG.querySelectorAll('.bcard a.stretch')].map(a => a.getAttribute('href').split('/').pop());
        const e = exp.filter(id => ids.includes(id));
        return JSON.stringify(e) === JSON.stringify(ids);
      });
      return { n: cards.length, uniq: new Set(cards).size, expN: exp.length, groups, orderOk, bad, first10: cards.slice(0, 10), exp10: exp.slice(0, 10) };
    }, sort);
    console.log(size, 'sort', sort, JSON.stringify(res));
  }
  await ctx.close();
}
await browser.close();
