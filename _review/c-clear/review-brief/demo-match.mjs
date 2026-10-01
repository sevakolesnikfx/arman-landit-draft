import { loadLandit } from './load.mjs';
const L = loadLandit();
const m = L.match(L.demo.profile);
console.log('open', m.open.length, 'blocked', m.blocked.length, 'total', m.total, 'withValue', m.withValue, 'nrpf', m.nrpf);
console.log('--- open with amount');
m.open.filter(b => typeof b.value === 'number').forEach(b => console.log(b.id, b.value, '|', b.valueLabel, '|', b.category));
console.log('--- blocked');
m.blocked.forEach(x => console.log(x.kind, x.benefit.id, '|', x.benefit.name, '|', x.benefit.category, 'pf=', x.benefit.publicFunds, 'nrpf=', x.benefit.nrpf));
const byCat = {};
m.open.forEach(b => { (byCat[b.category] = byCat[b.category] || []).push(b); });
console.log('--- categories');
for (const k of Object.keys(L.categories)) {
  if (!byCat[k]) continue;
  const top = L.sortBenefits(byCat[k], 'value')[0];
  console.log(k, byCat[k].length, top.id, top.value, top.valueLabel);
}
console.log('--- open label kinds');
m.open.filter(b => b.valueKind === 'label').forEach(b => console.log(b.id, '|', b.valueLabel));
console.log('--- starters', JSON.stringify(L.chatStarters(L.demo.profile)));
console.log('--- open nrpf depends', m.open.filter(b => b.nrpf === 'depends').map(b => b.id).join(', '));
console.log('--- open with statRate', m.open.filter(b => b.statRate != null).map(b => b.id + '=' + b.statRate + ' :: ' + b.stat).join('\n'));
