import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('details.json'));
const prob = [];
const issueTally = {};
for (const r of R) {
  const e = r.expect, p = (m) => prob.push(r.id + ': ' + m);
  if (r.title !== e.name) p('title ' + r.title + ' != ' + e.name);
  if (r.sub !== e.sub) p('sub mismatch: ' + r.sub + ' | ' + e.sub);
  if (r.place !== e.regionLabel) p('place ' + r.place + ' != ' + e.regionLabel);
  if (r.cat !== e.cat) p('cat ' + r.cat + ' != ' + e.cat);
  if (!r.hasDisc) p('NO DISCLAIMER');
  // glance worth
  const w = r.cells[0] || '';
  if (e.valueKind === 'amount' && !w.includes(e.fmt)) p('amount missing ' + e.fmt + ' in ' + w);
  if (e.valueKind === 'amount' && e.valueLabel && !w.toLowerCase().includes(e.valueLabel.replace(/^could be worth,?\s*/i, '').toLowerCase())) p('qualifier missing ' + e.valueLabel + ' in ' + w.replace(/\n/g, ' / '));
  if (e.valueKind === 'label' && !w.includes(e.valueLabel)) p('label missing ' + e.valueLabel);
  // time / decision
  const t = r.cells[1] || '';
  if (!t.includes(e.time || 'Not listed')) p('time ' + t + ' vs ' + e.time);
  if (r.dl['Decision'] !== (e.decision || 'Not listed')) p('decision dl ' + r.dl['Decision'] + ' vs ' + e.decision);
  if (r.dl['Cost'] !== (e.cost || 'Not listed')) p('cost ' + r.dl['Cost'] + ' vs ' + e.cost);
  // docs
  const dc = r.cells[2] || '';
  if (e.docsKnown && !dc.includes(String(e.docs.length))) p('doc count ' + dc + ' vs ' + e.docs.length);
  if (e.docsKnown && JSON.stringify(r.docs) !== JSON.stringify(e.docs.filter((x, i) => true))) {
    // order may be needed then maybe
    const a = [...r.docs].sort().join('|'), b = [...e.docs].sort().join('|');
    if (a !== b) p('docs differ ' + JSON.stringify(r.docs) + ' vs ' + JSON.stringify(e.docs));
  }
  if (!e.docsKnown && r.docs.length) p('docs shown though unknown');
  if (JSON.stringify(r.steps.map(s => s.replace(/^Step \d+: /, ''))) !== JSON.stringify(e.steps)) p('steps differ');
  if (JSON.stringify(r.rules) !== JSON.stringify(e.rules)) p('rules differ ' + JSON.stringify(r.rules).slice(0, 200) + ' vs ' + JSON.stringify(e.rules).slice(0, 200));
  if (r.apply !== e.applyUrl) p('apply ' + r.apply + ' vs ' + e.applyUrl);
  if (JSON.stringify(r.srcs) !== JSON.stringify(e.sources)) p('sources differ');
  if (r.what !== e.about) p('about differs');
  if (e.nrpfNote && r.text.includes(e.nrpfNote)) p('NRPFNOTE LEAK');
  const rate = r.dl['Published approval rate'] ?? Object.entries(r.dl).find(([k]) => /rate/i.test(k));
  if (e.effortLabel && !r.text.includes(e.effortLabel)) p('effort missing');
  for (const i of r.issues) { const k = i.split(':')[0]; issueTally[k] = (issueTally[k] || 0) + 1; }
}
console.log(prob.length + ' problems'); console.log(prob.slice(0, 80).join('\n'));
console.log(issueTally);
const dl0 = R[0].dl; console.log('dl keys', Object.keys(dl0));
console.log('statRate non-null:', R.filter(r => r.expect.statRate != null).map(r => r.id + ' ' + r.expect.statRate + ' -> ' + JSON.stringify(r.dl)));
